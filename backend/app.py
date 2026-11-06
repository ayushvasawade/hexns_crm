import os
import sys
import subprocess
import gradio as gr

# Ensure application package is discoverable
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

# Run Alembic migrations on startup
try:
    subprocess.run(["alembic", "upgrade", "head"], check=False)
except Exception as e:
    print(f"Migration notice: {e}")

from app.main import app as fastapi_app

# Status landing page for Hugging Face Space
with gr.Blocks(title="HEXNS Mediaworks API") as demo:
    gr.Markdown("# 🚀 HEXNS Mediaworks CRM API")
    gr.Markdown("FastAPI Backend is running live and connected to Neon PostgreSQL.")
    gr.Markdown("- [View Interactive Swagger API Docs](/docs)")
    gr.Markdown("- [Health Check Endpoint](/api/v1/health)")

# Mount FastAPI app onto Gradio root
app = gr.mount_gradio_app(fastapi_app, demo, path="/")

