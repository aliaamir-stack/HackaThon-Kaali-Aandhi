"""
pipeline/state.py
Pydantic model representing the shared pipeline state passed between all LangGraph nodes.

PLACEHOLDER — Person B (Ali) owns this file.
Arsal: use this for local testing until Ali drops the real version in chat.
Replace this entire file with Ali's version when it arrives.
"""

from __future__ import annotations

from typing import Optional
from pydantic import BaseModel, Field


class PipelineState(BaseModel):
    """
    Shared state that flows through every node in the LangGraph pipeline.

    ── INPUT ────────────────────────────────────────────────────────────────
    """

    # Raw input — exactly one of these should be set per run
    audio_file_path: Optional[str] = Field(None, description="Path to uploaded audio file")
    raw_text_input: Optional[str] = Field(None, description="Direct text input from user")

    # ── TRANSCRIPTION (tools/transcriber.py) ────────────────────────────
    transcript: str = Field("", description="Raw transcript from Whisper or text input")
    detected_language: str = Field("unknown", description="ISO-639-1 code from Whisper")
    audio_duration: Optional[float] = Field(None, description="Audio length in seconds")

    # ── LOCALIZATION (agents/localization_agent.py) ──────────────────────
    confirmed_language: str = Field("unknown", description="Full language name, e.g. Urdu")
    language_code: str = Field("en", description="ISO-639-1 code after confirmation")
    english_transcript: str = Field("", description="Transcript in English")
    was_translated: bool = Field(False, description="True if a translation was performed")
    translation_notes: str = Field("", description="Flagged ambiguous medical terms")

    # ── TRIAGE (agents/triage_agent.py) ──────────────────────────────────
    symptoms: list[str] = Field(default_factory=list, description="Extracted symptom list")
    severity: str = Field("unknown", description="low | medium | high | critical")
    missing_info: list[str] = Field(
        default_factory=list,
        description="Clinically important details the patient did not mention",
    )
    triage_summary: str = Field("", description="2–4 sentence clinical summary")

    # ── SPECIALIST (agents/specialist_agent.py — Person D) ───────────────
    specialist_findings: str = Field("", description="RAG-enriched specialist analysis")
    retrieved_chunks: list[str] = Field(default_factory=list, description="RAG source chunks")

    # ── SAFETY (agents/safety_agent.py — Person E) ───────────────────────
    red_flags: list[str] = Field(default_factory=list, description="Detected safety red flags")
    override_required: bool = Field(False, description="True if human override is mandatory")

    # ── SUMMARY (agents/summary_agent.py — Person E) ─────────────────────
    referral_note: str = Field("", description="Final Markdown referral note for the clinician")

    # ── PIPELINE META ─────────────────────────────────────────────────────
    pipeline_error: Optional[str] = Field(None, description="Set if any node raised an error")

    class Config:
        # Allow agents to add extra fields without validation errors
        extra = "allow"
