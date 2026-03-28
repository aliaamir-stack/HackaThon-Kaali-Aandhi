import os
import json
from pydantic import BaseModel, ValidationError
from openai import AsyncOpenAI
from pipeline.state import PipelineState
from prompts.summary_prompt import SUMMARY_SYSTEM_PROMPT


class SummaryOutput(BaseModel):
    referral_note_en: str
    referral_note_native: str


async def summary_node(state: PipelineState) -> dict:
    print("--- [Summary Node] Start ---")

    client = AsyncOpenAI(
        api_key=os.environ["GROQ_API_KEY"],
        base_url="https://api.groq.com/openai/v1",
    )

    model = os.environ.get("GROQ_MODEL", "deepseek-r1-distill-llama-70b")

    urgency_label = "🚨 URGENT ESCALATION" if state.is_urgent else f"Level {state.urgency_level}/5"

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
            response = await client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": SUMMARY_SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.3,
            )

            raw = response.choices[0].message.content
            print(f"  Raw LLM output (attempt {attempt + 1}, first 200 chars):\n{raw[:200]}")

            # Strip markdown fences
            cleaned = raw.strip()
            if cleaned.startswith("```"):
                cleaned = cleaned.split("\n", 1)[1]
            if cleaned.endswith("```"):
                cleaned = cleaned.rsplit("```", 1)[0]
            cleaned = cleaned.strip()

            data = json.loads(cleaned)
            validated = SummaryOutput(**data)

            print("  ✅ Summary generated successfully")
            return {
                "referral_note_en": validated.referral_note_en,
                "referral_note_native": validated.referral_note_native,
                "pipeline_status": "complete",
            }

        except (json.JSONDecodeError, ValidationError) as e:
            if attempt == 0:
                print(f"  ⚠ Parse error (attempt 1), retrying: {e}")
                user_prompt += (
                    "\n\nYour previous response was not valid JSON. "
                    "Please reply with ONLY the JSON object, no markdown."
                )
            else:
                print(f"  ❌ Parse error (attempt 2), failing gracefully: {e}")

        except Exception as e:
            print(f"  ❌ API error: {e}")
            break

    return {
        "referral_note_en": "Error: Unable to generate referral note.",
        "referral_note_native": "Error: Unable to generate referral note.",
        "pipeline_status": "error",
    }
