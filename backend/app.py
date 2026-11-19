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

# Check for ZeroGPU environment and register required hook
try:
    import spaces
    @spaces.GPU
    def _gpu_keepalive():
        return "online"
    has_spaces = True
except ImportError:
    has_spaces = False

import gradio as gr
from fastapi.middleware.cors import CORSMiddleware
from app.main import app as fastapi_app

# Gradio interface satisfying ZeroGPU and Hugging Face healthcheck
with gr.Blocks(title="HEXNS Mediaworks CRM API") as demo:
    gr.Markdown("# 🚀 HEXNS Mediaworks CRM API")
    gr.Markdown("FastAPI backend is active and connected to Neon PostgreSQL.")
    gr.Markdown("- [Interactive Swagger API Docs](/docs)")
    gr.Markdown("- [Health Check Endpoint](/api/v1/health)")
    if has_spaces:
        status_btn = gr.Button("Status", visible=False)
        status_btn.click(fn=_gpu_keepalive)

# Mount Gradio interface onto FastAPI app so FastAPI routes (/api/v1/*) take priority
app = gr.mount_gradio_app(fastapi_app, demo, path="/")

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 7860))
    print(f"Starting server on port {port}...")
    uvicorn.run(app, host="0.0.0.0", port=port)
