"""
Gallery endpoints — list, serve, and delete generated images.
"""

import json
import logging
import os
import re
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import FileResponse

from ..config import GALLERY_DIR

router = APIRouter(tags=["gallery"])
logger = logging.getLogger(__name__)

# Security constants
ALLOWED_IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}
MAX_UPLOAD_SIZE = 50 * 1024 * 1024  # 50 MB
IMAGE_MAGIC_BYTES = {
    b"\x89PNG\r\n\x1a\n": ".png",
    b"\xff\xd8\xff": ".jpg",
    b"RIFF": ".webp",  # WebP starts with RIFF....WEBP
}


def _sanitize_filename(filename: str) -> str:
    """Sanitize a filename: strip path components, allow only safe characters."""
    # Strip any path components
    filename = os.path.basename(filename)
    # Remove any non-alphanumeric chars except .-_ and spaces
    filename = re.sub(r'[^\w\s\-.]', '', filename).strip()
    if not filename:
        filename = "upload.png"
    return filename


def _validate_image_bytes(data: bytes) -> bool:
    """Validate that file data starts with a known image magic signature."""
    for magic, _ in IMAGE_MAGIC_BYTES.items():
        if data[:len(magic)] == magic:
            return True
    return False


def _safe_resolve(gallery_dir: Path, filename: str) -> Path:
    """Resolve a filename within gallery_dir, preventing path traversal."""
    # Use only the basename, stripping any path components
    safe_name = os.path.basename(filename)
    resolved = (gallery_dir / safe_name).resolve()
    # Ensure the resolved path is still within the gallery directory
    if not str(resolved).startswith(str(gallery_dir.resolve())):
        raise HTTPException(status_code=400, detail="Invalid filename")
    return resolved


def _get_gallery_dir() -> Path:
    return Path(GALLERY_DIR)


def _extract_png_metadata(filepath: Path) -> dict:
    """Extract ComfyUI workflow metadata from PNG text chunks."""
    meta = {}
    if filepath.suffix.lower() != ".png":
        return meta
    try:
        from PIL import Image as PILImage
        with PILImage.open(filepath) as img:
            info = img.info or {}
            # ComfyUI stores the prompt workflow in 'prompt' text chunk
            prompt_json = info.get("prompt")
            if prompt_json:
                try:
                    workflow = json.loads(prompt_json)
                    meta["workflow"] = workflow
                    # Walk workflow nodes to extract key info
                    for node_id, node in workflow.items():
                        inputs = node.get("inputs", {})
                        class_type = node.get("class_type", "")
                        if class_type == "KSampler":
                            meta["seed"] = inputs.get("seed")
                            meta["steps"] = inputs.get("steps")
                            meta["cfg"] = inputs.get("cfg")
                            meta["sampler"] = inputs.get("sampler_name")
                            meta["scheduler"] = inputs.get("scheduler")
                            meta["denoise"] = inputs.get("denoise")
                        elif class_type in ("CheckpointLoaderSimple", "UnetLoaderGGUF"):
                            meta["model"] = inputs.get("ckpt_name") or inputs.get("unet_name", "")
                        elif class_type == "CLIPTextEncode" and "positive" not in meta:
                            text = inputs.get("text", "")
                            if text and not text.startswith("("):
                                meta["positive"] = text[:200]
                        elif class_type == "EmptyLatentImage":
                            meta["width"] = inputs.get("width")
                            meta["height"] = inputs.get("height")
                except (json.JSONDecodeError, TypeError):
                    pass
    except ImportError:
        pass  # Pillow not available
    except Exception:
        pass  # Corrupt PNG or other error
    return meta


@router.get("/gallery")
async def list_gallery():
    """List generated images with metadata extracted from PNG info."""
    gallery = _get_gallery_dir()
    if not gallery.exists():
        return []

    images = []
    for f in sorted(gallery.iterdir(), key=lambda x: x.stat().st_mtime, reverse=True):
        if f.suffix.lower() in (".png", ".jpg", ".jpeg", ".webp"):
            stat = f.stat()
            entry = {
                "filename": f.name,
                "url": f"/api/gallery/{f.name}",
                "size": stat.st_size,
                "modified": stat.st_mtime,
                "date": datetime.fromtimestamp(stat.st_mtime).strftime("%Y-%m-%d"),
                "type": "generated",
            }
            # Extract metadata from PNG
            meta = _extract_png_metadata(f)
            if meta:
                entry["model"] = meta.get("model", "")
                entry["seed"] = meta.get("seed")
                entry["steps"] = meta.get("steps")
                entry["cfg"] = meta.get("cfg")
                entry["sampler"] = meta.get("sampler", "")
                entry["scheduler"] = meta.get("scheduler", "")
                entry["width"] = meta.get("width")
                entry["height"] = meta.get("height")
                entry["positive"] = meta.get("positive", "")
            images.append(entry)

    return images


@router.get("/gallery/{filename}")
async def serve_image(filename: str):
    """Serve a generated image file."""
    gallery = _get_gallery_dir()
    filepath = _safe_resolve(gallery, filename)

    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Image not found")

    # Only serve known image extensions
    suffix = filepath.suffix.lower()
    if suffix not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Invalid file type")

    content_types = {
        ".png": "image/png",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".webp": "image/webp",
    }
    content_type = content_types.get(suffix, "application/octet-stream")

    return FileResponse(filepath, media_type=content_type)


@router.delete("/gallery/{filename}")
async def delete_image(filename: str):
    """Delete a generated image."""
    gallery = _get_gallery_dir()
    filepath = _safe_resolve(gallery, filename)

    if not filepath.exists():
        raise HTTPException(status_code=404, detail="Image not found")

    # Only allow deleting image files
    if filepath.suffix.lower() not in ALLOWED_IMAGE_EXTENSIONS:
        raise HTTPException(status_code=400, detail="Invalid file type")

    os.remove(filepath)
    return {"deleted": filepath.name}


@router.post("/upload")
async def upload_image(request: Request):
    """Upload an image to ComfyUI's input directory."""
    comfyui = request.app.state.comfyui
    form = await request.form()

    # Accept both 'file' and 'image' field names for compatibility
    file = form.get("file") or form.get("image")
    if not file:
        raise HTTPException(status_code=400, detail="No file provided")

    # Read with size limit
    contents = await file.read()
    if len(contents) > MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum size is {MAX_UPLOAD_SIZE // (1024*1024)}MB"
        )

    # Validate it's actually an image (magic bytes check)
    if not _validate_image_bytes(contents):
        raise HTTPException(status_code=400, detail="File is not a valid image")

    # Sanitize filename + enforce image extension
    safe_filename = _sanitize_filename(file.filename or "upload.png")
    ext = os.path.splitext(safe_filename)[1].lower()
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        safe_filename = os.path.splitext(safe_filename)[0] + ".png"

    result = await comfyui.upload_image(contents, safe_filename)
    return result
