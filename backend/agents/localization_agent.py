"""
agents/localization_agent.py
Detects the language of the patient transcript and translates it to English.
Model: Llama-3.1-8B-Instant on Groq.
Person C — Arsal
"""

import json
import logging
import os

from groq import Groq

from pipeline.state import PipelineState

logger = logging.getLogger(__name__)

client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

_SYSTEM_PROMPT = """You are a precise medical language localization assistant integrated into a clinical decision-support system.

Your responsibilities:
1. Confirm or correct the language detected by the speech-to-text system.
2. Translate the transcript to English if it is not already in English.
3. Preserve ALL medical terminology, symptom descriptions, durations, and clinical details with exact fidelity.
4. Never add, remove, paraphrase, or interpret clinical content.

Always respond with a single, valid JSON object. No prose outside the JSON."""


def localization_agent(state: PipelineState) -> PipelineState:
    """
    LangGraph node: Localization Agent.

    Reads:
        state.transcript         — raw text from Whisper (or user input)
        state.detected_language  — ISO-639-1 code hint from Whisper (may be "unknown")

    Writes:
        state.confirmed_language  — full language name in English (e.g. "Urdu")
        state.language_code       — ISO-639-1 code (e.g. "ur")
        state.english_transcript  — English version of the transcript
        state.was_translated      — True if a translation was performed
        state.translation_notes   — flagged ambiguous/uncertain medical terms
    """
    transcript: str = state.transcript
    detected_hint: str = getattr(state, "detected_language", "unknown") or "unknown"

    user_message = f"""Medical transcript to localise:

\"\"\"
{transcript}
\"\"\"

Language hint from speech-to-text (may be inaccurate): {detected_hint}

Return a JSON object with EXACTLY these keys:
{{
  "confirmed_language": "<full language name in English, e.g. Urdu, Arabic, Spanish>",
  "language_code": "<ISO 639-1 two-letter code, e.g. ur, ar, es>",
  "english_text": "<complete English translation — identical to input if already in English>",
  "was_translated": <true if translation was performed, false otherwise>,
  "translation_notes": "<comma-separated list of ambiguous or uncertain medical terms, or empty string>"
}}"""

    try:
        response = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
            temperature=0.1,
            max_tokens=2048,
            response_format={"type": "json_object"},
        )

        result: dict = json.loads(response.choices[0].message.content)

        state.confirmed_language = result.get("confirmed_language", detected_hint)
        state.language_code = result.get("language_code", "en")
        state.english_transcript = result.get("english_text", transcript)
        state.was_translated = bool(result.get("was_translated", False))
        state.translation_notes = result.get("translation_notes", "")

        logger.info(
            "Localization complete | language=%s (%s) | translated=%s",
            state.confirmed_language,
            state.language_code,
            state.was_translated,
        )

    except (json.JSONDecodeError, KeyError, Exception) as exc:
        logger.error("Localization agent error: %s", exc, exc_info=True)
        # Safe fallback: treat as English, pass transcript through unchanged
        state.confirmed_language = detected_hint
        state.language_code = "en"
        state.english_transcript = transcript
        state.was_translated = False
        state.translation_notes = f"[localization_agent error: {exc}]"

    return state
