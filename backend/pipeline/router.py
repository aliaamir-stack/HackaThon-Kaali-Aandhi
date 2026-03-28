"""
pipeline/router.py — Conditional Routing Logic
================================================
Called by LangGraph after the Safety agent runs.
Decides whether to route to Summary as "urgent" or "normal".
"""

from backend.pipeline.state import PipelineState


def route_after_safety(state: PipelineState) -> str:
    """
    LangGraph conditional edge function.

    Returns:
        "urgent" — if Safety Agent set override_required=True
                   (Summary Agent will generate an URGENT ESCALATION note)
        "normal" — standard pipeline completion
    """
    if state.override_required:
        print("🚨 [ROUTER] Safety override triggered — routing to URGENT summary")
        return "urgent"

    print(f"✅ [ROUTER] Normal routing to summary (urgency_level={state.urgency_level})")
    return "normal"
