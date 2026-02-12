"""
Bundled LoRA auto-downloader — ensures Flux turbo preset LoRAs are available.

When a generation request uses a LoRA that's in our bundled list but not yet
downloaded, we fetch it from HuggingFace before submitting to ComfyUI.
This makes the Flux Lightning / Flux Speed presets work out of the box
without requiring users to manually download anything.

Download progress is streamed to the frontend via WebSocket so users see
a real-time progress bar instead of a mysterious hang.
"""

import asyncio
import logging
import os
import threading
import urllib.request
import urllib.error

import aiohttp

from .config import COMFYUI_PATH, COMFYUI_URL

logger = logging.getLogger(__name__)

# Same list as install.py — single source of truth for bundled LoRA URLs
BUNDLED_LORAS = {
    "flux1-turbo-alpha.safetensors": {
        "url": "https://huggingface.co/alimama-creative/FLUX.1-Turbo-Alpha/resolve/main/diffusion_pytorch_model.safetensors",
        "size_label": "~694 MB",
        "description": "Flux Turbo Alpha (4-step generation)",
    },
    "Hyper-FLUX.1-dev-8steps-lora.safetensors": {
        "url": "https://huggingface.co/ByteDance/Hyper-SD/resolve/main/Hyper-FLUX.1-dev-8steps-lora.safetensors",
        "size_label": "~1.4 GB",
        "description": "Hyper-Flux 8-step (fast quality generation)",
    },
}

# Bug #7: Thread-safe lock management for concurrent downloads
# _dict_lock protects access to the _download_locks dict itself
_dict_lock = threading.Lock()
_download_locks: dict[str, asyncio.Lock] = {}


def _get_lock(filename: str) -> asyncio.Lock:
    """Get or create an asyncio.Lock for a specific LoRA filename (thread-safe)."""
    with _dict_lock:
        if filename not in _download_locks:
            _download_locks[filename] = asyncio.Lock()
        return _download_locks[filename]


def _get_loras_dir() -> str:
    """Get the ComfyUI loras directory path."""
    return os.path.join(COMFYUI_PATH, "models", "loras")


def _is_lora_available(filename: str) -> bool:
    """Check if a LoRA file exists on disk."""
    return os.path.isfile(os.path.join(_get_loras_dir(), filename))


def _download_file_sync(url: str, dest_path: str, description: str = "", progress_callback=None) -> bool:
    """Download a file (blocking). Called from thread pool.

    progress_callback(percent: float) is called every ~5 MB with download progress.
    """
    tmp_path = dest_path + ".tmp"
    try:
        logger.info("Downloading bundled LoRA: %s (%s)", description, url)
        req = urllib.request.Request(url, headers={"User-Agent": "Matrice-Backend/1.0"})

        with urllib.request.urlopen(req) as response:
            total = int(response.headers.get("Content-Length", 0))
            downloaded = 0
            chunk_size = 1024 * 1024  # 1 MB
            last_reported = 0

            with open(tmp_path, "wb") as f:
                while True:
                    chunk = response.read(chunk_size)
                    if not chunk:
                        break
                    f.write(chunk)
                    downloaded += len(chunk)
                    if total > 0:
                        pct = downloaded / total * 100
                        # Report progress every ~5 MB
                        if downloaded - last_reported >= 5 * 1024 * 1024 or pct >= 99:
                            last_reported = downloaded
                            logger.info("  [%s] %.1f%% downloaded", description, pct)
                            if progress_callback:
                                try:
                                    progress_callback(round(pct, 1))
                                except Exception as e:
                                    logger.debug("Progress callback error: %s", e)

        os.replace(tmp_path, dest_path)
        logger.info("Downloaded: %s", os.path.basename(dest_path))
        return True

    except (urllib.error.URLError, OSError) as e:
        logger.error("Failed to download %s: %s", description, e)
        return False

    finally:
        # Bug #8: Always attempt .tmp cleanup in finally block (safe even if file doesn't exist)
        try:
            if os.path.isfile(tmp_path):
                os.remove(tmp_path)
        except OSError as e:
            logger.warning("Could not clean up temp file %s: %s", tmp_path, e)


