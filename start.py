#!/usr/bin/env python3
"""
Matrice Launcher — starts ComfyUI (headless), the FastAPI backend, and the Vite frontend.

Usage:
    python start.py                     # Start everything (ComfyUI + backend + frontend)
    python start.py --no-comfyui        # Skip ComfyUI (if running separately)
    python start.py --backend           # Start backend only
    python start.py --frontend          # Start frontend only
    python start.py --comfyui-port 8188 # Custom ComfyUI port
    python start.py --build             # Serve built frontend (production mode)
"""

import argparse
import os
import signal
import subprocess
import sys
import time


ROOT = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(ROOT, "frontend")
BACKEND_DIR = os.path.join(ROOT, "backend")
COMFYUI_DIR = os.path.join(ROOT, "comfyui")


def find_comfyui():
    """Locate ComfyUI — bundled first, then fall back to common locations."""
    # 1. Bundled (installed by install.py)
    bundled = os.path.join(COMFYUI_DIR, "main.py")
    if os.path.isfile(bundled):
        return COMFYUI_DIR

    # 2. Environment variable
    env_path = os.environ.get("COMFYUI_PATH")
    if env_path and os.path.isfile(os.path.join(env_path, "main.py")):
        return env_path

    # 3. Common locations
    home = os.path.expanduser("~")
    common_paths = [
        os.path.join(home, "ComfyUI"),
        os.path.join(home, "Desktop", "ComfyUI"),
        os.path.join(home, "Documents", "ComfyUI"),
        "C:\\ComfyUI",
        "/opt/ComfyUI",
    ]
    for path in common_paths:
        if os.path.isfile(os.path.join(path, "main.py")):
            return path

    return None


def start_comfyui(comfyui_path, port=8188):
    """Start ComfyUI in headless mode (no browser auto-open)."""
    print(f"[Matrice] Starting ComfyUI (headless) on port {port}...")
    print(f"[Matrice] ComfyUI path: {comfyui_path}")

    env = os.environ.copy()
    # Ensure ComfyUI uses its own model/output dirs
    env["COMFYUI_PATH"] = comfyui_path

    return subprocess.Popen(
        [
            sys.executable, "main.py",
            "--listen", "127.0.0.1",
            "--port", str(port),
            "--dont-print-server",
        ],
        cwd=comfyui_path,
        env=env,
    )


def wait_for_comfyui(port=8188, timeout=120):
    """Wait for ComfyUI to become responsive."""
    import urllib.request
    import urllib.error

    url = f"http://127.0.0.1:{port}/system_stats"
    print(f"[Matrice] Waiting for ComfyUI to start...", end="", flush=True)

    start_time = time.time()
    while time.time() - start_time < timeout:
        try:
            req = urllib.request.Request(url)
            with urllib.request.urlopen(req, timeout=2) as resp:
                if resp.status == 200:
                    print(" ready!")
                    return True
        except (urllib.error.URLError, ConnectionError, OSError):
            pass
        print(".", end="", flush=True)
        time.sleep(2)

    print(" TIMEOUT!")
    print(f"[Matrice] ComfyUI did not respond within {timeout}s.")
    print(f"[Matrice] Check if it's loading models (large models take longer).")
    return False


def start_backend(comfyui_port=8188, comfyui_path=None, dev_mode=True):
    """Start the FastAPI backend server."""
    print("[Matrice] Starting backend on http://localhost:3001 ...")

    env = os.environ.copy()
    env["COMFYUI_PORT"] = str(comfyui_port)

    # Point gallery/upload dirs at the bundled ComfyUI
    if comfyui_path:
        env.setdefault("GALLERY_DIR", os.path.join(comfyui_path, "output"))
        env.setdefault("UPLOAD_DIR", os.path.join(comfyui_path, "input"))

    cmd = [
        sys.executable, "-m", "uvicorn", "backend.main:app",
        "--host", "127.0.0.1", "--port", "3001",
    ]
    if dev_mode:
        cmd.append("--reload")

    return subprocess.Popen(cmd, cwd=ROOT, env=env)


