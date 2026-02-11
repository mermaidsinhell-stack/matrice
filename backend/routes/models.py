"""
Model discovery endpoints — dynamically fetches available models from ComfyUI.
"""

import logging

from fastapi import APIRouter, Request

router = APIRouter(tags=["models"])
logger = logging.getLogger(__name__)


def get_comfyui(request: Request):
    return request.app.state.comfyui


@router.get("/models")
async def list_models(request: Request):
    """List all available generation models (checkpoints + diffusion + GGUF UNET).

    Combines standard checkpoint/diffusion_models folders with GGUF loader
    node types so Flux GGUF models show up even when stored in the unet/ folder.
    """
    client = get_comfyui(request)
    return await client.get_all_unet_models()


@router.get("/diffusion-models")
async def list_diffusion_models(request: Request):
    """List diffusion model files (e.g., Flux GGUF)."""
    client = get_comfyui(request)
    return await client.get_models("diffusion_models")


@router.get("/loras")
async def list_loras(request: Request):
    """List LoRA files."""
    client = get_comfyui(request)
    return await client.get_models("loras")


@router.get("/vaes")
async def list_vaes(request: Request):
    """List VAE files."""
    client = get_comfyui(request)
    return await client.get_models("vae")


@router.get("/controlnets")
async def list_controlnets(request: Request):
    """List ControlNet model files."""
    client = get_comfyui(request)
    return await client.get_models("controlnet")


@router.get("/upscalers")
async def list_upscalers(request: Request):
    """List upscale model files."""
    client = get_comfyui(request)
    return await client.get_models("upscale_models")


@router.get("/clip-models")
async def list_clip_models(request: Request):
    """List CLIP / text encoder model files.

    Checks standard clip folder and also GGUF CLIP loader nodes.
    """
    client = get_comfyui(request)
    models = set(await client.get_models("clip"))

    # Also check GGUF CLIP loaders
    for node_class, input_name in [
        ("CLIPLoaderGGUF", "clip_name"),
        ("DualCLIPLoaderGGUF", "clip_name1"),
        ("TripleCLIPLoaderGGUF", "clip_name1"),
    ]:
        node_models = await client.get_models_from_node(node_class, input_name)
        models.update(node_models)

    return sorted(models)


@router.get("/ipadapter-models")
async def list_ipadapter_models(request: Request):
    """List IP-Adapter model files."""
    client = get_comfyui(request)
    return await client.get_models("ipadapter")


@router.get("/clip-vision-models")
async def list_clip_vision_models(request: Request):
    """List CLIP Vision model files."""
    client = get_comfyui(request)
    return await client.get_models("clip_vision")


@router.get("/embeddings")
async def list_embeddings(request: Request):
    """List available text embeddings."""
    client = get_comfyui(request)
    return await client.get_embeddings()


@router.get("/samplers")
async def list_samplers(request: Request):
    """Get available samplers and schedulers from ComfyUI's KSampler node."""
    client = get_comfyui(request)
    return await client.get_samplers_and_schedulers()


@router.get("/preprocessors")
async def list_preprocessors(request: Request):
    """List available ControlNet preprocessor nodes."""
    client = get_comfyui(request)
    return await client.get_controlnet_preprocessors()
