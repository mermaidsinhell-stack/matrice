"""
Matrice Backend — FastAPI application entry point.

Serves as middleware between the React frontend and ComfyUI.
Provides REST endpoints for model discovery, generation, editing,
and a WebSocket proxy for real-time generation preview.
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import CORS_ORIGINS
from .comfyui_client import ComfyUIClient
from .websocket_manager import WebSocketManager
from .routes import models, generate, edit, gallery, ws


# Shared instances
comfyui = ComfyUIClient()
ws_manager = WebSocketManager()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown lifecycle."""
    # Startup: begin ComfyUI WebSocket listener
    await ws_manager.start()
    yield
    # Shutdown: clean up connections
    await ws_manager.stop()
    await comfyui.close()


app = FastAPI(
    title="Matrice",
    description="Headless ComfyUI Frontend API",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS for frontend dev server — restrict to needed methods/headers
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
    allow_headers=["Content-Type", "Accept"],
)

# Make shared instances available to routes
app.state.comfyui = comfyui
app.state.ws_manager = ws_manager

# Register route modules
app.include_router(models.router, prefix="/api")
app.include_router(generate.router, prefix="/api")
app.include_router(edit.router, prefix="/api")
app.include_router(gallery.router, prefix="/api")
app.include_router(ws.router, prefix="/api")


@app.get("/api/status")
async def get_status():
    """Check ComfyUI connection status."""
    connected = await comfyui.is_connected()
    return {
        "comfyui": connected,
        "wsConnected": ws_manager.is_connected,
    }
