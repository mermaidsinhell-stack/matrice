#!/usr/bin/env python3
"""
Matrice Installer — one-command setup for the entire stack.

Downloads ComfyUI, installs Python dependencies, installs frontend deps,
and creates default model directories. After running this, just use start.py.

Usage:
    python install.py                # Full install
    python install.py --skip-comfyui # Skip ComfyUI download (if already installed elsewhere)
    python install.py --gpu cuda     # Specify GPU type: cuda (default), rocm, cpu
"""

import argparse
import os
import platform
import shutil
import subprocess
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
COMFYUI_DIR = os.path.join(ROOT, "comfyui")
FRONTEND_DIR = os.path.join(ROOT, "frontend")
BACKEND_DIR = os.path.join(ROOT, "backend")

# ComfyUI repository
COMFYUI_REPO = "https://github.com/comfyanonymous/ComfyUI.git"

# PyTorch install commands per GPU type
PYTORCH_URLS = {
    "cuda": "https://download.pytorch.org/whl/cu124",
    "rocm": "https://download.pytorch.org/whl/rocm6.2",
    "cpu": "https://download.pytorch.org/whl/cpu",
}


def print_step(msg):
    print(f"\n{'='*60}")
    print(f"  {msg}")
    print(f"{'='*60}\n")


def print_info(msg):
    print(f"  [Matrice] {msg}")


def check_python():
    """Verify Python version is 3.10+."""
    major, minor = sys.version_info[:2]
    if major < 3 or (major == 3 and minor < 10):
        print(f"[ERROR] Python 3.10+ required. You have {major}.{minor}")
        sys.exit(1)
    print_info(f"Python {major}.{minor} OK")


def check_git():
    """Verify git is installed."""
    if not shutil.which("git"):
        print("[ERROR] git is not installed. Please install git first.")
        print("  Windows: https://git-scm.com/download/win")
        print("  Mac: brew install git")
        print("  Linux: sudo apt install git")
        sys.exit(1)
    print_info("git OK")


def check_node():
    """Verify Node.js is installed."""
    node_cmd = shutil.which("node")
    if not node_cmd:
        print("[ERROR] Node.js is not installed. Please install Node.js 18+ first.")
        print("  Download: https://nodejs.org/")
        sys.exit(1)
    result = subprocess.run([node_cmd, "--version"], capture_output=True, text=True)
    version = result.stdout.strip()
    print_info(f"Node.js {version} OK")


def install_comfyui(gpu_type):
    """Clone ComfyUI and install its Python dependencies."""
    print_step("Installing ComfyUI")

    if os.path.isdir(COMFYUI_DIR):
        print_info("ComfyUI directory already exists, pulling latest...")
        subprocess.run(["git", "pull"], cwd=COMFYUI_DIR, check=True)
    else:
        print_info("Cloning ComfyUI...")
        subprocess.run(
            ["git", "clone", COMFYUI_REPO, COMFYUI_DIR],
            check=True,
        )

    # Install PyTorch with correct GPU support
    print_info(f"Installing PyTorch ({gpu_type})...")
    torch_url = PYTORCH_URLS.get(gpu_type, PYTORCH_URLS["cuda"])

    subprocess.run(
        [
            sys.executable, "-m", "pip", "install",
            "torch", "torchvision", "torchaudio",
            "--extra-index-url", torch_url,
        ],
        check=True,
    )

    # Install ComfyUI requirements
    comfyui_reqs = os.path.join(COMFYUI_DIR, "requirements.txt")
    if os.path.isfile(comfyui_reqs):
        print_info("Installing ComfyUI Python dependencies...")
        subprocess.run(
            [sys.executable, "-m", "pip", "install", "-r", comfyui_reqs],
            check=True,
        )

    # Create model directories
    print_info("Creating model directories...")
    model_dirs = [
        "models/checkpoints",
        "models/diffusion_models",
        "models/loras",
        "models/vae",
        "models/controlnet",
        "models/upscale_models",
        "models/clip",
        "models/clip_vision",
        "models/ipadapter",
        "models/embeddings",
        "input",
        "output",
        "custom_nodes",
    ]
    for d in model_dirs:
        os.makedirs(os.path.join(COMFYUI_DIR, d), exist_ok=True)

    print_info("ComfyUI installed successfully!")
    print_info("")
    print_info("Download models into these directories:")
    print_info(f"  Checkpoints:  {os.path.join(COMFYUI_DIR, 'models', 'checkpoints')}")
    print_info(f"  LoRAs:        {os.path.join(COMFYUI_DIR, 'models', 'loras')}")
    print_info(f"  VAEs:         {os.path.join(COMFYUI_DIR, 'models', 'vae')}")
    print_info(f"  GGUF models:  {os.path.join(COMFYUI_DIR, 'models', 'diffusion_models')}")


