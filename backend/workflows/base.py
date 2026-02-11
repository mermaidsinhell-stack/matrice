"""
Shared utilities for building ComfyUI workflow JSON (node graphs).

ComfyUI workflows are dicts mapping string node IDs to node definitions.
Each node has: class_type, inputs (with values or [nodeId, outputIndex] links).
"""


class WorkflowBuilder:
    """Helper for constructing ComfyUI workflow dicts."""

    def __init__(self):
        self._nodes: dict[str, dict] = {}
        self._counter = 0

    def add_node(self, class_type: str, inputs: dict, meta_title: str = "") -> str:
        """Add a node to the workflow and return its ID."""
        self._counter += 1
        node_id = str(self._counter)
        node = {
            "class_type": class_type,
            "inputs": inputs,
        }
        if meta_title:
            node["_meta"] = {"title": meta_title}
        self._nodes[node_id] = node
        return node_id

    def link(self, source_id: str, output_index: int = 0) -> list:
        """Create a link reference to a node's output.

        Returns [node_id_str, output_index] — the format ComfyUI expects.
        """
        return [source_id, output_index]

    def build(self) -> dict:
        """Return the completed workflow dict."""
        return dict(self._nodes)


def add_checkpoint_loader(wb: WorkflowBuilder, model_name: str) -> tuple[str, str, str]:
    """Add CheckpointLoaderSimple. Returns (node_id, model_output, clip_output, vae_output)."""
    node_id = wb.add_node("CheckpointLoaderSimple", {
        "ckpt_name": model_name,
    }, meta_title="Load Checkpoint")
    # Outputs: MODEL (0), CLIP (1), VAE (2)
    return node_id, wb.link(node_id, 0), wb.link(node_id, 1), wb.link(node_id, 2)


def add_vae_loader(wb: WorkflowBuilder, vae_name: str) -> str:
    """Add VAELoader, returns link to VAE output."""
    node_id = wb.add_node("VAELoader", {
        "vae_name": vae_name,
    }, meta_title="Load VAE")
    return wb.link(node_id, 0)


def is_gguf_model(model_name: str) -> bool:
    """Check if a model filename is GGUF format."""
    return model_name.lower().endswith(".gguf")


def add_unet_loader_gguf(wb: WorkflowBuilder, unet_name: str) -> str:
    """Add UnetLoaderGGUF node. Returns link to MODEL output."""
    node_id = wb.add_node("UnetLoaderGGUF", {
        "unet_name": unet_name,
    }, meta_title="Load GGUF Model")
    return wb.link(node_id, 0)


def add_dual_clip_loader_gguf(
    wb: WorkflowBuilder,
    clip_name1: str,
    clip_name2: str,
    clip_type: str = "flux",
) -> str:
    """Add DualCLIPLoaderGGUF node. Returns link to CLIP output."""
    node_id = wb.add_node("DualCLIPLoaderGGUF", {
        "clip_name1": clip_name1,
        "clip_name2": clip_name2,
        "type": clip_type,
    }, meta_title="Load Dual CLIP (GGUF)")
    return wb.link(node_id, 0)


def add_clip_loader_gguf(
    wb: WorkflowBuilder,
    clip_name: str,
    clip_type: str = "stable_diffusion",
) -> str:
    """Add CLIPLoaderGGUF node (single CLIP). Returns link to CLIP output."""
    node_id = wb.add_node("CLIPLoaderGGUF", {
        "clip_name": clip_name,
        "type": clip_type,
    }, meta_title="Load CLIP (GGUF)")
    return wb.link(node_id, 0)


# Default CLIP models for Flux GGUF (fallbacks when user doesn't specify)
DEFAULT_FLUX_CLIP1 = "t5xxl_fp8_e4m3fn.safetensors"
DEFAULT_FLUX_CLIP2 = "clip_l.safetensors"
DEFAULT_FLUX_VAE = "ae.safetensors"


