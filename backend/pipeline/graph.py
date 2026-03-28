"""
pipeline/graph.py — LangGraph State Machine
============================================
Defines the full pipeline graph:

  transcribe → localize → triage → specialist → safety → [router] → summary

The router uses a conditional edge: if safety.override_required == True,
the summary agent generates an URGENT ESCALATION note instead of normal output.

IMPORTANT: Each teammate's agent has different function signatures and field names.
This file acts as the adapter layer — wrapping each agent into a consistent
LangGraph node that takes PipelineState and returns a dict of updated fields.
"""

import os
from pathlib import Path
from dotenv import load_dotenv
from langgraph.graph import StateGraph, END
from backend.pipeline.state import PipelineState
from backend.pipeline.router import route_after_safety

# Ensure .env is loaded before any agent imports
load_dotenv(Path(__file__).parent.parent / ".env")


# ══════════════════════════════════════════════════════════════════════════════
# NODE WRAPPERS — adapt each teammate's real agent to LangGraph's interface
# Each node:  takes PipelineState → returns dict of fields to update
# ══════════════════════════════════════════════════════════════════════════════


# ── NODE 1: Transcribe ──────────────────────────────────────────────────────────

LANGUAGE_TO_ISO = {
    "urdu": "ur", "sindhi": "sd", "pashto": "ps", "punjabi": "pa",
    "arabic": "ar", "hindi": "hi", "english": "en", "bengali": "bn",
    "balochi": "bal", "saraiki": "skr",
}

def transcribe_node(state: PipelineState) -> dict:
    """Wraps Person C's transcriber.py into a LangGraph node."""
    print("[Transcribe Node] Running...")

    # If raw_transcript is already provided (text input mode), skip transcription
    if state.raw_transcript and state.raw_transcript.strip():
        print(f"[Transcribe Node] Skipping -- text already provided ({len(state.raw_transcript)} chars)")
        return {"pipeline_status": "running"}

    try:
        from backend.tools.transcriber import transcribe_audio
        lang_hint = (state.source_language or "").lower().strip()
        iso_lang = LANGUAGE_TO_ISO.get(lang_hint, lang_hint) if lang_hint else None
        if iso_lang and len(iso_lang) > 3:
            iso_lang = None
        result = transcribe_audio(
            audio_file_path=state.audio_path,
            language=iso_lang,
        )
        return {
            "raw_transcript": result.get("text", ""),
            "source_language": result.get("detected_language", state.source_language),
            "pipeline_status": "running",
        }
    except Exception as e:
        print(f"[Transcribe Node] ERROR: {e}")
        return {
            "raw_transcript": f"[transcription error: {e}]",
            "source_language": state.source_language or "unknown",
            "pipeline_status": "running",
        }


# ── NODE 2: Localize ────────────────────────────────────────────────────────────

def localize_node(state: PipelineState) -> dict:
    """Wraps Person C's localization_agent.py into a LangGraph node.
    Adapts field names: their code uses 'transcript' and 'english_transcript',
    our state uses 'raw_transcript' and 'clinical_english'.
    """
    print("[Localize Node] Running...")
    try:
        import json
        from groq import Groq

        client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

        _SYSTEM_PROMPT = """You are a precise medical language localization assistant integrated into a clinical decision-support system.

Your responsibilities:
1. Confirm or correct the language detected by the speech-to-text system.
2. Translate the transcript to English if it is not already in English.
3. Preserve ALL medical terminology, symptom descriptions, durations, and clinical details with exact fidelity.
4. Never add, remove, paraphrase, or interpret clinical content.

Always respond with a single, valid JSON object. No prose outside the JSON."""

        transcript = state.raw_transcript
        detected_hint = state.source_language or "unknown"

        user_message = f"""Medical transcript to localise:

\"\"\"{transcript}\"\"\"

Language hint from speech-to-text (may be inaccurate): {detected_hint}

Return a JSON object with EXACTLY these keys:
{{
  "confirmed_language": "<full language name in English>",
  "language_code": "<ISO 639-1 two-letter code>",
  "english_text": "<complete English translation — identical to input if already in English>",
  "was_translated": <true or false>,
  "translation_notes": "<comma-separated list of ambiguous terms, or empty string>"
}}"""

        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
            temperature=0.1,
            max_tokens=2048,
            response_format={"type": "json_object"},
        )

        result = json.loads(response.choices[0].message.content)
        clinical_english = result.get("english_text", transcript)
        source_lang = result.get("confirmed_language", detected_hint)

        print(f"[Localize Node] OK language={source_lang}, translated={result.get('was_translated', False)}")
        return {
            "clinical_english": clinical_english,
            "source_language": source_lang,
        }
    except Exception as e:
        print(f"[Localize Node] ERROR: {e}")
        return {
            "clinical_english": state.raw_transcript,  # pass through as-is
            "source_language": state.source_language or "unknown",
        }


# ── NODE 3: Triage ──────────────────────────────────────────────────────────────

