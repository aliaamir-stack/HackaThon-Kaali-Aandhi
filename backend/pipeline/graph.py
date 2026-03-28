"""
pipeline/graph.py — LangGraph State Machine
============================================
Defines the full pipeline graph:

  transcribe → localize → triage → specialist → safety → [router] → summary

The router uses a conditional edge: if safety.override_required == True,
the summary agent generates an URGENT ESCALATION note instead of normal output.

NOTE: The agent node functions are imported from backend/agents/.
While Persons C, D, E are building their agents, stub versions are used
so this graph can be tested end-to-end immediately.
"""

import os
from langgraph.graph import StateGraph, END
from backend.pipeline.state import PipelineState
from backend.pipeline.router import route_after_safety

# ── Import real agent nodes (once delivered by C, D, E) ───────────────────────
# These will raise ImportError if the files don't exist yet — stubs below handle that

def _try_import_agents():
    agents = {}
    try:
        from backend.agents.localization_agent import run_localization_agent
        agents["localization"] = run_localization_agent
    except ImportError:
        agents["localization"] = None

    try:
        from backend.agents.triage_agent import run_triage_agent
        agents["triage"] = run_triage_agent
    except ImportError:
        agents["triage"] = None

    try:
        from backend.agents.specialist_agent import run_specialist_agent
        agents["specialist"] = run_specialist_agent
    except ImportError:
        agents["specialist"] = None

    try:
        from backend.agents.safety_agent import run_safety_agent
        agents["safety"] = run_safety_agent
    except ImportError:
        agents["safety"] = None

    try:
        from backend.agents.summary_agent import run_summary_agent
        agents["summary"] = run_summary_agent
    except ImportError:
        agents["summary"] = None

    try:
        from backend.tools.transcriber import run_transcriber
        agents["transcribe"] = run_transcriber
    except ImportError:
        agents["transcribe"] = None

    return agents


# ── Stub implementations (used until real agents are wired in) ─────────────────

def _stub_transcribe(state: PipelineState) -> dict:
    """Stub: simulates Whisper output."""
    print("🎙 [STUB] transcribe_node running...")
    return {
        "raw_transcript": "[STUB] Mujhe teen din se bukhaar hai aur sar dard ho raha hai.",
        "source_language": state.source_language or "urdu",
        "pipeline_status": "running",
    }


def _stub_localize(state: PipelineState) -> dict:
    """Stub: simulates Localization Agent (Llama-3-8B on Groq)."""
    print("🌐 [STUB] localize_node running...")
    return {
        "clinical_english": "[STUB] Patient reports fever for 3 days accompanied by headache. No vomiting. Appetite reduced.",
        "source_language": state.source_language or "urdu",
    }


def _stub_triage(state: PipelineState) -> dict:
    """Stub: simulates Triage Agent (DeepSeek-R1)."""
    print("📋 [STUB] triage_node running...")
    return {
        "symptoms": ["fever", "headache", "reduced appetite"],
        "duration": "3 days",
        "severity": 4,
        "missing_info": ["temperature reading", "any recent travel", "medication history"],
    }


def _stub_specialist(state: PipelineState) -> dict:
    """Stub: simulates Specialist Agent (DeepSeek-R1 + RAG)."""
    print("🔬 [STUB] specialist_node running...")
    return {
        "potential_conditions": ["Viral fever", "Typhoid (early stage)", "Dengue (rule out)"],
        "urgency_level": 2,
        "recommended_tests": ["Complete blood count (CBC)", "Dengue NS1 antigen test", "Typhoid test"],
        "evidence_sources": ["WHO Primary Healthcare Guidelines 2023", "CDC Dengue Clinical Guidelines"],
    }


def _stub_safety(state: PipelineState) -> dict:
    """Stub: simulates Safety Agent (DeepSeek-R1)."""
    print("🚨 [STUB] safety_node running...")
    # Override to True only if symptoms contain red-flag keywords (for testing)
    urgent_keywords = {"chest pain", "difficulty breathing", "stroke", "seizure", "unconscious"}
    is_urgent = any(kw in s.lower() for s in state.symptoms for kw in urgent_keywords)
    return {
        "is_urgent": is_urgent,
        "red_flags": ["Possible cardiac event"] if is_urgent else [],
        "drug_interactions": [],
        "override_required": is_urgent,
    }


def _stub_summary(state: PipelineState) -> dict:
    """Stub: simulates Summary Agent (DeepSeek-R1)."""
    print("📄 [STUB] summary_node running...")
    urgency_tag = "🚨 URGENT ESCALATION" if state.override_required else "✅ Routine Referral"
    note = f"""# {urgency_tag}

**Patient Complaint:** {state.clinical_english}

**Symptoms:** {', '.join(state.symptoms)}
**Duration:** {state.duration}
**Severity:** {state.severity}/10

**Potential Conditions (for physician review):**
{chr(10).join(f'- {c}' for c in state.potential_conditions)}

**Urgency Level:** {state.urgency_level}/5

**Recommended Tests:**
{chr(10).join(f'- {t}' for t in state.recommended_tests)}

**Red Flags:** {', '.join(state.red_flags) if state.red_flags else 'None detected'}

---
⚠ This report is for physician review only. Not an autonomous diagnosis.
"""
    return {
        "referral_note_en": note,
        "referral_note_native": "[STUB] Translation pending — Localization Agent will back-translate this.",
        "pipeline_status": "complete",
    }


# ── Node wrapper factory ────────────────────────────────────────────────────────

def _make_node(real_fn, stub_fn):
    """Returns the real agent function if available, otherwise the stub."""
    if real_fn is not None:
        return real_fn
    return stub_fn


# ── Graph Construction ──────────────────────────────────────────────────────────

def build_graph():
    """
    Builds and compiles the LangGraph pipeline.
    Returns a compiled runnable graph.
    """
    imported = _try_import_agents()

    transcribe_node  = _make_node(imported.get("transcribe"),  _stub_transcribe)
    localize_node    = _make_node(imported.get("localization"), _stub_localize)
    triage_node      = _make_node(imported.get("triage"),       _stub_triage)
    specialist_node  = _make_node(imported.get("specialist"),   _stub_specialist)
    safety_node      = _make_node(imported.get("safety"),       _stub_safety)
    summary_node     = _make_node(imported.get("summary"),      _stub_summary)

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
            "urgent": "summary",   # Both paths lead to summary,
            "normal": "summary",   # but state.override_required tells summary how to format
        }
    )

    graph.add_edge("summary", END)

    # Entry point
    graph.set_entry_point("transcribe")

    return graph.compile()


# Singleton compiled graph — imported by main.py
pipeline = build_graph()
