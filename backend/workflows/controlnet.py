"""
ControlNet sub-workflow builder.

Inserts ControlNet conditioning between CLIP encode and KSampler.
Supports chaining multiple ControlNets.
"""

from .base import WorkflowBuilder


def add_controlnet_chain(
    wb: WorkflowBuilder,
    positive_cond,
    negative_cond,
    controlnets: list[dict],
) -> tuple:
    """Apply one or more ControlNets to conditioning.

    Args:
        wb: WorkflowBuilder instance
        positive_cond: Positive CONDITIONING link
        negative_cond: Negative CONDITIONING link
        controlnets: List of dicts with keys:
            model, image, strength, startPercent, endPercent

    Returns:
        (positive_cond, negative_cond) — modified conditioning links
    """
    current_positive = positive_cond
    current_negative = negative_cond

    for i, cn in enumerate(controlnets):
        if not cn.get("model") or not cn.get("image"):
            continue

        # Load ControlNet model
        loader_id = wb.add_node("ControlNetLoader", {
            "control_net_name": cn["model"],
        }, meta_title=f"ControlNet {i + 1}")
        cn_model_link = wb.link(loader_id, 0)

        # Load control image
        img_id = wb.add_node("LoadImage", {
            "image": cn["image"],
        }, meta_title=f"ControlNet Image {i + 1}")
        cn_image_link = wb.link(img_id, 0)

        # Apply ControlNet (ControlNetApplyAdvanced supports start/end percent)
        apply_id = wb.add_node("ControlNetApplyAdvanced", {
            "strength": cn.get("strength", 1.0),
            "start_percent": cn.get("startPercent", 0.0),
            "end_percent": cn.get("endPercent", 1.0),
            "positive": current_positive,
            "negative": current_negative,
            "control_net": cn_model_link,
            "image": cn_image_link,
        }, meta_title=f"Apply ControlNet {i + 1}")

        current_positive = wb.link(apply_id, 0)
        current_negative = wb.link(apply_id, 1)

    return current_positive, current_negative
