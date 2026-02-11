"""
Matrice Backend Configuration

Reads settings from environment variables with sensible defaults.
Auto-detects the bundled ComfyUI installation when available.
"""

import os

# ── Locate ComfyUI ───────────────────────────────────────────────────
# Priority: env var COMFYUI_PATH → bundled ./comfyui/ → ~/ComfyUI fallback

_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def _find_comfyui_path():
    """Find the ComfyUI directory (bundled first, then common locations)."""
    # 1. Explicit env var
    env_path = os.environ.get("COMFYUI_PATH")
    if env_path and os.path.isdir(env_path):
        return env_path

    # 2. Bundled (installed by install.py)
    bundled = os.path.join(_ROOT, "comfyui")
    if os.path.isdir(bundled):
        return bundled

    # 3. Common locations
    home = os.path.expanduser("~")
    for path in [
        os.path.join(home, "ComfyUI"),
        os.path.join(home, "Desktop", "ComfyUI"),
        os.path.join(home, "Documents", "ComfyUI"),
        "C:\\ComfyUI",
        "/opt/ComfyUI",
    ]:
        if os.path.isdir(path):
            return path

    # Fallback — use bundled path even if it doesn't exist yet
    return bundled


COMFYUI_PATH = _find_comfyui_path()

# ── ComfyUI connection ───────────────────────────────────────────────
COMFYUI_HOST = os.environ.get("COMFYUI_HOST", "127.0.0.1")
COMFYUI_PORT = int(os.environ.get("COMFYUI_PORT", "8188"))
COMFYUI_URL = os.environ.get("COMFYUI_URL", f"http://{COMFYUI_HOST}:{COMFYUI_PORT}")
COMFYUI_WS = os.environ.get("COMFYUI_WS", f"ws://{COMFYUI_HOST}:{COMFYUI_PORT}/ws")

# ── Backend server ───────────────────────────────────────────────────
BACKEND_HOST = os.environ.get("BACKEND_HOST", "127.0.0.1")
BACKEND_PORT = int(os.environ.get("BACKEND_PORT", "3001"))

# ── Gallery — ComfyUI's output directory ─────────────────────────────
GALLERY_DIR = os.environ.get(
    "GALLERY_DIR",
    os.path.join(COMFYUI_PATH, "output")
)

# ── Upload — ComfyUI's input directory ───────────────────────────────
UPLOAD_DIR = os.environ.get(
    "UPLOAD_DIR",
    os.path.join(COMFYUI_PATH, "input")
)

# ── CORS origins allowed (frontend dev server) ───────────────────────
CORS_ORIGINS = os.environ.get("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(",")
