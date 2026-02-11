"""
Generation endpoint — accepts frontend payload, builds ComfyUI workflow, submits it.
"""

import logging
import uuid

from fastapi import APIRouter, HTTPException, Request
from pydantic import BaseModel, Field

from ..bundled_loras import ensure_all_bundled_loras

router = APIRouter(tags=["generate"])
logger = logging.getLogger(__name__)


class LoRAConfig(BaseModel):
    name: str
    strengthModel: float = Field(1.0, ge=-5.0, le=5.0)
    strengthClip: float = Field(1.0, ge=-5.0, le=5.0)


class ControlNetConfig(BaseModel):
    enabled: bool = False
    preprocessor: str = "canny"
    model: str = ""
    image: str = ""
    strength: float = Field(1.0, ge=0.0, le=2.0)
    startPercent: float = Field(0.0, ge=0.0, le=1.0)
    endPercent: float = Field(1.0, ge=0.0, le=1.0)


class HiresFixConfig(BaseModel):
    enabled: bool = False
    scale: float = Field(1.5, ge=1.0, le=4.0)
    steps: int = Field(10, ge=1, le=150)
    denoise: float = Field(0.45, ge=0.0, le=1.0)
    upscaleMethod: str = "nearest-exact"


class Img2ImgConfig(BaseModel):
    enabled: bool = False
    image: str = ""
    denoise: float = Field(0.7, ge=0.0, le=1.0)


class FaceSwapConfig(BaseModel):
    enabled: bool = False
    image: str = ""
    fidelity: float = Field(0.8, ge=0.0, le=1.0)


class IPAdapterRefConfig(BaseModel):
    enabled: bool = False
    image: str = ""
    strength: float = Field(0.6, ge=0.0, le=2.0)
    startPercent: float = Field(0.0, ge=0.0, le=1.0)
    endPercent: float = Field(1.0, ge=0.0, le=1.0)
    model: str = ""
    noise: float = Field(0.0, ge=0.0, le=1.0)


class GeneratePayload(BaseModel):
    prompt: str = ""
    negativePrompt: str = ""
    model: str = ""
    vae: str = "Automatic"
    clipModel1: str = ""
    clipModel2: str = ""
    clipType: str = "flux"
    width: int = Field(1024, ge=64, le=8192)
    height: int = Field(1024, ge=64, le=8192)
    steps: int = Field(25, ge=1, le=150)
    cfg: float = Field(7.0, ge=0.0, le=100.0)
    sampler: str = "euler"
    scheduler: str = "normal"
    seed: int = Field(-1, ge=-1, le=2147483647)
    clipSkip: int = Field(1, ge=-12, le=12)
    batchSize: int = Field(1, ge=1, le=16)
    performance: str = "Custom"
    jobId: str = ""  # Optional frontend-assigned job ID for WS progress tracking
    loras: list[LoRAConfig] = Field(default_factory=list)
    hiresFix: HiresFixConfig = Field(default_factory=HiresFixConfig)
    img2img: Img2ImgConfig = Field(default_factory=Img2ImgConfig)
    faceSwap: FaceSwapConfig = Field(default_factory=FaceSwapConfig)
    characterRef: IPAdapterRefConfig = Field(default_factory=IPAdapterRefConfig)
    styleRef: IPAdapterRefConfig = Field(default_factory=IPAdapterRefConfig)
    controlNets: list[ControlNetConfig] = Field(default_factory=list)


@router.post("/generate")
async def generate(payload: GeneratePayload, request: Request):
    """Submit a generation job to ComfyUI."""
    comfyui = request.app.state.comfyui
    ws_manager = request.app.state.ws_manager

    if not payload.model:
        raise HTTPException(status_code=400, detail="No model selected")

    # Use frontend-assigned jobId if provided, otherwise generate one
    job_id = payload.jobId or uuid.uuid4().hex[:12]

    # Auto-download any missing bundled LoRAs (Flux turbo presets)
    lora_names = [l.name for l in payload.loras if l.name]
    if lora_names:
        failed = await ensure_all_bundled_loras(lora_names, ws_manager, job_id)
        if failed:
            raise HTTPException(
                status_code=503,
                detail=f"Failed to download required LoRA(s): {', '.join(failed)}. Check your internet connection.",
            )

    try:
        # Build workflow from payload
        from ..workflows.txt2img import build_txt2img_workflow
        workflow = build_txt2img_workflow(payload)
    except Exception as e:
        logger.exception("Failed to build workflow")
        raise HTTPException(status_code=500, detail=f"Workflow build error: {str(e)}")

    try:
        # Submit to ComfyUI
        result = await comfyui.submit_prompt(workflow, ws_manager.client_id)
    except Exception as e:
        logger.exception("Failed to submit prompt to ComfyUI")
        raise HTTPException(status_code=502, detail=f"ComfyUI submission error: {str(e)}")

    prompt_id = result.get("prompt_id", "")
    node_errors = result.get("node_errors", {})

    # If ComfyUI rejected the prompt (validation failure), return an error
    if not prompt_id and node_errors:
        # Extract first meaningful error message
        error_details = []
        for node_id, err_info in node_errors.items():
            if isinstance(err_info, str):
                error_details.append(err_info)
            elif isinstance(err_info, dict):
                for err in err_info.get("errors", []):
                    error_details.append(err.get("message", "") + ": " + err.get("details", ""))
        detail_msg = "; ".join(error_details) if error_details else "ComfyUI rejected the prompt"
        raise HTTPException(status_code=502, detail=detail_msg)

    if prompt_id:
        ws_manager.register_prompt(prompt_id, job_id)

    return {
        "jobId": job_id,
        "promptId": prompt_id,
        "nodeErrors": node_errors,
    }
