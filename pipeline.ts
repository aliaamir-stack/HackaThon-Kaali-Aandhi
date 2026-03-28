/**
 * pipeline.ts
 * TypeScript types for the POST /run-pipeline API response.
 * Mirrors backend/pipeline/state.py (PipelineState Pydantic model).
 */

// ── Severity ─────────────────────────────────────────────────────────────────

export type Severity = "low" | "medium" | "high" | "critical" | "unknown";

// ── Sub-shapes ────────────────────────────────────────────────────────────────

/** Output of tools/transcriber.py */
export interface TranscriptionResult {
  /** Raw transcript text from Whisper or user text input */
  transcript: string;
  /** ISO-639-1 language code as detected by Whisper (e.g. "en", "ur") */
  detected_language: string;
  /** Audio duration in seconds — null for text input */
  audio_duration: number | null;
}

/** Output of agents/localization_agent.py */
export interface LocalizationResult {
  /** Full language name in English (e.g. "Urdu", "Arabic") */
  confirmed_language: string;
  /** ISO-639-1 code after confirmation (e.g. "ur", "ar") */
  language_code: string;
  /** Patient description translated to English */
  english_transcript: string;
  /** True if a translation was performed */
  was_translated: boolean;
  /** Comma-separated list of flagged ambiguous medical terms */
  translation_notes: string;
}

/** Output of agents/triage_agent.py */
export interface TriageResult {
  /** Extracted symptoms with descriptors (e.g. "severe headache for 3 days") */
  symptoms: string[];
  /** Clinical urgency level */
  severity: Severity;
  /** Clinically important details the patient did not mention */
  missing_info: string[];
  /** 2–4 sentence clinical summary for the attending physician */
  triage_summary: string;
}

/** Output of agents/specialist_agent.py (Person D) */
export interface SpecialistResult {
  /** RAG-enriched specialist analysis */
  specialist_findings: string;
  /** Source chunks retrieved from the knowledge base */
  retrieved_chunks: string[];
}

/** Output of agents/safety_agent.py (Person E) */
export interface SafetyResult {
  /** Detected safety red flags */
  red_flags: string[];
  /** True if a human clinician override is mandatory */
  override_required: boolean;
}

/** Output of agents/summary_agent.py (Person E) */
export interface SummaryResult {
  /** Final Markdown-formatted referral note for the clinician */
  referral_note: string;
}

// ── Full API Response ─────────────────────────────────────────────────────────

/**
 * Full response shape from POST /run-pipeline.
 * All fields are present; agents that haven't run yet return empty defaults.
 */
export interface PipelineResponse
  extends TranscriptionResult,
    LocalizationResult,
    TriageResult,
    SpecialistResult,
    SafetyResult,
    SummaryResult {
  /** Set to an error message string if any pipeline node failed, otherwise null */
  pipeline_error: string | null;
}

// ── Request shape ─────────────────────────────────────────────────────────────

/**
 * Body sent to POST /run-pipeline.
 * Use FormData — send either audio_file OR text_input, not both.
 *
 * @example
 * const form = new FormData();
 * form.append("audio_file", file);          // audio upload
 * // OR
 * form.append("text_input", "I have ...");  // plain text
 * fetch("/run-pipeline", { method: "POST", body: form });
 */
export interface PipelineRequest {
  /** Audio file (mp3, wav, m4a, webm, ogg, flac — max 25 MB) */
  audio_file?: File;
  /** Direct text input (used when no audio is provided) */
  text_input?: string;
}

// ── Utility types ─────────────────────────────────────────────────────────────

/** Severity levels ordered from least to most urgent */
export const SEVERITY_ORDER: Severity[] = [
  "unknown",
  "low",
  "medium",
  "high",
  "critical",
];

/** Returns true if the severity requires immediate attention */
export const isUrgent = (severity: Severity): boolean =>
  severity === "high" || severity === "critical";
