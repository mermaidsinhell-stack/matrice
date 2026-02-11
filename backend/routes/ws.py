"""
WebSocket endpoint for real-time generation progress.
"""

import logging
from urllib.parse import urlparse

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from ..config import CORS_ORIGINS

router = APIRouter()
logger = logging.getLogger(__name__)

# Pre-parse allowed origins for fast comparison
_ALLOWED_ORIGINS = set()
for origin in CORS_ORIGINS:
    parsed = urlparse(origin.strip())
    if parsed.hostname:
        _ALLOWED_ORIGINS.add(parsed.hostname)
# Always allow localhost connections
_ALLOWED_ORIGINS.update({"localhost", "127.0.0.1"})


def _check_ws_origin(websocket: WebSocket) -> bool:
    """Validate WebSocket origin header against allowed origins."""
    origin = websocket.headers.get("origin", "")
    if not origin:
        # No origin = direct WS connection (e.g. Postman, scripts) — allow for local dev
        return True
    try:
        parsed = urlparse(origin)
        return parsed.hostname in _ALLOWED_ORIGINS
    except Exception:
        return False


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    """WebSocket proxy — forwards ComfyUI events to frontend clients."""
    # Validate origin
    if not _check_ws_origin(websocket):
        logger.warning("Rejected WebSocket connection from origin: %s", websocket.headers.get("origin"))
        await websocket.close(code=4003)
        return

    ws_manager = websocket.app.state.ws_manager
    await ws_manager.connect_client(websocket)
    try:
        # Keep connection alive — listen for client messages (ping/pong, etc.)
        while True:
            data = await websocket.receive_text()
            # Frontend can send control messages if needed
            # For now, we just keep the connection alive
    except WebSocketDisconnect:
        await ws_manager.disconnect_client(websocket)
