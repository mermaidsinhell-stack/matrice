"""
LoRA chain workflow builder.

Takes a list of LoRA configs and chains LoraLoader nodes:
model_in → LoraLoader1 → LoraLoader2 → ... → model_out, clip_out
"""

from .base import WorkflowBuilder


def add_lora_chain(wb: WorkflowBuilder, model_link, clip_link, loras: list[dict]) -> tuple:
    """Chain multiple LoRA loaders.

    Args:
        wb: WorkflowBuilder instance
        model_link: Input MODEL link
        clip_link: Input CLIP link
        loras: List of dicts with keys: name, strengthModel, strengthClip

    Returns:
        (model_link, clip_link) — outputs after all LoRAs applied
    """
    current_model = model_link
    current_clip = clip_link

    for i, lora in enumerate(loras):
        if not lora.get("name"):
            continue

        node_id = wb.add_node("LoraLoader", {
            "lora_name": lora["name"],
            "strength_model": lora.get("strengthModel", 1.0),
            "strength_clip": lora.get("strengthClip", 1.0),
            "model": current_model,
            "clip": current_clip,
        }, meta_title=f"LoRA {i + 1}: {lora['name'][:30]}")

        current_model = wb.link(node_id, 0)  # MODEL output
        current_clip = wb.link(node_id, 1)   # CLIP output

    return current_model, current_clip
