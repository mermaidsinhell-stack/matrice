"""
WebSocket proxy between frontend clients and ComfyUI.

Maintains a single persistent WebSocket connection to ComfyUI and fans out
events to all connected frontend clients. Translates ComfyUI's event format
(including binary preview images) into a simplified JSON protocol for the frontend.
"""

import asyncio
import base64
import json
import logging
import uuid
import struct
from typing import Optional

import aiohttp
from fastapi import WebSocket, WebSocketDisconnect

from .config import COMFYUI_WS

logger = logging.getLogger(__name__)


# ComfyUI binary event types (from protocol.py)
PREVIEW_IMAGE = 1
UNENCODED_PREVIEW_IMAGE = 2
TEXT = 3
PREVIEW_IMAGE_WITH_METADATA = 4


class WebSocketManager:
    """Manages WebSocket connections between frontend clients and ComfyUI."""

    def __init__(self):
        self.client_id = f"matrice-{uuid.uuid4().hex[:8]}"
        self.frontend_clients: list[WebSocket] = []
        self._comfyui_ws: Optional[aiohttp.ClientWebSocketResponse] = None
        self._session: Optional[aiohttp.ClientSession] = None
        self._listen_task: Optional[asyncio.Task] = None
        self._prompt_map: dict[str, str] = {}  # prompt_id -> job_id
        self._connected = False

    @property
    def is_connected(self) -> bool:
        return self._connected

    # ── Frontend client management ────────────────────────────────────

    async def connect_client(self, websocket: WebSocket):
        await websocket.accept()
        self.frontend_clients.append(websocket)
        # Send current connection status
        await websocket.send_json({
            "type": "connection_status",
            "connected": self._connected,
        })

    def disconnect_client(self, websocket: WebSocket):
        if websocket in self.frontend_clients:
            self.frontend_clients.remove(websocket)

    async def broadcast(self, message: dict):
        """Send a JSON message to all connected frontend clients."""
        disconnected = []
        for client in self.frontend_clients:
            try:
                await client.send_json(message)
            except Exception as e:
                logger.debug("Failed to send to frontend client: %s", e)
                disconnected.append(client)
        for client in disconnected:
            self.disconnect_client(client)

    # ── Prompt tracking ───────────────────────────────────────────────

    def register_prompt(self, prompt_id: str, job_id: str):
        """Map a ComfyUI prompt_id to a frontend job_id."""
        self._prompt_map[prompt_id] = job_id

    def get_job_id(self, prompt_id: str) -> Optional[str]:
        return self._prompt_map.get(prompt_id)

    def _cleanup_prompt(self, prompt_id: str):
        """Remove a completed prompt from the mapping to prevent memory leak."""
        self._prompt_map.pop(prompt_id, None)

    # ── ComfyUI WebSocket connection ──────────────────────────────────

    async def start(self):
        """Start the persistent WebSocket connection to ComfyUI."""
        if self._listen_task and not self._listen_task.done():
            return
        self._listen_task = asyncio.create_task(self._connection_loop())

    async def stop(self):
        """Stop the ComfyUI WebSocket connection."""
        if self._listen_task:
            self._listen_task.cancel()
            try:
                await self._listen_task
            except asyncio.CancelledError:
                pass
        if self._comfyui_ws and not self._comfyui_ws.closed:
            await self._comfyui_ws.close()
        if self._session and not self._session.closed:
            await self._session.close()
        self._connected = False

    async def _connection_loop(self):
        """Maintain a persistent connection to ComfyUI with auto-reconnect."""
        while True:
            try:
                await self._connect_and_listen()
            except asyncio.CancelledError:
                break
            except Exception:
                self._connected = False
                await self.broadcast({"type": "connection_status", "connected": False})
                # Wait before reconnecting
                await asyncio.sleep(3)

    async def _connect_and_listen(self):
        """Connect to ComfyUI WebSocket and process messages."""
        # Close any stale session from a previous connection attempt
        if self._session and not self._session.closed:
            await self._session.close()

        self._session = aiohttp.ClientSession()
        ws_url = f"{COMFYUI_WS}?clientId={self.client_id}"

        try:
            async with self._session.ws_connect(ws_url, heartbeat=30) as ws:
                self._comfyui_ws = ws
                self._connected = True
                await self.broadcast({"type": "connection_status", "connected": True})

                async for msg in ws:
                    if msg.type == aiohttp.WSMsgType.TEXT:
                        await self._handle_text_message(msg.data)
                    elif msg.type == aiohttp.WSMsgType.BINARY:
                        await self._handle_binary_message(msg.data)
                    elif msg.type in (aiohttp.WSMsgType.CLOSED, aiohttp.WSMsgType.ERROR):
                        break
        finally:
            self._connected = False
            await self.broadcast({"type": "connection_status", "connected": False})
            if self._session and not self._session.closed:
                await self._session.close()

    async def _handle_text_message(self, data: str):
        """Parse ComfyUI JSON events and forward to frontend."""
        try:
            msg = json.loads(data)
        except json.JSONDecodeError:
            return

        event_type = msg.get("type")
        event_data = msg.get("data", {})
        prompt_id = event_data.get("prompt_id", "")
        job_id = self.get_job_id(prompt_id) or prompt_id

        if event_type == "progress":
            await self.broadcast({
                "type": "progress",
                "jobId": job_id,
                "promptId": prompt_id,
                "step": event_data.get("value", 0),
                "totalSteps": event_data.get("max", 1),
            })

        elif event_type == "executing":
            node = event_data.get("node")
            if node is None:
                # Execution complete for this prompt — clean up mapping
                self._cleanup_prompt(prompt_id)
                await self.broadcast({
                    "type": "executing_done",
                    "jobId": job_id,
                    "promptId": prompt_id,
                })
            else:
                await self.broadcast({
                    "type": "executing",
                    "jobId": job_id,
                    "promptId": prompt_id,
                    "node": node,
                })

        elif event_type == "executed":
            output = event_data.get("output", {})
            images = output.get("images", [])
            if images:
                image_info = images[0]
                await self.broadcast({
                    "type": "complete",
                    "jobId": job_id,
                    "promptId": prompt_id,
                    "filename": image_info.get("filename", ""),
                    "subfolder": image_info.get("subfolder", ""),
                    "imageUrl": f"/api/gallery/{image_info.get('filename', '')}",
                })

        elif event_type == "execution_error":
            self._cleanup_prompt(prompt_id)
            await self.broadcast({
                "type": "error",
                "jobId": job_id,
                "promptId": prompt_id,
                "message": event_data.get("exception_message", "Unknown error"),
                "nodeType": event_data.get("node_type", ""),
                "nodeId": event_data.get("node_id", ""),
            })

        elif event_type == "execution_cached":
            await self.broadcast({
                "type": "cached",
                "jobId": job_id,
                "promptId": prompt_id,
                "nodes": event_data.get("nodes", []),
            })

        elif event_type == "status":
            queue_remaining = event_data.get("status", {}).get("exec_info", {}).get("queue_remaining", 0)
            await self.broadcast({
                "type": "queue_status",
                "queueRemaining": queue_remaining,
            })

    async def _handle_binary_message(self, data: bytes):
        """Parse ComfyUI binary preview images and forward as base64."""
        if len(data) < 4:
            return

        # First 4 bytes: event type as uint32
        event_type = struct.unpack(">I", data[:4])[0]

        if event_type in (PREVIEW_IMAGE, PREVIEW_IMAGE_WITH_METADATA):
            # Bytes 4+ are JPEG/PNG image data
            image_data = data[4:]
            if not image_data:
                return

            # Detect format
            content_type = "image/jpeg"
            if image_data[:8] == b'\x89PNG\r\n\x1a\n':
                content_type = "image/png"

            image_b64 = base64.b64encode(image_data).decode("ascii")

            await self.broadcast({
                "type": "preview",
                "imageBase64": f"data:{content_type};base64,{image_b64}",
            })

        elif event_type == UNENCODED_PREVIEW_IMAGE:
            # Raw pixel data — skip for now (rare)
            pass
