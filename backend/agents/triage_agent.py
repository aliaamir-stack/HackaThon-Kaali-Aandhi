"""
agents/triage_agent.py
Medical triage agent — extracts symptoms, severity, and missing info.
Model: DeepSeek-R1-Distill-Llama-70B on Groq.
Person C — Arsal
"""

import json
import logging
import os
import re

from groq import Groq

from pipeline.state import PipelineState
from prompts.triage_prompt import TRIAGE_SYSTEM_PROMPT, build_triage_user_prompt

logger = logging.getLogger(__name__)

# Client initialized inside function

VALID_SEVERITY_LEVELS = {"low", "medium", "high", "critical"}


def _strip_reasoning_and_parse(content: str) -> dict:
    """
    DeepSeek-R1 wraps its chain-of-thought in <think>...</think> before
    emitting the JSON answer. Strip that block first, then parse.

    Falls back to a regex search for the first {...} block if direct
    JSON parsing fails after stripping.
    """
    # Remove <think>...</think> block (may be multi-line)
    cleaned = re.sub(r"<think>.*?</think>", "", content, flags=re.DOTALL).strip()

    # Attempt 1: direct parse
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        pass

    # Attempt 2: pull first JSON object out of the response
    match = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            pass

    raise ValueError(
        f"Could not extract valid JSON from DeepSeek-R1 response "
        f"(first 400 chars):\n{cleaned[:400]}"
    )


def triage_agent(state: PipelineState) -> PipelineState:
    """
    LangGraph node: Triage Agent.

    Reads:
        state.english_transcript  — English patient description (from localization_agent)
        state.transcript          — fallback if english_transcript is absent

    Writes:
        state.symptoms     — list[str]  e.g. ["severe headache for 3 days", "nausea"]
        state.severity     — str        one of: "low" | "medium" | "high" | "critical"
        state.missing_info — list[str]  clinically important details not mentioned
        state.triage_summary — str      2–4 sentence clinical summary
    """
    english_text: str = (
        getattr(state, "english_transcript", None) or state.transcript
    )

    try:
        client = Groq(api_key=os.environ.get("GROQ_API_KEY"))
        response = client.chat.completions.create(
            model="deepseek-r1-distill-llama-70b",
            messages=[
                {"role": "system", "content": TRIAGE_SYSTEM_PROMPT},
                {"role": "user", "content": build_triage_user_prompt(english_text)},
            ],
            temperature=0.2,
            max_tokens=4096,
            # NOTE: DeepSeek-R1 on Groq does NOT support response_format=json_object
            # — we parse the JSON manually from the response text.
        )

        raw_content: str = response.choices[0].message.content
        result = _strip_reasoning_and_parse(raw_content)

        raw_severity = str(result.get("severity", "medium")).lower().strip()
        severity = raw_severity if raw_severity in VALID_SEVERITY_LEVELS else "medium"

        state.symptoms = [str(s) for s in result.get("symptoms", [])]
        state.severity = severity
        state.missing_info = [str(m) for m in result.get("missing_info", [])]
        state.triage_summary = str(result.get("triage_summary", ""))

        logger.info(
            "Triage complete | severity=%s | symptoms=%d | missing_info=%d",
            state.severity,
            len(state.symptoms),
            len(state.missing_info),
        )

    except Exception as exc:
        logger.error("Triage agent error: %s", exc, exc_info=True)
        # Conservative fallback — escalate to medium so no case is silently dropped
        state.symptoms = []
        state.severity = "medium"
        state.missing_info = ["Automated triage failed — manual clinical review required"]
        state.triage_summary = f"[triage_agent error: {exc}]"

    return state