def triage_node(state: PipelineState) -> dict:
    """Wraps Person C's triage_agent.py into a LangGraph node.
    Adapts: reads 'clinical_english' (not 'english_transcript'),
    converts severity from string to int.
    """
    print("[Triage Node] Running...")
    try:
        import json
        import re
        from groq import Groq
        from backend.prompts.triage_prompt import TRIAGE_SYSTEM_PROMPT, build_triage_user_prompt

        client = Groq(api_key=os.environ.get("GROQ_API_KEY"))
        english_text = state.clinical_english or state.raw_transcript

        response = client.chat.completions.create(
            model=os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile"),
            messages=[
                {"role": "system", "content": TRIAGE_SYSTEM_PROMPT},
                {"role": "user", "content": build_triage_user_prompt(english_text)},
            ],
            temperature=0.2,
            max_tokens=4096,
        )

        raw_content = response.choices[0].message.content
        # Strip <think>...</think> blocks from DeepSeek-R1
        cleaned = re.sub(r"<think>.*?</think>", "", raw_content, flags=re.DOTALL).strip()

        # Try direct JSON parse, then regex fallback
        try:
            result = json.loads(cleaned)
        except json.JSONDecodeError:
            match = re.search(r"\{.*\}", cleaned, re.DOTALL)
            if match:
                result = json.loads(match.group())
            else:
                raise ValueError(f"No JSON found in triage response")

        # Convert severity string → int (our state uses int 0-10)
        severity_map = {"low": 2, "medium": 4, "high": 7, "critical": 10}
        raw_severity = str(result.get("severity", "medium")).lower().strip()
        severity_int = severity_map.get(raw_severity, 4)

        print(f"[Triage Node] OK symptoms={len(result.get('symptoms', []))}, severity={severity_int}")
        return {
            "symptoms": [str(s) for s in result.get("symptoms", [])],
            "duration": str(result.get("duration", "")),
            "severity": severity_int,
            "missing_info": [str(m) for m in result.get("missing_info", [])],
        }
    except Exception as e:
        print(f"[Triage Node] ERROR: {e}")
        return {
            "symptoms": [],
            "duration": "",
            "severity": 4,
            "missing_info": ["Automated triage failed — manual clinical review required"],
        }


# ── NODE 4: Specialist ──────────────────────────────────────────────────────────

def specialist_node(state: PipelineState) -> dict:
    """Wraps Person D's specialist_agent.py. Already compatible (returns dict)."""
    print("[Specialist Node] Running...")
    try:
        from backend.agents.specialist_agent import run_specialist_agent
        return run_specialist_agent(state)
    except Exception as e:
        print(f"[Specialist Node] ERROR: {e}")
        return {
            "potential_conditions": [f"[specialist error: {e}]"],
            "urgency_level": 2,
            "recommended_tests": [],
            "evidence_sources": [],
        }


# ── NODE 5: Safety ──────────────────────────────────────────────────────────────

def safety_node(state: PipelineState) -> dict:
    """Calls the synchronous safety agent directly — no async adapter needed."""
    print("[Safety Node] Running...")
    try:
        from backend.agents.safety_agent import run_safety_agent
        return run_safety_agent(state)
    except Exception as e:
        print(f"[Safety Node] ERROR: {e}")
        urgent_keywords = {"chest pain", "difficulty breathing", "stroke", "seizure", "unconscious"}
        symptoms_text = " ".join(state.symptoms).lower() if state.symptoms else ""
        is_urgent = any(kw in symptoms_text for kw in urgent_keywords)
        return {
            "is_urgent": is_urgent,
            "red_flags": [f"Safety agent error: {e}"] if is_urgent else [],
            "drug_interactions": [],
            "override_required": is_urgent,
        }


# ── NODE 6: Summary ────────────────────────────────────────────────────────────

def summary_node(state: PipelineState) -> dict:
    """Calls the synchronous summary agent directly — no async adapter needed."""
    print("[Summary Node] Running...")
    try:
        from backend.agents.summary_agent import run_summary_agent
        return run_summary_agent(state)
    except Exception as e:
        print(f"[Summary Node] ERROR: {e}")
        return {
            "referral_note_en": f"# Error\n\nSummary generation failed: {e}",
            "referral_note_native": "[Error generating native translation]",
            "pipeline_status": "complete",
        }


# ══════════════════════════════════════════════════════════════════════════════
# GRAPH CONSTRUCTION
# ══════════════════════════════════════════════════════════════════════════════

def build_graph():
    """Builds and compiles the LangGraph pipeline."""
    graph = StateGraph(PipelineState)

    # Register all nodes
    graph.add_node("transcribe",  transcribe_node)
    graph.add_node("localize",    localize_node)
    graph.add_node("triage",      triage_node)
    graph.add_node("specialist",  specialist_node)
    graph.add_node("safety",      safety_node)
    graph.add_node("summary",     summary_node)

    # Linear flow
    graph.add_edge("transcribe",  "localize")
    graph.add_edge("localize",    "triage")
    graph.add_edge("triage",      "specialist")
    graph.add_edge("specialist",  "safety")

    # Conditional edge after Safety Agent
    graph.add_conditional_edges(
        "safety",
        route_after_safety,
        {
            "urgent": "summary",
            "normal": "summary",
        }
    )

    graph.add_edge("summary", END)
    graph.set_entry_point("transcribe")

    return graph.compile()


# Singleton compiled graph — imported by main.py
pipeline = build_graph()
