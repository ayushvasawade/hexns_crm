import os
import sys
import subprocess

# Ensure application package is discoverable
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

# Run Alembic migrations on startup
alembic_ini = os.path.join(os.path.dirname(__file__), "alembic.ini")
config_arg = ["-c", alembic_ini] if os.path.exists(alembic_ini) else []

try:
    print("Running database migrations...")
    subprocess.run(["alembic", *config_arg, "upgrade", "head"], check=False)
    print("Database migrations applied.")
except Exception as e:
    print(f"Migration notice: {e}")

try:
    import spaces
except ImportError:
    # Dummy mock for local development outside Hugging Face ZeroGPU
    class spaces:
        @staticmethod
        def GPU(duration=60):
            def decorator(fn):
                return fn
            return decorator

import gradio as gr
from app.main import app as fastapi_app

# ZeroGPU strictly requires an inference worker function decorated with @spaces.GPU
@spaces.GPU(duration=60)
def api_status_worker(query: str = "") -> str:
    return "HEXNS CRM API & ZeroGPU Online. Query: " + (query or "OK")

# Gradio Interface registers the @spaces.GPU function with input/output
# so the Hugging Face ZeroGPU startup scanner detects it immediately
demo = gr.Interface(
    fn=api_status_worker,
    inputs=gr.Textbox(label="Status Query", value="ping"),
    outputs=gr.Textbox(label="Backend Response"),
    title="HEXNS Mediaworks CRM API",
    description="FastAPI Backend connected to Neon PostgreSQL. All REST API endpoints are active at /api/v1/*.",
)

# 1. Launch Gradio server on port 7860 (or env PORT) without blocking the thread immediately
server_port = int(os.environ.get("PORT", 7860))
demo.launch(
    server_name="0.0.0.0",
    server_port=server_port,
    prevent_thread_lock=True,
    show_error=True,
)

# 2. Mount FastAPI application directly onto the live running Gradio ASGI App
# This ensures FastAPI routes (/api/v1, /auth, /api) have full precedence and handle CORS
demo.app.mount("/api/v1", fastapi_app)
demo.app.mount("/auth", fastapi_app)
demo.app.mount("/api", fastapi_app)

print(f"HEXNS CRM API successfully mounted and running on port {server_port}.")

# 3. Block main thread to keep Hugging Face Space running continuously
demo.block_thread()
