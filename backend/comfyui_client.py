"""
Async HTTP client for communicating with ComfyUI's REST API.
"""

import asyncio
import aiohttp
import logging
from typing import Optional
from .config import COMFYUI_URL

logger = logging.getLogger(__name__)

# Default timeout for HTTP requests to ComfyUI (seconds)
REQUEST_TIMEOUT = aiohttp.ClientTimeout(total=30, connect=10)
# Longer timeout for operations that may take a while (upload, submit)
SUBMIT_TIMEOUT = aiohttp.ClientTimeout(total=120, connect=10)


class ComfyUIClient:
    """Wraps ComfyUI's HTTP API for model discovery, prompt submission, and image retrieval."""

    def __init__(self, base_url: str = COMFYUI_URL):
        self.base_url = base_url.rstrip("/")
        self._session: Optional[aiohttp.ClientSession] = None
        self._session_lock = asyncio.Lock()

    async def _get_session(self) -> aiohttp.ClientSession:
        async with self._session_lock:
            if self._session is None or self._session.closed:
                self._session = aiohttp.ClientSession(timeout=REQUEST_TIMEOUT)
            return self._session

    async def close(self):
        async with self._session_lock:
            if self._session and not self._session.closed:
                await self._session.close()
                self._session = None

    # ── Model Discovery ──────────────────────────────────────────────

    async def get_models(self, folder: str) -> list[str]:
        """Get list of model filenames from a ComfyUI model folder.

        Folders: checkpoints, diffusion_models, loras, vae, controlnet,
                 upscale_models, clip, ipadapter, clip_vision, embeddings
        """
        session = await self._get_session()
        try:
            async with session.get(f"{self.base_url}/models/{folder}") as resp:
                if resp.status == 200:
                    return await resp.json()
                return []
        except aiohttp.ClientError:
            return []

    async def get_models_from_node(self, node_class: str, input_name: str) -> list[str]:
        """Get model list from a specific node's object_info input options.

        Useful for GGUF loaders where /models/{folder} returns empty but
        the node's input dropdown has the actual model list.
        """
        info = await self.get_object_info(node_class)
        if node_class in info:
            inputs = info[node_class].get("input", {}).get("required", {})
            if input_name in inputs:
                options = inputs[input_name][0]
                if isinstance(options, list):
                    return options
        return []

    async def get_all_unet_models(self) -> list[str]:
        """Get UNET/diffusion models from all known loader nodes.

        Checks standard folders first, then falls back to GGUF node types.
        Returns a deduplicated, sorted list.
        """
        models = set()

        # Standard folders
        for folder in ("checkpoints", "diffusion_models"):
            models.update(await self.get_models(folder))

        # GGUF loader nodes (custom nodes that store models in 'unet' folder)
        for node_class in ("UnetLoaderGGUF", "UnetLoaderGGUFAdvanced", "UNETLoader"):
            node_models = await self.get_models_from_node(node_class, "unet_name")
            models.update(node_models)

        return sorted(models)

    async def get_embeddings(self) -> list[str]:
        session = await self._get_session()
        try:
            async with session.get(f"{self.base_url}/embeddings") as resp:
                if resp.status == 200:
                    return await resp.json()
                return []
        except aiohttp.ClientError:
            return []

    async def get_object_info(self, node_class: str) -> dict:
        """Get node class info (used for sampler/scheduler lists)."""
        session = await self._get_session()
        try:
            async with session.get(f"{self.base_url}/object_info/{node_class}") as resp:
                if resp.status == 200:
                    return await resp.json()
                return {}
        except aiohttp.ClientError:
            return {}

    async def get_samplers_and_schedulers(self) -> dict:
        """Extract sampler and scheduler lists from KSampler node info."""
        info = await self.get_object_info("KSampler")
        result = {"samplers": [], "schedulers": []}
        if "KSampler" in info:
            inputs = info["KSampler"].get("input", {}).get("required", {})
            if "sampler_name" in inputs:
                result["samplers"] = inputs["sampler_name"][0]
            if "scheduler" in inputs:
                result["schedulers"] = inputs["scheduler"][0]
        return result

    async def get_controlnet_preprocessors(self) -> list[str]:
        """Get available ControlNet preprocessors from installed nodes."""
        preprocessors = []
        # Try common preprocessor node classes
        for node_class in [
            "AIO_Preprocessor", "CannyEdgePreprocessor", "DepthAnythingPreprocessor",
            "LineArtPreprocessor", "OpenposePreprocessor", "TilePreprocessor",
            "NormalBaePreprocessor", "MLSDPreprocessor", "SemSegPreprocessor",
            "DWPreprocessor", "MediaPipeFaceMeshPreprocessor"
        ]:
            info = await self.get_object_info(node_class)
            if info:
                preprocessors.append(node_class)
        return preprocessors

    # ── Prompt Submission ─────────────────────────────────────────────

    async def submit_prompt(self, workflow: dict, client_id: str) -> dict:
        """Submit a workflow to ComfyUI for execution.

        Returns: {"prompt_id": "...", "number": N, "node_errors": {}}
        """
        session = await self._get_session()
        payload = {
            "prompt": workflow,
            "client_id": client_id,
        }
        async with session.post(
            f"{self.base_url}/prompt",
            json=payload,
            timeout=SUBMIT_TIMEOUT,
        ) as resp:
            if resp.status != 200:
                body = await resp.text()
                logger.error("ComfyUI prompt submission failed (%d): %s", resp.status, body[:500])
                return {"prompt_id": "", "node_errors": {"submit": body[:500]}}
            return await resp.json()

    # ── Image Upload ──────────────────────────────────────────────────

    async def upload_image(self, image_bytes: bytes, filename: str, subfolder: str = "", image_type: str = "input") -> dict:
        """Upload an image to ComfyUI's input directory."""
        session = await self._get_session()
        data = aiohttp.FormData()
        data.add_field("image", image_bytes, filename=filename, content_type="image/png")
        if subfolder:
            data.add_field("subfolder", subfolder)
        data.add_field("type", image_type)

        async with session.post(f"{self.base_url}/upload/image", data=data, timeout=SUBMIT_TIMEOUT) as resp:
            if resp.status != 200:
                body = await resp.text()
                logger.error("ComfyUI image upload failed (%d): %s", resp.status, body[:500])
                return {"error": body[:500]}
            return await resp.json()

    # ── Image Retrieval ───────────────────────────────────────────────

    async def get_image(self, filename: str, subfolder: str = "", image_type: str = "output") -> bytes:
        """Download a generated image from ComfyUI."""
        session = await self._get_session()
        params = {"filename": filename, "subfolder": subfolder, "type": image_type}
        async with session.get(f"{self.base_url}/view", params=params) as resp:
            return await resp.read()

    # ── History ───────────────────────────────────────────────────────

    async def get_history(self, prompt_id: str) -> dict:
        session = await self._get_session()
        async with session.get(f"{self.base_url}/history/{prompt_id}") as resp:
            if resp.status == 200:
                return await resp.json()
            return {}

    # ── System Status ─────────────────────────────────────────────────

    async def get_system_stats(self) -> dict:
        session = await self._get_session()
        try:
            async with session.get(f"{self.base_url}/system_stats") as resp:
                if resp.status == 200:
                    return await resp.json()
                return {}
        except aiohttp.ClientError:
            return {}

    async def is_connected(self) -> bool:
        """Check if ComfyUI is reachable."""
        try:
            stats = await self.get_system_stats()
            return bool(stats)
        except Exception:
            return False
