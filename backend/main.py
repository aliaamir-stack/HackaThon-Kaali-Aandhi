"""
main.py — FastAPI Application Entry Point
==========================================
Run with:
    cd backend
    uvicorn main:app --reload --port 8000

Endpoints:
    GET  /           → health check
    GET  /docs       → Swagger UI
    POST /run-pipeline → main pipeline endpoint (multipart/form-data)
"""

import os
import uuid
import tempfile
import asyncio
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, File, Form, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from dotenv import load_dotenv

# Load environment variables from .env
load_dotenv()

# Import after env load
from backend.pipeline.state import PipelineState
from backend.pipeline.graph import pipeline

# ── App Setup ────────────────────────────────────────────────────────────────

app = FastAPI(
    title="AI Mustaqbil 2.0 — Rural Health Diagnostic API",
    description="Multi-agent LangGraph pipeline for rural healthcare diagnostics",
    version="1.0.0",
)

# CORS — allow Vite dev server and any local frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",   # Vite default
        "http://localhost:3000",   # CRA fallback
        "http://127.0.0.1:5173",
        "*",                       # Wide open during hackathon — restrict in production
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Upload directory
UPLOAD_DIR = Path(tempfile.gettempdir()) / "mediagent_uploads"
UPLOAD_DIR.mkdir(exist_ok=True)


# ── Response Model ────────────────────────────────────────────────────────────

class PipelineResponse(BaseModel):
    """What the frontend receives after /run-pipeline completes."""
    pipeline_status: str
    raw_transcript: str
    source_language: str
    clinical_english: str
    symptoms: list[str]
    duration: str
    severity: int
    missing_info: list[str]
    potential_conditions: list[str]
    urgency_level: int
    recommended_tests: list[str]
    evidence_sources: list[str]
    is_urgent: bool
    red_flags: list[str]
    drug_interactions: list[str]
    override_required: bool
    referral_note_en: str
    referral_note_native: str
    error_message: Optional[str] = None


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/", tags=["Health"])
async def root():
    """Health check endpoint."""
    return {
        "status": "online",
        "service": "AI Mustaqbil 2.0 — Rural Health Diagnostic Pipeline",
        "version": "1.0.0",
        "agents": ["transcribe", "localize", "triage", "specialist", "safety", "summary"],
    }


@app.post("/run-pipeline", response_model=PipelineResponse, tags=["Pipeline"])
async def run_pipeline(
    audio: UploadFile = File(..., description="Audio file (WAV/MP3) of patient voice description"),
    language: str = Form(default="urdu", description="Source language: urdu | sindhi | pashto | punjabi | other"),
):
    """
    Main pipeline endpoint.

    Accepts a multipart/form-data request with:
    - audio: the uploaded audio file
    - language: selected language from the frontend dropdown

    Returns the complete PipelineState as JSON after all agents have run.
    """

    # ── Validate file type ────────────────────────────────────────────────────
    allowed_types = {"audio/wav", "audio/mpeg", "audio/mp3", "audio/ogg", "audio/m4a",
                     "audio/webm", "application/octet-stream"}
    if audio.content_type not in allowed_types and not audio.filename.endswith(
        (".wav", ".mp3", ".ogg", ".m4a", ".webm")
    ):
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type: {audio.content_type}. Upload WAV or MP3."
        )

    # ── Save uploaded file to disk ────────────────────────────────────────────
    file_id = uuid.uuid4().hex
    suffix = Path(audio.filename).suffix or ".wav"
    audio_path = UPLOAD_DIR / f"{file_id}{suffix}"

    try:
        contents = await audio.read()
        with open(audio_path, "wb") as f:
            f.write(contents)
        print(f"📁 [UPLOAD] Saved audio to {audio_path} ({len(contents)} bytes)")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save audio file: {str(e)}")

    # ── Initialize PipelineState ──────────────────────────────────────────────
    initial_state = PipelineState(
        audio_path=str(audio_path),
        source_language=language.lower().strip(),
        pipeline_status="running",
    )

    # ── Run LangGraph pipeline ────────────────────────────────────────────────
    try:
        print(f"\n{'='*60}")
        print(f"🚀 Starting pipeline | language={language} | file={audio.filename}")
        print(f"{'='*60}")

        # Run pipeline synchronously in a thread pool to avoid blocking the event loop
        final_state: PipelineState = await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: pipeline.invoke(initial_state)
        )

        print(f"\n{'='*60}")
        print(f"✅ Pipeline complete | status={final_state.get('pipeline_status', 'complete')}")
        print(f"{'='*60}\n")

        # Build response (LangGraph returns a dict, not PipelineState object)
        return PipelineResponse(
            pipeline_status=final_state.get("pipeline_status", "complete"),
            raw_transcript=final_state.get("raw_transcript", ""),
            source_language=final_state.get("source_language", language),
            clinical_english=final_state.get("clinical_english", ""),
            symptoms=final_state.get("symptoms", []),
            duration=final_state.get("duration", ""),
            severity=final_state.get("severity", 0),
            missing_info=final_state.get("missing_info", []),
            potential_conditions=final_state.get("potential_conditions", []),
            urgency_level=final_state.get("urgency_level", 1),
            recommended_tests=final_state.get("recommended_tests", []),
            evidence_sources=final_state.get("evidence_sources", []),
            is_urgent=final_state.get("is_urgent", False),
            red_flags=final_state.get("red_flags", []),
            drug_interactions=final_state.get("drug_interactions", []),
            override_required=final_state.get("override_required", False),
            referral_note_en=final_state.get("referral_note_en", ""),
            referral_note_native=final_state.get("referral_note_native", ""),
            error_message=final_state.get("error_message"),
        )

    except Exception as e:
        print(f"❌ Pipeline error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Pipeline execution failed: {str(e)}"
        )

    finally:
        # Clean up uploaded file
        try:
            audio_path.unlink(missing_ok=True)
        except Exception:
            pass


@app.get("/pipeline/status", tags=["Pipeline"])
async def pipeline_status():
    """Returns which agents are currently using real vs stub implementations."""
    stub_agents = []
    real_agents = []
    agent_names = ["localization_agent", "triage_agent", "specialist_agent", "safety_agent", "summary_agent"]
    tools = ["transcriber", "rag_retriever"]

    for agent in agent_names + tools:
        try:
            __import__(f"backend.agents.{agent}")
            real_agents.append(agent)
        except ImportError:
            try:
                __import__(f"backend.tools.{agent}")
                real_agents.append(agent)
            except ImportError:
                stub_agents.append(agent)

    return {
        "real_agents": real_agents,
        "stub_agents": stub_agents,
        "pipeline_ready": True,
    }
