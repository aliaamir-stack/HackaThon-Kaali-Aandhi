"""
tools/transcriber.py
Transcribes audio files using Groq's Whisper large-v3 API.
Person C — Arsal
"""

import os
import logging
from pathlib import Path

from groq import Groq

logger = logging.getLogger(__name__)

client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

SUPPORTED_FORMATS = {".mp3", ".mp4", ".mpeg", ".mpga", ".m4a", ".wav", ".webm", ".ogg", ".flac"}

# Groq Whisper max file size: 25 MB
MAX_FILE_SIZE_MB = 25


def transcribe_audio(audio_file_path: str, language: str | None = None) -> dict:
    """
    Transcribe an audio file using Groq Whisper large-v3.

    Args:
        audio_file_path: Absolute or relative path to the audio file.
        language:        Optional BCP-47 language hint (e.g. "en", "es", "ur", "ar").
                         Leave None to let Whisper auto-detect.

    Returns:
        {
            "text":               str,         # full transcript
            "detected_language":  str,         # ISO-639-1 code from Whisper
            "duration":           float|None,  # audio length in seconds
            "segments":           list,        # word/segment objects (if returned)
        }

    Raises:
        FileNotFoundError: audio file path does not exist.
        ValueError:        unsupported format or file too large.
    """
    path = Path(audio_file_path)

    if not path.exists():
        raise FileNotFoundError(f"Audio file not found: {audio_file_path}")

    suffix = path.suffix.lower()
    if suffix not in SUPPORTED_FORMATS:
        raise ValueError(
            f"Unsupported audio format '{suffix}'. "
            f"Supported formats: {sorted(SUPPORTED_FORMATS)}"
        )

    file_size_mb = path.stat().st_size / (1024 * 1024)
    if file_size_mb > MAX_FILE_SIZE_MB:
        raise ValueError(
            f"File too large ({file_size_mb:.1f} MB). "
            f"Groq Whisper limit is {MAX_FILE_SIZE_MB} MB."
        )

    logger.info("Transcribing '%s' (%.1f MB, language hint=%s)", path.name, file_size_mb, language)

    with open(audio_file_path, "rb") as audio_file:
        kwargs: dict = {
            "file": (path.name, audio_file),
            "model": "whisper-large-v3",
            "response_format": "verbose_json",
            "temperature": 0,  # deterministic output
            # Domain hint improves accuracy for medical speech
            "prompt": "Patient describing medical symptoms and health concerns.",
        }
        if language:
            kwargs["language"] = language

        transcription = client.audio.transcriptions.create(**kwargs)

    result = {
        "text": transcription.text.strip(),
        "detected_language": getattr(transcription, "language", "unknown"),
        "duration": getattr(transcription, "duration", None),
        "segments": getattr(transcription, "segments", []),
    }

    logger.info(
        "Transcription complete | lang=%s | duration=%.1fs | chars=%d",
        result["detected_language"],
        result["duration"] or 0,
        len(result["text"]),
    )
    return result


def transcribe_text_input(text: str) -> dict:
    """
    Pass-through for plain-text input (no audio transcription needed).
    Use this when the user types or pastes their symptoms directly.

    Returns the same dict shape as transcribe_audio() so downstream agents
    always receive a consistent interface.
    """
    return {
        "text": text.strip(),
        "detected_language": "unknown",
        "duration": None,
        "segments": [],
    }
