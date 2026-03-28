// ============================================
// Person C — Input Pipeline Types (Arsal)
// Transcription → Localization → Triage
// Maps to: tools/transcriber.py
//          agents/localization_agent.py
//          agents/triage_agent.py
// ============================================

// ── Stages owned by Person C ──────────────────

export type PersonCStage =
  | "transcription"
  | "localization"
  | "triage"
  | "done"
  | "error";

// ── Transcription ─────────────────────────────
// Source: tools/transcriber.py (Groq Whisper large-v3)

export interface TranscriptionResult {
  /** Raw transcript text produced by Whisper or passed through from text input */
  transcript: string;

  /** ISO-639-1 language code detected by Whisper (e.g. "en", "ur", "ar") */
  detected_language: string;

  /** Audio duration in seconds — null when input is plain text */
  audio_duration: number | null;
}

// ── Localization ──────────────────────────────
// Source: agents/localization_agent.py (Llama-3.1-8B on Groq)

export interface LocalizationResult {
  /** Full language name in English (e.g. "Urdu", "Arabic", "Spanish") */
  confirmed_language: string;

  /** ISO-639-1 code after confirmation (e.g. "ur", "ar", "es") */
  language_code: string;

  /** Transcript translated to English — identical to transcript if already English */
  localized_text: string;

  /** True if a translation was performed */
  was_translated: boolean;

  /** Comma-separated list of ambiguous or uncertain medical terms flagged during translation */
  translation_notes: string;
}

// ── Triage ────────────────────────────────────
// Source: agents/triage_agent.py (DeepSeek-R1-Distill-Llama-70B on Groq)

export interface TriageResult {
  /** Symptoms extracted from the patient description with onset/duration descriptors */
  symptoms: string[];

  /** Clinical urgency level assigned by the triage agent */
  severity: "Low" | "Medium" | "High" | "Critical";

  /** Clinically important details the patient did not mention */
  missing_info: string[];

  /** 2–4 sentence clinical summary for the attending physician */
  triage_summary: string;
}

// ── Stage Flags ───────────────────────────────
// Granular start/end signals for each of Person C's three stages

export interface PersonCStageFlags {
  /** Signals the overall Person C pipeline segment has started */
  started: boolean;

  /** Signals the overall Person C pipeline segment has finished */
  completed: boolean;

  // Transcription
  transcription_started: boolean;
  transcription_completed: boolean;

  // Localization
  localization_started: boolean;
  localization_completed: boolean;

  // Triage
  triage_started: boolean;
  triage_completed: boolean;
}

// ── Full Person C Response ────────────────────
// Combined output of all three Person C agents

export interface PersonCResponse
  extends TranscriptionResult,
    LocalizationResult,
    TriageResult,
    PersonCStageFlags {
  /** Current stage Person C's pipeline is processing */
  current_stage: PersonCStage;

  /** Error message if any stage failed — undefined on success */
  error?: string;
}

// ── Request ───────────────────────────────────

export interface PersonCRequest {
  /** Base64-encoded audio file OR plain text symptom description */
  input: string;

  /** Whether the input is an audio file or direct text */
  input_type: "audio" | "text";

  /** Original filename — required when input_type is "audio" */
  filename?: string;
}

// ── Status ────────────────────────────────────

export interface PersonCStatus extends PersonCStageFlags {
  current_stage: PersonCStage;
}
