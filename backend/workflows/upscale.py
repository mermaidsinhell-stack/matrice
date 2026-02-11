"""
Upscale workflow builder.

Model upscale: LoadImage → UpscaleModelLoader → ImageUpscaleWithModel → SaveImage
Latent upscale: LoadModel → LoadImage → VAEEncode → LatentUpscale → KSampler → VAEDecode → SaveImage
"""

import random
from .base import (
    WorkflowBuilder,
    load_model_chain,
    add_clip_text_encode,
    add_ksampler,
    add_vae_decode,
    add_vae_encode,
    add_save_image,
    add_load_image,
    add_latent_upscale,
)
from .lora import add_lora_chain


def build_upscale_workflow(payload) -> dict:
    """Build an upscale ComfyUI workflow from the edit payload."""
    wb = WorkflowBuilder()

    # Load source image
    image_link, _ = add_load_image(wb, payload.image, title="Source Image")

    if payload.upscaleModel:
        # Model-based upscale (ESRGAN, RealESRGAN, etc.)
        return _build_model_upscale(wb, image_link, payload)
    else:
        # Latent upscale with KSampler refinement
        return _build_latent_upscale(wb, image_link, payload)


def _build_model_upscale(wb: WorkflowBuilder, image_link, payload) -> dict:
    """Upscale using an upscale model (ESRGAN, etc.)."""
    # Load upscale model
    loader_id = wb.add_node("UpscaleModelLoader", {
        "model_name": payload.upscaleModel,
    }, meta_title="Load Upscale Model")
    upscale_model_link = wb.link(loader_id, 0)

    # Upscale image
    upscale_id = wb.add_node("ImageUpscaleWithModel", {
        "upscale_model": upscale_model_link,
        "image": image_link,
    }, meta_title="Upscale Image")
    result_link = wb.link(upscale_id, 0)

    # Save
    add_save_image(wb, result_link, prefix="Matrice_upscale")

    return wb.build()


def _build_latent_upscale(wb: WorkflowBuilder, image_link, payload) -> dict:
    """Upscale via latent space with KSampler refinement."""
    seed = payload.seed if payload.seed >= 0 else random.randint(0, 2**32 - 1)

    # Load model chain (auto-detects GGUF vs checkpoint)
    model_link, clip_link, vae_link = load_model_chain(wb, payload)

    # LoRA chain
    if payload.loras:
        lora_dicts = [{"name": l.name, "strengthModel": l.strengthModel, "strengthClip": l.strengthClip} for l in payload.loras]
        model_link, clip_link = add_lora_chain(wb, model_link, clip_link, lora_dicts)

    # Text encoding
    positive_cond = add_clip_text_encode(wb, payload.prompt, clip_link)
    negative_cond = add_clip_text_encode(wb, payload.negativePrompt or "", clip_link)

    # Encode to latent
    latent_link = add_vae_encode(wb, image_link, vae_link)

    # Latent upscale
    latent_link = add_latent_upscale(
        wb, latent_link,
        method=payload.upscaleMethod,
        width=2048,
        height=2048,
    )

    # KSampler refinement
    latent_link = add_ksampler(
        wb, model_link, positive_cond, negative_cond, latent_link,
        seed=seed,
        steps=payload.steps,
        cfg=payload.cfg,
        sampler_name=payload.sampler,
        scheduler=payload.scheduler,
        denoise=payload.denoise,
        title="KSampler (Upscale Refine)",
    )

    # Decode
    result_image = add_vae_decode(wb, latent_link, vae_link)

    # Save
    add_save_image(wb, result_image, prefix="Matrice_upscale")

    return wb.build()
