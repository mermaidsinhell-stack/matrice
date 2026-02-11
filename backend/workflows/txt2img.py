"""
Text-to-image workflow builder.

Flow: LoadModel → (LoRA chain) → CLIPTextEncode x2 → EmptyLatentImage
      → KSampler → (optional HiresFix: LatentUpscale → KSampler2) → VAEDecode → SaveImage
"""

import random
from .base import (
    WorkflowBuilder,
    load_model_chain,
    add_clip_set_last_layer,
    add_clip_text_encode,
    add_empty_latent,
    add_ksampler,
    add_vae_decode,
    add_save_image,
    add_latent_upscale,
)
from .lora import add_lora_chain


def build_txt2img_workflow(payload) -> dict:
    """Build a txt2img ComfyUI workflow from the frontend payload."""
    wb = WorkflowBuilder()

    # Resolve seed
    seed = payload.seed if payload.seed >= 0 else random.randint(0, 2**32 - 1)

    # 1. Load model chain (auto-detects GGUF vs checkpoint)
    model_link, clip_link, vae_link = load_model_chain(wb, payload)

    # 2. LoRA chain
    if payload.loras:
        lora_dicts = [{"name": l.name, "strengthModel": l.strengthModel, "strengthClip": l.strengthClip} for l in payload.loras]
        model_link, clip_link = add_lora_chain(wb, model_link, clip_link, lora_dicts)

    # 3. CLIP skip
    clip_link = add_clip_set_last_layer(wb, clip_link, payload.clipSkip)

    # 4. Text encoding
    positive_cond = add_clip_text_encode(wb, payload.prompt, clip_link)
    negative_cond = add_clip_text_encode(wb, payload.negativePrompt or "", clip_link)

    # 5. Empty latent
    latent_link = add_empty_latent(wb, payload.width, payload.height, payload.batchSize)

    # 6. KSampler
    latent_link = add_ksampler(
        wb, model_link, positive_cond, negative_cond, latent_link,
        seed=seed,
        steps=payload.steps,
        cfg=payload.cfg,
        sampler_name=payload.sampler,
        scheduler=payload.scheduler,
        denoise=1.0,
        title="KSampler",
    )

    # 7. Optional Hires Fix (second pass)
    if payload.hiresFix and payload.hiresFix.enabled:
        hf = payload.hiresFix
        upscaled_w = int(payload.width * hf.scale)
        upscaled_h = int(payload.height * hf.scale)

        latent_link = add_latent_upscale(
            wb, latent_link,
            method=hf.upscaleMethod,
            width=upscaled_w,
            height=upscaled_h,
        )

        latent_link = add_ksampler(
            wb, model_link, positive_cond, negative_cond, latent_link,
            seed=seed,
            steps=hf.steps,
            cfg=payload.cfg,
            sampler_name=payload.sampler,
            scheduler=payload.scheduler,
            denoise=hf.denoise,
            title="KSampler (Hires)",
        )

    # 8. VAE Decode
    image_link = add_vae_decode(wb, latent_link, vae_link)

    # 9. Save
    add_save_image(wb, image_link, prefix="Matrice")

    return wb.build()
