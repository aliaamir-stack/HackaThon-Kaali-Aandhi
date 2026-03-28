"""
main.py — FastAPI Application Entry Point
==========================================
Run from project root:
    uvicorn backend.main:app --reload --port 8000

Endpoints:
    GET  /              -> health check + agent list
    GET  /docs          -> Swagger UI (auto-generated)
    POST /run-pipeline  -> audio input  (multipart/form-data)  -> PipelineResponse
    POST /run-text      -> text input   (JSON body)            -> PipelineResponse
    GET  /pipeline/status -> agent readiness check
"""

import os
import uuid
import tempfile
import asyncio
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, File, Form, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

env_path = Path(__file__).parent / ".env"
load_dotenv(env_path)

from backend.pipeline.state import PipelineState
from backend.pipeline.graph import pipeline

# ── App Setup ────────────────────────────────────────────────────────────────

app = FastAPI(
    title="AI Mustaqbil 2.0 — Rural Health Diagnostic API",
    description="Multi-agent LangGraph pipeline for rural healthcare diagnostics",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "*",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path(tempfile.gettempdir()) / "mediagent_uploads"
UPLOAD_DIR.mkdir(exist_ok=True)


# ══════════════════════════════════════════════════════════════════════════════
# REQUEST / RESPONSE MODELS — mirrored 1:1 in frontend/src/types/pipeline.ts
# ══════════════════════════════════════════════════════════════════════════════

class PipelineResponse(BaseModel):
    """
    Canonical response for BOTH /run-pipeline and /run-text.
    TS mirror: PipelineResponse in pipeline.ts
    """
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


class TextPipelineRequest(BaseModel):
    """
    JSON body for POST /run-text.
    TS mirror: TextPipelineRequest in pipeline.ts
    """
    text: str
    language: str = "urdu"


# ══════════════════════════════════════════════════════════════════════════════
# SHARED HELPERS
# ══════════════════════════════════════════════════════════════════════════════

def _build_response(final_state: dict, language: str) -> PipelineResponse:
    """Convert LangGraph output dict into PipelineResponse."""
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


async def _run_pipeline(initial_state: PipelineState, language: str, label: str) -> PipelineResponse:
    """Execute the LangGraph pipeline and return PipelineResponse."""
    print(f"\n{'='*60}")
    print(f"[{label}] Starting | language={language}")
    print(f"{'='*60}")

    final_state = await asyncio.get_event_loop().run_in_executor(
        None, lambda: pipeline.invoke(initial_state)
    )

    print(f"\n{'='*60}")
    print(f"[{label}] Complete | status={final_state.get('pipeline_status', 'complete')}")
    print(f"{'='*60}\n")

    return _build_response(final_state, language)


# ══════════════════════════════════════════════════════════════════════════════
# ROUTES
# ══════════════════════════════════════════════════════════════════════════════

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
    audio: UploadFile = File(..., description="Audio file (WAV/MP3/OGG/WEBM)"),
    language: str = Form(default="urdu", description="Source language: urdu | sindhi | pashto | punjabi | english | other"),
):
    """
    Audio pipeline — accepts multipart/form-data.

    Request (FormData):
        audio:    File       (required)
        language: string     (default "urdu")

    TS mirror: AudioPipelineRequest in pipeline.ts
    Returns:   PipelineResponse
    """
    allowed_types = {
        "audio/wav", "audio/mpeg", "audio/mp3", "audio/ogg",
        "audio/m4a", "audio/webm", "application/octet-stream",
    }
    if audio.content_type not in allowed_types and not audio.filename.endswith(
        (".wav", ".mp3", ".ogg", ".m4a", ".webm")
    ):
        raise HTTPException(status_code=400, detail=f"Unsupported file type: {audio.content_type}. Upload WAV or MP3.")

    file_id = uuid.uuid4().hex
    suffix = Path(audio.filename).suffix or ".wav"
    audio_path = UPLOAD_DIR / f"{file_id}{suffix}"

    try:
        contents = await audio.read()
        with open(audio_path, "wb") as f:
            f.write(contents)
        print(f"[UPLOAD] Saved {audio.filename} ({len(contents)} bytes)")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save audio: {str(e)}")

    initial_state = PipelineState(
        audio_path=str(audio_path),
        source_language=language.lower().strip(),
        pipeline_status="running",
    )

    try:
        return await _run_pipeline(initial_state, language, "PIPELINE-AUDIO")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Pipeline failed: {str(e)}")
    finally:
        try:
            audio_path.unlink(missing_ok=True)
        except Exception:
            pass


@app.post("/run-text", response_model=PipelineResponse, tags=["Pipeline"])
async def run_text_pipeline(body: TextPipelineRequest):
    """
    Text pipeline — accepts JSON body, skips Whisper transcription.

    Request (JSON):
        { "text": "patient symptoms", "language": "urdu" }

    TS mirror: TextPipelineRequest in pipeline.ts
    Returns:   PipelineResponse (identical shape to /run-pipeline)
    """
    if not body.text or not body.text.strip():
        raise HTTPException(status_code=400, detail="text field cannot be empty")

    initial_state = PipelineState(
        audio_path="",
        raw_transcript=body.text.strip(),
        source_language=body.language.lower().strip(),
        pipeline_status="running",
    )

    try:
        return await _run_pipeline(initial_state, body.language, "PIPELINE-TEXT")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Pipeline failed: {str(e)}")


@app.get("/pipeline/status", tags=["Pipeline"])
async def pipeline_status():
    """Returns which agents are loaded vs stub."""
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
