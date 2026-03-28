from pydantic import BaseModel
from typing import List

class PipelineState(BaseModel):
    # Input layer
    audio_path: str = ""
    raw_transcript: str = ""
    source_language: str = ""
    clinical_english: str = ""

    # Triage layer
    symptoms: List[str] = []
    duration: str = ""
    severity: int = 0  # 1-10
    missing_info: List[str] = []

    # Specialist layer
    potential_conditions: List[str] = []
    urgency_level: int = 1  # 1-5
    evidence_sources: List[str] = []

    # Safety layer
    is_urgent: bool = False
    red_flags: List[str] = []
    override_required: bool = False

    # Output layer
    referral_note_en: str = ""
    referral_note_native: str = ""
    pipeline_status: str = "pending"
