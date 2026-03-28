"""
agents/specialist_agent.py
RAG-powered specialist agent — cross-references symptoms against WHO/CDC knowledge base.
Model: Llama-3.3-70B on Groq (via LangChain) + FAISS RAG retrieval.
Person D — Mikail (adapted by Person B for pipeline integration)
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage

# Ensure backend/ is on sys.path for local imports
backend_dir = Path(__file__).parent.parent
if str(backend_dir) not in sys.path:
    sys.path.append(str(backend_dir))

from tools.rag_retriever import retrieve_documents
from prompts.specialist_prompt import SPECIALIST_SYSTEM_PROMPT

# Load env (in case this module is imported before main.py loads it)
load_dotenv(Path(__file__).parent.parent / ".env")


def get_llm():
    """Create a Groq LLM client on demand (not at import time)."""
    groq_api_key = os.getenv("GROQ_API_KEY")
    groq_model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    if not groq_api_key:
        raise ValueError("GROQ_API_KEY not found in environment variables.")
    return ChatGroq(
        groq_api_key=groq_api_key,
        model_name=groq_model,
        temperature=0.3,
    )


def run_specialist_agent(state) -> dict:
    """
    LangGraph node: Specialist Agent.

    Reads:
        state.symptoms, state.severity, state.missing_info

    Returns:
        dict with: potential_conditions[], urgency_level, recommended_tests[], evidence_sources[]
    """
    print("🔬 [Specialist Agent] Running...")

    # Extract fields from state (works with both dict and Pydantic)
    if isinstance(state, dict):
        symptoms = state.get("symptoms", [])
        severity = state.get("severity", "Unknown")
        missing_info = state.get("missing_info", [])
    else:
        symptoms = getattr(state, "symptoms", [])
        severity = getattr(state, "severity", "Unknown")
        missing_info = getattr(state, "missing_info", [])

    symptoms_str = ", ".join(symptoms) if symptoms else "No specific symptoms recorded."
    missing_str = ", ".join(missing_info) if missing_info else "None"

    # RAG retrieval
    query_for_rag = f"Guidance and protocols regarding: {symptoms_str}"
    print(f"🔬 [Specialist Agent] RAG query: '{query_for_rag}'")
    retrieved_context = retrieve_documents(query_for_rag, k=3)

    # Build prompt
    formatted_system_prompt = SPECIALIST_SYSTEM_PROMPT.format(
        symptoms=symptoms_str,
        severity=severity,
        missing_info=missing_str,
        context=retrieved_context,
    )

    messages = [
        SystemMessage(content=formatted_system_prompt),
        HumanMessage(
            content="Please provide your specialized assessment based on the provided symptoms and domain context."
        ),
    ]

    # Call LLM
    print("🔬 [Specialist Agent] Calling LLM...")
    try:
        llm = get_llm()
        response = llm.invoke(messages)
        assessment = response.content
        print("🔬 [Specialist Agent] ✅ Assessment generated")
    except Exception as e:
        print(f"🔬 [Specialist Agent] ❌ LLM error: {e}")
        assessment = f"[specialist_agent error: {e}]"

    # Parse the assessment into structured fields
    # Since Person D's LLM returns free-text, we wrap it as potential_conditions
    return {
        "potential_conditions": [assessment] if assessment else [],
        "urgency_level": severity if isinstance(severity, int) else 2,
        "recommended_tests": [],
        "evidence_sources": [retrieved_context[:200] + "..."] if retrieved_context else [],
    }


if __name__ == "__main__":
    print("\n[TEST] Running Specialist Agent standalone\n")
    test_state = {
        "symptoms": ["chest pain", "shortness of breath", "mild fever"],
        "severity": "High",
        "missing_info": ["duration of fever", "blood pressure"],
    }
    result = run_specialist_agent(test_state)
    print("\n===== RESULT =====")
    for k, v in result.items():
        print(f"  {k}: {v}")
