import os
from typing import TypedDict, List, Dict, Any
from dotenv import load_dotenv

from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage

import sys
from pathlib import Path

# Provide absolute references or adjust sys.path for local hackathon testing
backend_dir = Path(__file__).parent.parent
sys.path.append(str(backend_dir))

from tools.rag_retriever import retrieve_documents
from prompts.specialist_prompt import SPECIALIST_SYSTEM_PROMPT

load_dotenv()

# ==========================================
# MOCK STATE FOR TESTING
# Person B will provide the actual GraphState
# ==========================================
class PipelineState(TypedDict):
    messages: List[Any]
    symptoms: List[str]
    severity: str
    missing_info: List[str]
    context: str
    specialist_assessment: str
    override_required: bool

# Instantiate the Groq client with an LLM
def get_llm():
    groq_api_key = os.getenv("GROQ_API_KEY")
    groq_model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    if not groq_api_key:
        raise ValueError("GROQ_API_KEY not found in environment variables.")

    # Using the flexible model (you can change this in .env via GROQ_MODEL)
    return ChatGroq(
        groq_api_key=groq_api_key,
        model_name=groq_model,
        temperature=0.3
    )

def specialist_node(state: PipelineState) -> PipelineState:
    """
    LangGraph Node for the Specialist Agent.
    
    1. Extracts symptoms/severity from the state.
    2. Calls the RAG retriever tool based on symptoms.
    3. Prompts the DeepSeek-R1 LLM using the retrieved context.
    4. Updates state with the specialist's assessment.
    """
    print("--- [Specialist Agent] Running Phase ---")
    symptoms = ", ".join(state.get("symptoms", [])) or "No specific symptoms recorded."
    severity = state.get("severity", "Unknown")
    missing_info = ", ".join(state.get("missing_info", [])) or "None"
    
    # Optional: We could do a combination of the user's latest query + symptoms, 
    # but for simplicity, we query RAG for the symptoms.
    query_for_rag = f"Guidance and protocols regarding: {symptoms}"
    print(f"--- [Specialist Agent] Retrieving Knowledge for: '{query_for_rag}' ---")
    
    retrieved_context = retrieve_documents(query_for_rag, k=3)
    
    # Format the prompt
    formatted_system_prompt = SPECIALIST_SYSTEM_PROMPT.format(
        symptoms=symptoms,
        severity=severity,
        missing_info=missing_info,
        context=retrieved_context
    )
    
    messages = [
        SystemMessage(content=formatted_system_prompt),
        HumanMessage(content="Please provide your specialized assessment based on the provided symptoms and domain context.")
    ]
    
    print("--- [Specialist Agent] Prompting DeepSeek-R1 on Groq ---")
    llm = get_llm()
    response = llm.invoke(messages)
    
    assessment = response.content
    print("--- [Specialist Agent] Assessment Generated ---")
    
    # Update the state
    state["context"] = retrieved_context
    state["specialist_assessment"] = assessment
    
    # Append the AI message into the master message list if needed by LangGraph
    if "messages" in state:
        state["messages"].append(response)
        
    return state


if __name__ == "__main__":
    # -----------------------------------
    # Standalone Demo / Testing Script
    # -----------------------------------
    print("\n[TEST] Running Specialist Agent Standalone Wrapper\n")
    test_state: PipelineState = {
        "messages": [],
        "symptoms": ["chest pain", "shortness of breath", "mild fever"],
        "severity": "High",
        "missing_info": ["duration of fever", "blood pressure"],
        "context": "",
        "specialist_assessment": "",
        "override_required": False
    }
    
    try:
        updated_state = specialist_node(test_state)
        print("\n================== FINAL ASSESSMENT ==================")
        print(updated_state["specialist_assessment"])
        print("======================================================")
        print("\nRetrieved Context Used:\n", updated_state["context"])
    except Exception as e:
        print(f"\n[ERROR] Test failed: {e}")
        print("Make sure you have GROQ_API_KEY set.")
