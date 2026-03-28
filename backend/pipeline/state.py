"""
pipeline/state.py — Shared PipelineState Model
================================================
This is the SINGLE source of truth for the entire pipeline.
Every agent reads from this state and writes its output back into it.
Pydantic v2 enforces the schema at every node handoff.

!! SHARE THIS FILE IN THE GROUP CHAT IMMEDIATELY !!
All other team members (C, D, E) must import PipelineState from here.
"""

from pydantic import BaseModel, Field
from typing import Optional


class PipelineState(BaseModel):
    """
    Shared state object passed through every LangGraph node.
    Initialized by the orchestrator (main.py) and mutated by each agent.
    """

    # ─── Input Layer ───────────────────────────────────────────────────────────
    audio_path: str = Field(default="", description="Absolute path to the uploaded audio file")
    raw_transcript: str = Field(default="", description="Raw text from Whisper (may be Urdu/Sindhi/Pashto etc.)")
    source_language: str = Field(default="", description="Detected/selected language of the audio")
    clinical_english: str = Field(default="", description="Translated clinical English text from Localization Agent")

    # ─── Triage Layer ──────────────────────────────────────────────────────────
    symptoms: list[str] = Field(default_factory=list, description="Extracted symptom strings")
    duration: str = Field(default="", description="How long symptoms have been present")
    severity: int = Field(default=0, ge=0, le=10, description="Symptom severity score 1-10")
    missing_info: list[str] = Field(default_factory=list, description="Critical info the health worker did not provide")

    # ─── Specialist Layer ──────────────────────────────────────────────────────
    potential_conditions: list[str] = Field(default_factory=list, description="Possible conditions flagged for doctor (NOT a diagnosis)")
    urgency_level: int = Field(default=1, ge=1, le=5, description="Clinical urgency 1 (routine) to 5 (emergency)")
    evidence_sources: list[str] = Field(default_factory=list, description="WHO/CDC guideline references used")
    recommended_tests: list[str] = Field(default_factory=list, description="Suggested diagnostic tests")

    # ─── Safety Layer ──────────────────────────────────────────────────────────
    is_urgent: bool = Field(default=False, description="True if Safety Agent detected a life-threatening condition")
    red_flags: list[str] = Field(default_factory=list, description="Specific red-flag conditions detected")
    drug_interactions: list[str] = Field(default_factory=list, description="Dangerous drug interactions if any")
    override_required: bool = Field(default=False, description="If True, pipeline SKIPS to Summary with URGENT flag")

    # ─── Output Layer ──────────────────────────────────────────────────────────
    referral_note_en: str = Field(default="", description="Final formatted referral note in English (Markdown)")
    referral_note_native: str = Field(default="", description="Back-translated referral note in patient's language")
    pipeline_status: str = Field(default="pending", description="pending | running | complete | error")
    error_message: Optional[str] = Field(default=None, description="Error details if pipeline_status == 'error'")

    class Config:
        # Allow extra fields so agents can add debug metadata without breaking validation
        extra = "allow"
