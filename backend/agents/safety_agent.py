import os
import json
from pydantic import BaseModel, ValidationError
from typing import List
from openai import AsyncOpenAI
from pipeline.state import PipelineState
from prompts.safety_prompt import SAFETY_SYSTEM_PROMPT


class SafetyOutput(BaseModel):
    is_urgent: bool
    red_flags: List[str]
    drug_interactions: List[str]
    override_required: bool


async def safety_node(state: PipelineState) -> dict:
    print("--- [Safety Node] Start ---")
    print(f"  Symptoms: {state.symptoms}")
    print(f"  Potential Conditions: {state.potential_conditions}")

    client = AsyncOpenAI(
        api_key=os.environ["GROQ_API_KEY"],
        base_url="https://api.groq.com/openai/v1",
    )

    model = os.environ.get("GROQ_MODEL", "deepseek-r1-distill-llama-70b")

    user_prompt = (
        f"Symptoms: {state.symptoms}\n"
        f"Duration: {state.duration}\n"
        f"Severity: {state.severity}/10\n"
        f"Missing Info: {state.missing_info}\n"
        f"Potential Conditions: {state.potential_conditions}\n"
    )

    # --- Attempt 1 ---
    for attempt in range(2):
        try:
            response = await client.chat.completions.create(
                model=model,
                messages=[
                    {"role": "system", "content": SAFETY_SYSTEM_PROMPT},
                    {"role": "user", "content": user_prompt},
                ],
                temperature=0.0,
            )

            raw = response.choices[0].message.content
            print(f"  Raw LLM output (attempt {attempt + 1}):\n{raw}")

            # Strip markdown fences if the model wraps them
            cleaned = raw.strip()
            if cleaned.startswith("```"):
                cleaned = cleaned.split("\n", 1)[1]
            if cleaned.endswith("```"):
                cleaned = cleaned.rsplit("```", 1)[0]
            cleaned = cleaned.strip()

            data = json.loads(cleaned)
            validated = SafetyOutput(**data)

            print(f"  ✅ Safety result: urgent={validated.is_urgent}, flags={validated.red_flags}")
            return {
                "is_urgent": validated.is_urgent,
                "red_flags": validated.red_flags,
                "override_required": validated.override_required,
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

    # Graceful fallback
    return {
        "is_urgent": False,
        "red_flags": [],
        "override_required": False,
    }