def install_comfyui_gguf_node():
    """Install the ComfyUI-GGUF custom node for Flux GGUF support."""
    print_step("Installing ComfyUI-GGUF Custom Node")

    custom_nodes_dir = os.path.join(COMFYUI_DIR, "custom_nodes")
    gguf_dir = os.path.join(custom_nodes_dir, "ComfyUI-GGUF")

    if os.path.isdir(gguf_dir):
        print_info("ComfyUI-GGUF already installed, pulling latest...")
        subprocess.run(["git", "pull"], cwd=gguf_dir, check=True)
    else:
        print_info("Cloning ComfyUI-GGUF...")
        subprocess.run(
            ["git", "clone", "https://github.com/city96/ComfyUI-GGUF.git", gguf_dir],
            check=True,
        )

    # Install GGUF node requirements if they exist
    gguf_reqs = os.path.join(gguf_dir, "requirements.txt")
    if os.path.isfile(gguf_reqs):
        print_info("Installing GGUF node dependencies...")
        subprocess.run(
            [sys.executable, "-m", "pip", "install", "-r", gguf_reqs],
            check=True,
        )

    print_info("ComfyUI-GGUF installed!")


def install_backend_deps():
    """Install Matrice backend Python dependencies."""
    print_step("Installing Matrice Backend Dependencies")

    reqs = os.path.join(BACKEND_DIR, "requirements.txt")
    if os.path.isfile(reqs):
        subprocess.run(
            [sys.executable, "-m", "pip", "install", "-r", reqs],
            check=True,
        )
    print_info("Backend dependencies installed!")


def install_frontend_deps():
    """Install Matrice frontend Node.js dependencies."""
    print_step("Installing Matrice Frontend Dependencies")

    npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"

    if not os.path.isdir(os.path.join(FRONTEND_DIR, "node_modules")):
        subprocess.run(
            [npm_cmd, "install"],
            cwd=FRONTEND_DIR,
            check=True,
        )
    else:
        print_info("node_modules already exists, skipping...")

    print_info("Frontend dependencies installed!")


def print_success():
    print(f"""
{'='*60}

  Matrice installed successfully!

  Next steps:

  1. Download a model into:
     {os.path.join(COMFYUI_DIR, 'models', 'checkpoints')}

     Popular choices:
     - Flux GGUF models (small, fast)
     - SDXL checkpoints
     - SD 1.5 checkpoints

  2. Start Matrice:
     python start.py

  3. Open your browser:
     http://localhost:5173

{'='*60}
""")


def main():
    parser = argparse.ArgumentParser(description="Matrice Installer")
    parser.add_argument(
        "--skip-comfyui",
        action="store_true",
        help="Skip ComfyUI download (use if you already have ComfyUI elsewhere)",
    )
    parser.add_argument(
        "--gpu",
        choices=["cuda", "rocm", "cpu"],
        default="cuda",
        help="GPU type for PyTorch install (default: cuda)",
    )
    parser.add_argument(
        "--skip-gguf",
        action="store_true",
        help="Skip ComfyUI-GGUF custom node installation",
    )
    args = parser.parse_args()

    print("""
  ╔══════════════════════════════════════════╗
  ║         Matrice — Installer              ║
  ║   Beautiful Headless ComfyUI Frontend    ║
  ╚══════════════════════════════════════════╝
""")

    # Pre-flight checks
    print_step("Checking Prerequisites")
    check_python()
    check_git()
    check_node()

    # Install components
    if not args.skip_comfyui:
        install_comfyui(args.gpu)
        if not args.skip_gguf:
            install_comfyui_gguf_node()

    install_backend_deps()
    install_frontend_deps()
    print_success()


if __name__ == "__main__":
    main()
