"""
Edit endpoint — handles img2img, inpaint, and upscale jobs.
"""

import logging
import uuid

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

router = APIRouter(tags=["edit"])
logger = logging.getLogger(__name__)

VALID_EDIT_MODES = {"img2img", "inpaint", "upscale"}


class EditLoRAConfig(BaseModel):
    name: str
    strengthModel: float = Field(1.0, ge=-5.0, le=5.0)
    strengthClip: float = Field(1.0, ge=-5.0, le=5.0)


class EditPayload(BaseModel):
    mode: str = "img2img"  # img2img, inpaint, upscale
    image: str = ""  # filename in ComfyUI input
    mask: str = ""  # mask filename (for inpaint)
    prompt: str = ""
    negativePrompt: str = ""
    model: str = ""
    vae: str = "Automatic"
    clipModel1: str = ""
    clipModel2: str = ""
    clipType: str = "flux"
    steps: int = Field(25, ge=1, le=150)
    cfg: float = Field(7.0, ge=0.0, le=100.0)
    sampler: str = "euler"
    scheduler: str = "normal"
    seed: int = Field(-1, ge=-1, le=2147483647)
    denoise: float = Field(0.7, ge=0.0, le=1.0)
    jobId: str = ""  # Optional frontend-assigned job ID for WS progress tracking
    loras: list[EditLoRAConfig] = Field(default_factory=list)
    # Upscale-specific
    upscaleModel: str = ""
    upscaleMethod: str = "nearest-exact"
    # Inpaint-specific
    maskBlur: int = Field(6, ge=0, le=64)
    inpaintArea: str = "full"  # full or masked_only
    inpaintPadding: int = Field(32, ge=0, le=512)


@router.post("/edit")
async def edit(payload: EditPayload, request: Request):
    """Submit an edit job (img2img, inpaint, or upscale) to ComfyUI."""
    comfyui = request.app.state.comfyui
    ws_manager = request.app.state.ws_manager

    if payload.mode not in VALID_EDIT_MODES:
        raise HTTPException(status_code=400, detail=f"Invalid mode: {payload.mode}")
    if not payload.image:
        raise HTTPException(status_code=400, detail="No image provided")

    # Use frontend-assigned jobId if provided, otherwise generate one
    job_id = payload.jobId or uuid.uuid4().hex[:12]

    try:
        # Build appropriate workflow based on mode
        if payload.mode == "upscale":
            from ..workflows.upscale import build_upscale_workflow
            workflow = build_upscale_workflow(payload)
        elif payload.mode == "inpaint":
            from ..workflows.inpaint import build_inpaint_workflow
            workflow = build_inpaint_workflow(payload)
        else:
            from ..workflows.img2img import build_img2img_workflow
            workflow = build_img2img_workflow(payload)
    except Exception as e:
        logger.exception("Failed to build edit workflow")
        raise HTTPException(status_code=500, detail=f"Workflow build error: {str(e)}")

    try:
        # Submit to ComfyUI
        result = await comfyui.submit_prompt(workflow, ws_manager.client_id)
    except Exception as e:
        logger.exception("Failed to submit edit prompt to ComfyUI")
        raise HTTPException(status_code=502, detail=f"ComfyUI submission error: {str(e)}")

    prompt_id = result.get("prompt_id", "")
    if prompt_id:
        ws_manager.register_prompt(prompt_id, job_id)

    return {
        "jobId": job_id,
        "promptId": prompt_id,
        "nodeErrors": result.get("node_errors", {}),
    }
