import os
import re
import json
from pathlib import Path
from dotenv import load_dotenv
from groq import Groq
from backend.pipeline.state import PipelineState
from backend.prompts.safety_prompt import SAFETY_SYSTEM_PROMPT

load_dotenv(Path(__file__).parent.parent / ".env")


def run_safety_agent(state: PipelineState) -> dict:
    """Synchronous safety agent — uses Groq SDK with forced JSON mode."""
    print("[Safety Agent] Running...")

    client = Groq(api_key=os.environ.get("GROQ_API_KEY"))
    model = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")

    user_prompt = (
        f"Symptoms: {state.symptoms}\n"
        f"Duration: {state.duration}\n"
        f"Severity: {state.severity}/10\n"
        f"Missing Info: {state.missing_info}\n"
        f"Potential Conditions: {state.potential_conditions}\n"
    )

    for attempt in range(2):
        try:
            response = client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": SAFETY_SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.0,
                response_format={"type": "json_object"},
            )

            raw = response.choices[0].message.content
            print(f"  [Safety] LLM response (attempt {attempt + 1}): {raw[:300]}")

            cleaned = re.sub(r"<think>.*?</think>", "", raw, flags=re.DOTALL).strip()
            data = json.loads(cleaned)

            result = {
                "is_urgent": bool(data.get("is_urgent", False)),
                "red_flags": [str(f) for f in data.get("red_flags", [])],
                "drug_interactions": [str(d) for d in data.get("drug_interactions", [])],
                "override_required": bool(data.get("override_required", False)),
            }
            print(f"  [Safety] OK urgent={result['is_urgent']}, flags={result['red_flags']}")
            return result

        except json.JSONDecodeError as e:
            if attempt == 0:
                print(f"  [Safety] JSON parse error (attempt 1), retrying: {e}")
                user_prompt += "\n\nRespond with ONLY a valid JSON object."
            else:
                print(f"  [Safety] JSON parse error (attempt 2): {e}")

        except Exception as e:
            print(f"  [Safety] API error: {e}")
            break

    urgent_keywords = {"chest pain", "difficulty breathing", "stroke", "seizure", "unconscious"}
    symptoms_text = " ".join(state.symptoms).lower() if state.symptoms else ""
    is_urgent = any(kw in symptoms_text for kw in urgent_keywords)
    return {
        "is_urgent": is_urgent,
        "red_flags": ["Safety agent fallback triggered"] if is_urgent else [],
        "drug_interactions": [],
        "override_required": is_urgent,
    }