def load_model_chain(wb: WorkflowBuilder, payload) -> tuple:
    """Unified model loader: auto-detects GGUF vs checkpoint.

    For GGUF models: UnetLoaderGGUF + DualCLIPLoaderGGUF + VAELoader
    For checkpoints: CheckpointLoaderSimple + optional VAELoader

    Payload can have: model, vae, clipModel1, clipModel2, clipType
    Returns: (model_link, clip_link, vae_link)
    """
    model_name = getattr(payload, "model", "")
    vae_name = getattr(payload, "vae", "Automatic")
    clip_model1 = getattr(payload, "clipModel1", "")
    clip_model2 = getattr(payload, "clipModel2", "")
    clip_type = getattr(payload, "clipType", "flux")

    if is_gguf_model(model_name):
        # GGUF path: separate UNET + CLIP + VAE loaders
        model_link = add_unet_loader_gguf(wb, model_name)

        # CLIP: use user-specified or defaults
        c1 = clip_model1 or DEFAULT_FLUX_CLIP1
        c2 = clip_model2 or DEFAULT_FLUX_CLIP2
        clip_link = add_dual_clip_loader_gguf(wb, c1, c2, clip_type)

        # VAE: GGUF models always need an explicit VAE
        vae = vae_name if vae_name and vae_name != "Automatic" else DEFAULT_FLUX_VAE
        vae_link = add_vae_loader(wb, vae)

        return model_link, clip_link, vae_link
    else:
        # Standard checkpoint path
        _, model_link, clip_link, vae_link = add_checkpoint_loader(wb, model_name)

        # Optional VAE override
        if vae_name and vae_name != "Automatic":
            vae_link = add_vae_loader(wb, vae_name)

        return model_link, clip_link, vae_link


def add_clip_text_encode(wb: WorkflowBuilder, text: str, clip_link) -> str:
    """Add CLIPTextEncode, returns link to CONDITIONING output."""
    node_id = wb.add_node("CLIPTextEncode", {
        "text": text,
        "clip": clip_link,
    })
    return wb.link(node_id, 0)


def add_clip_set_last_layer(wb: WorkflowBuilder, clip_link, stop_at_clip_layer: int) -> str:
    """Add CLIPSetLastLayer for CLIP skip. Returns link to CLIP output."""
    if stop_at_clip_layer <= 1:
        return clip_link  # No skip needed
    node_id = wb.add_node("CLIPSetLastLayer", {
        "stop_at_clip_layer": -stop_at_clip_layer,
        "clip": clip_link,
    }, meta_title="CLIP Skip")
    return wb.link(node_id, 0)


def add_empty_latent(wb: WorkflowBuilder, width: int, height: int, batch_size: int = 1) -> str:
    """Add EmptyLatentImage. Returns link to LATENT output."""
    node_id = wb.add_node("EmptyLatentImage", {
        "width": width,
        "height": height,
        "batch_size": batch_size,
    }, meta_title="Empty Latent")
    return wb.link(node_id, 0)


def add_ksampler(
    wb: WorkflowBuilder,
    model_link,
    positive_link,
    negative_link,
    latent_link,
    seed: int,
    steps: int,
    cfg: float,
    sampler_name: str,
    scheduler: str,
    denoise: float = 1.0,
    title: str = "KSampler",
) -> str:
    """Add KSampler. Returns link to LATENT output."""
    node_id = wb.add_node("KSampler", {
        "seed": seed,
        "steps": steps,
        "cfg": cfg,
        "sampler_name": sampler_name,
        "scheduler": scheduler,
        "denoise": denoise,
        "model": model_link,
        "positive": positive_link,
        "negative": negative_link,
        "latent_image": latent_link,
    }, meta_title=title)
    return wb.link(node_id, 0)


def add_vae_decode(wb: WorkflowBuilder, latent_link, vae_link) -> str:
    """Add VAEDecode. Returns link to IMAGE output."""
    node_id = wb.add_node("VAEDecode", {
        "samples": latent_link,
        "vae": vae_link,
    }, meta_title="VAE Decode")
    return wb.link(node_id, 0)


def add_vae_encode(wb: WorkflowBuilder, image_link, vae_link) -> str:
    """Add VAEEncode. Returns link to LATENT output."""
    node_id = wb.add_node("VAEEncode", {
        "pixels": image_link,
        "vae": vae_link,
    }, meta_title="VAE Encode")
    return wb.link(node_id, 0)


def add_save_image(wb: WorkflowBuilder, image_link, prefix: str = "Matrice") -> str:
    """Add SaveImage node. Returns node_id."""
    node_id = wb.add_node("SaveImage", {
        "filename_prefix": prefix,
        "images": image_link,
    }, meta_title="Save Image")
    return node_id


def add_load_image(wb: WorkflowBuilder, image_name: str, title: str = "Load Image") -> tuple[str, str]:
    """Add LoadImage. Returns (image_link, mask_link)."""
    node_id = wb.add_node("LoadImage", {
        "image": image_name,
    }, meta_title=title)
    return wb.link(node_id, 0), wb.link(node_id, 1)


def add_latent_upscale(wb: WorkflowBuilder, latent_link, method: str, width: int, height: int) -> str:
    """Add LatentUpscale. Returns link to LATENT output."""
    node_id = wb.add_node("LatentUpscale", {
        "upscale_method": method,
        "width": width,
        "height": height,
        "crop": "disabled",
        "samples": latent_link,
    }, meta_title="Latent Upscale")
    return wb.link(node_id, 0)
