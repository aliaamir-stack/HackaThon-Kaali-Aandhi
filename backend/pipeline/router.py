"""
pipeline/router.py — Conditional Routing Logic
================================================
Called by LangGraph after the Safety agent runs.
Decides whether to route to Summary as "urgent" or "normal".
"""


def route_after_safety(state) -> str:
    """
    LangGraph conditional edge function.

    Args:
        state: PipelineState (may be dict or Pydantic object depending on LangGraph version)

    Returns:
        "urgent" — if Safety Agent set override_required=True
        "normal" — standard pipeline completion
    """
    # Handle both dict and Pydantic object
    if isinstance(state, dict):
        override = state.get("override_required", False)
        urgency = state.get("urgency_level", 1)
    else:
        override = getattr(state, "override_required", False)
        urgency = getattr(state, "urgency_level", 1)

    if override:
        print("🚨 [ROUTER] Safety override triggered — routing to URGENT summary")
        return "urgent"

    print(f"✅ [ROUTER] Normal routing to summary (urgency_level={urgency})")
    return "normal"
