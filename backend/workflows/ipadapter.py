"""
IP-Adapter sub-workflow builder.

Handles character reference and style reference via IP-Adapter nodes.
"""

from .base import WorkflowBuilder


def add_ipadapter(
    wb: WorkflowBuilder,
    model_link,
    ipadapter_config: dict,
    title: str = "IP-Adapter",
) -> str:
    """Add IP-Adapter to the model pipeline.

    Args:
        wb: WorkflowBuilder instance
        model_link: Input MODEL link
        ipadapter_config: Dict with keys:
            model (IP-Adapter model name), image (reference image filename),
            strength, startPercent, endPercent, noise

    Returns:
        model_link — modified MODEL output link
    """
    if not ipadapter_config.get("model") or not ipadapter_config.get("image"):
        return model_link

    # Load IP-Adapter model
    ipa_loader_id = wb.add_node("IPAdapterModelLoader", {
        "ipadapter_file": ipadapter_config["model"],
    }, meta_title=f"Load {title} Model")
    ipa_model_link = wb.link(ipa_loader_id, 0)

    # Load CLIP Vision model (required for IP-Adapter)
    # IP-Adapter typically needs clip_vision — we'll use a standard one
    clip_vision_id = wb.add_node("CLIPVisionLoader", {
        "clip_name": "clip_vision_g.safetensors",  # Common default
    }, meta_title="CLIP Vision")
    clip_vision_link = wb.link(clip_vision_id, 0)

    # Load reference image
    ref_img_id = wb.add_node("LoadImage", {
        "image": ipadapter_config["image"],
    }, meta_title=f"{title} Reference")
    ref_image_link = wb.link(ref_img_id, 0)

    # Encode image with CLIP Vision
    encode_id = wb.add_node("CLIPVisionEncode", {
        "clip_vision": clip_vision_link,
        "image": ref_image_link,
    }, meta_title=f"Encode {title}")
    clip_vision_output = wb.link(encode_id, 0)

    # Apply IP-Adapter
    apply_id = wb.add_node("IPAdapterApply", {
        "weight": ipadapter_config.get("strength", 0.6),
        "start_at": ipadapter_config.get("startPercent", 0.0),
        "end_at": ipadapter_config.get("endPercent", 1.0),
        "weight_type": "standard",
        "noise": ipadapter_config.get("noise", 0.0),
        "ipadapter": ipa_model_link,
        "clip_vision_output": clip_vision_output,
        "image": ref_image_link,
        "model": model_link,
    }, meta_title=f"Apply {title}")

    return wb.link(apply_id, 0)
