"""
Inpaint workflow builder.

Flow: LoadModel → LoadImage (source) + LoadImage (mask) → VAEEncodeForInpaint
      → KSampler → VAEDecode → SaveImage
"""

import random
from .base import (
    WorkflowBuilder,
    load_model_chain,
    add_clip_text_encode,
    add_ksampler,
    add_vae_decode,
    add_save_image,
    add_load_image,
)
from .lora import add_lora_chain


def build_inpaint_workflow(payload) -> dict:
    """Build an inpaint ComfyUI workflow from the edit payload."""
    wb = WorkflowBuilder()

    seed = payload.seed if payload.seed >= 0 else random.randint(0, 2**32 - 1)

    # 1. Load model chain (auto-detects GGUF vs checkpoint)
    model_link, clip_link, vae_link = load_model_chain(wb, payload)

    # 2. LoRA chain
    if payload.loras:
        lora_dicts = [{"name": l.name, "strengthModel": l.strengthModel, "strengthClip": l.strengthClip} for l in payload.loras]
        model_link, clip_link = add_lora_chain(wb, model_link, clip_link, lora_dicts)

    # 3. Text encoding
    positive_cond = add_clip_text_encode(wb, payload.prompt, clip_link)
    negative_cond = add_clip_text_encode(wb, payload.negativePrompt or "", clip_link)

    # 4. Load source image and mask
    image_link, _ = add_load_image(wb, payload.image, title="Source Image")
    mask_link_img, mask_link = add_load_image(wb, payload.mask, title="Mask")

    # 5. VAEEncodeForInpaint — encodes image with mask for inpainting
    inpaint_node_id = wb.add_node("VAEEncodeForInpaint", {
        "grow_mask_by": payload.maskBlur,
        "pixels": image_link,
        "vae": vae_link,
        "mask": mask_link,
    }, meta_title="VAE Encode (Inpaint)")
    latent_link = wb.link(inpaint_node_id, 0)

    # 6. KSampler
    latent_link = add_ksampler(
        wb, model_link, positive_cond, negative_cond, latent_link,
        seed=seed,
        steps=payload.steps,
        cfg=payload.cfg,
        sampler_name=payload.sampler,
        scheduler=payload.scheduler,
        denoise=payload.denoise,
        title="KSampler (Inpaint)",
    )

    # 7. VAE Decode
    result_image = add_vae_decode(wb, latent_link, vae_link)

    # 8. Save
    add_save_image(wb, result_image, prefix="Matrice_inpaint")

    return wb.build()