def start_frontend(build_mode=False):
    """Start the Vite frontend dev server or serve built files."""
    npm_cmd = "npm.cmd" if sys.platform == "win32" else "npm"

    if build_mode:
        # Serve built files via the backend (static files)
        print("[Matrice] Using production build (frontend served by backend)")
        return None

    print("[Matrice] Starting frontend on http://localhost:5173 ...")

    # Check if node_modules exists
    if not os.path.isdir(os.path.join(FRONTEND_DIR, "node_modules")):
        print("[Matrice] Installing frontend dependencies...")
        subprocess.run([npm_cmd, "install"], cwd=FRONTEND_DIR, check=True)

    return subprocess.Popen(
        [npm_cmd, "run", "dev"],
        cwd=FRONTEND_DIR,
    )


def main():
    parser = argparse.ArgumentParser(description="Matrice Launcher")
    parser.add_argument("--no-comfyui", action="store_true",
                        help="Don't start ComfyUI (use if running separately)")
    parser.add_argument("--backend", action="store_true",
                        help="Start backend only")
    parser.add_argument("--frontend", action="store_true",
                        help="Start frontend only")
    parser.add_argument("--comfyui-port", type=int, default=8188,
                        help="ComfyUI port (default: 8188)")
    parser.add_argument("--build", action="store_true",
                        help="Use production build instead of dev server")
    args = parser.parse_args()

    # Determine what to start
    if args.backend or args.frontend:
        run_comfy = False
        run_backend = args.backend
        run_frontend = args.frontend
    else:
        run_comfy = not args.no_comfyui
        run_backend = True
        run_frontend = True

    processes = []
    comfyui_path = None

    try:
        # ── Start ComfyUI ─────────────────────────────────────────
        if run_comfy:
            comfyui_path = find_comfyui()
            if not comfyui_path:
                print("[Matrice] ComfyUI not found!")
                print("[Matrice] Run 'python install.py' first, or set COMFYUI_PATH env var.")
                print("[Matrice] Or use --no-comfyui if ComfyUI is already running.")
                sys.exit(1)

            processes.append(start_comfyui(comfyui_path, args.comfyui_port))
            if not wait_for_comfyui(args.comfyui_port):
                print("[Matrice] Continuing anyway — ComfyUI may still be loading...")
        else:
            # Try to detect ComfyUI path for gallery/upload dirs even if not starting it
            comfyui_path = find_comfyui()

        # ── Start Backend ──────────────────────────────────────────
        if run_backend:
            processes.append(start_backend(args.comfyui_port, comfyui_path, dev_mode=not args.build))
            time.sleep(1)

        # ── Start Frontend ─────────────────────────────────────────
        if run_frontend:
            fe_proc = start_frontend(args.build)
            if fe_proc:
                processes.append(fe_proc)

        # ── Running ────────────────────────────────────────────────
        parts = []
        if run_comfy:
            parts.append(f"ComfyUI (:{ args.comfyui_port})")
        if run_backend:
            parts.append("Backend (:3001)")
        if run_frontend:
            parts.append("Frontend (:5173)")

        print(f"\n[Matrice] Running: {' + '.join(parts)}")
        print(f"[Matrice] Open http://localhost:5173 in your browser")
        print(f"[Matrice] Press Ctrl+C to stop everything.\n")

        # Wait for processes
        for p in processes:
            p.wait()

    except KeyboardInterrupt:
        print("\n[Matrice] Shutting down...")
        for p in reversed(processes):
            if p.poll() is None:
                try:
                    if sys.platform == "win32":
                        p.terminate()
                    else:
                        os.killpg(os.getpgid(p.pid), signal.SIGTERM)
                except (ProcessLookupError, OSError):
                    pass
        # Give processes a moment to clean up
        time.sleep(1)
        for p in processes:
            if p.poll() is None:
                p.kill()
        print("[Matrice] Stopped.")
        sys.exit(0)


if __name__ == "__main__":
    main()
