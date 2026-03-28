import os
import re
import json
from pathlib import Path
from dotenv import load_dotenv
from groq import Groq
from backend.pipeline.state import PipelineState
from backend.prompts.summary_prompt import SUMMARY_SYSTEM_PROMPT

load_dotenv(Path(__file__).parent.parent / ".env")


def run_summary_agent(state: PipelineState) -> dict:
    """Synchronous summary agent — uses Groq SDK with forced JSON mode."""
    print("[Summary Agent] Running...")

    client = Groq(api_key=os.environ.get("GROQ_API_KEY"))
    model = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")

    urgency_label = "URGENT ESCALATION" if state.is_urgent else f"Level {state.urgency_level}/5"

    user_prompt = (
        f"Patient Complaint (clinical English): {state.clinical_english}\n\n"
        f"Symptoms: {state.symptoms}\n"
        f"Severity: {state.severity}/10\n"
        f"Duration: {state.duration}\n\n"
        f"Potential Conditions: {state.potential_conditions}\n"
        f"Recommended Tests: {state.recommended_tests}\n"
        f"Urgency: {urgency_label}\n"
        f"Evidence Sources: {state.evidence_sources}\n\n"
        f"Safety Flags:\n"
        f"  Is Urgent: {state.is_urgent}\n"
        f"  Red Flags: {state.red_flags}\n"
        f"  Drug Interactions: {state.drug_interactions}\n"
        f"  Override Required: {state.override_required}\n\n"
        f"Target native language for patient note: {state.source_language}\n"
    )

    for attempt in range(2):
        try:
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": SUMMARY_SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.3,
                response_format={"type": "json_object"},
            )

            raw = response.choices[0].message.content
            print(f"  [Summary] LLM response (attempt {attempt + 1}): {raw[:300]}")

            cleaned = re.sub(r"<think>.*?</think>", "", raw, flags=re.DOTALL).strip()
            data = json.loads(cleaned)

            note_en = data.get("referral_note_en", "")
            note_native = data.get("referral_note_native", "")

            if not note_en:
                raise ValueError("referral_note_en is empty in LLM response")

            print(f"  [Summary] OK en={len(note_en)} chars, native={len(note_native)} chars")
            return {
                "referral_note_en": note_en,
                "referral_note_native": note_native,
                "pipeline_status": "complete",
            }

        except json.JSONDecodeError as e:
            if attempt == 0:
                print(f"  [Summary] JSON parse error (attempt 1), retrying: {e}")
                user_prompt += "\n\nRespond with ONLY a valid JSON object."
            else:
                print(f"  [Summary] JSON parse error (attempt 2): {e}")

        except Exception as e:
            print(f"  [Summary] Error: {e}")
            if attempt == 0:
                print("  [Summary] Retrying...")
                continue
            break

    urgency_tag = "URGENT ESCALATION" if state.override_required else "Routine Referral"
    fallback_note = (
        f"# {urgency_tag}\n\n"
        f"**Patient Complaint:** {state.clinical_english}\n"
        f"**Symptoms:** {', '.join(state.symptoms)}\n"
        f"**Severity:** {state.severity}/10\n\n"
        f"**Urgency Level:** {state.urgency_level}/5\n"
        f"**Red Flags:** {', '.join(state.red_flags) if state.red_flags else 'None detected'}\n\n"
        f"---\n"
        f"WARNING: This report is for physician review only. Not an autonomous diagnosis.\n"
        f"*[Auto-generated fallback -- summary agent encountered an error]*"
    )
    return {
        "referral_note_en": fallback_note,
        "referral_note_native": state.clinical_english or "[Translation unavailable]",
        "pipeline_status": "complete",
    }