async def _refresh_comfyui_lora_list():
    """Poke ComfyUI to re-scan its loras folder.

    ComfyUI re-reads the folder when object_info is requested for LoraLoader.
    """
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(
                f"{COMFYUI_URL}/object_info/LoraLoader",
                timeout=aiohttp.ClientTimeout(total=10),
            ) as resp:
                if resp.status == 200:
                    logger.info("Refreshed ComfyUI LoRA list via object_info")
                    return True
    except Exception as e:
        logger.warning("Could not refresh ComfyUI LoRA list: %s", e)
    return False


async def _broadcast_download_event(ws_manager, event: dict):
    """Broadcast a download event to all frontend clients."""
    if ws_manager:
        try:
            await ws_manager.broadcast(event)
        except Exception as e:
            logger.debug("Failed to broadcast download event: %s", e)


async def ensure_bundled_lora(filename: str, ws_manager=None, job_id: str = "") -> bool:
    """Ensure a bundled LoRA is downloaded. Returns True if available.

    If the LoRA isn't a known bundled LoRA, returns True (assume user-managed).
    If it's bundled but not downloaded, downloads it from HuggingFace.
    Thread-safe — concurrent requests for the same LoRA will wait for the first download.

    ws_manager: WebSocketManager instance for broadcasting download progress
    job_id: Frontend job ID for associating progress events with the right queue item
    """
    # Not a bundled LoRA — nothing to do
    if filename not in BUNDLED_LORAS:
        return True

    # Already downloaded
    if _is_lora_available(filename):
        return True

    # Bug #7: Thread-safe lock acquisition
    lock = _get_lock(filename)

    async with lock:
        # Double-check after acquiring lock (another request may have finished download)
        if _is_lora_available(filename):
            return True

        lora_info = BUNDLED_LORAS[filename]
        loras_dir = _get_loras_dir()
        os.makedirs(loras_dir, exist_ok=True)
        dest = os.path.join(loras_dir, filename)

        logger.info("Auto-downloading bundled LoRA: %s (%s)", filename, lora_info["size_label"])

        # Broadcast download started
        await _broadcast_download_event(ws_manager, {
            "type": "lora_download",
            "status": "started",
            "filename": filename,
            "sizeLabel": lora_info["size_label"],
            "description": lora_info["description"],
            "jobId": job_id,
        })

        # Set up progress callback that broadcasts via WS from the thread pool
        loop = asyncio.get_event_loop()

        def on_progress(percent):
            asyncio.run_coroutine_threadsafe(
                _broadcast_download_event(ws_manager, {
                    "type": "lora_download",
                    "status": "progress",
                    "filename": filename,
                    "percent": percent,
                    "jobId": job_id,
                }),
                loop,
            )

        # Run the blocking download in a thread pool
        success = await loop.run_in_executor(
            None,
            _download_file_sync,
            lora_info["url"],
            dest,
            lora_info["description"],
            on_progress,
        )

        # Broadcast result
        if success:
            await _broadcast_download_event(ws_manager, {
                "type": "lora_download",
                "status": "complete",
                "filename": filename,
                "jobId": job_id,
            })
            await _refresh_comfyui_lora_list()
        else:
            await _broadcast_download_event(ws_manager, {
                "type": "lora_download",
                "status": "failed",
                "filename": filename,
                "error": f"Failed to download {lora_info['description']}",
                "jobId": job_id,
            })

        return success


async def ensure_all_bundled_loras(lora_names: list[str], ws_manager=None, job_id: str = "") -> list[str]:
    """Ensure all bundled LoRAs in the list are available.

    Returns a list of LoRA names that failed to download (empty = all good).
    """
    failed = []
    for name in lora_names:
        if name in BUNDLED_LORAS:
            ok = await ensure_bundled_lora(name, ws_manager, job_id)
            if not ok:
                failed.append(name)
    return failed
