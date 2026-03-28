/**
 * pipeline.ts — Single source of truth for all API types
 * =======================================================
 * Mirrors backend/main.py request/response models EXACTLY.
 * Any field added to PipelineResponse in Python must be added here too.
 *
 * Merged from: Arsal (Person C), Mikail (Person D), Xajnan (Person E)
 */

// ══════════════════════════════════════════════════════════════════════════════
// API REQUEST TYPES — what the frontend sends
// ══════════════════════════════════════════════════════════════════════════════

/**
 * POST /run-pipeline — multipart/form-data
 *
 * Usage:
 *   const form = new FormData();
 *   form.append("audio", file);
 *   form.append("language", "urdu");
 *   fetch("/run-pipeline", { method: "POST", body: form });
 */
export interface AudioPipelineRequest {
  audio: File;
  language: string;
}

/**
 * POST /run-text — JSON body (skips Whisper, goes straight to Localization)
 *
 * Usage:
 *   fetch("/run-text", {
 *     method: "POST",
 *     headers: { "Content-Type": "application/json" },
 *     body: JSON.stringify({ text: "...", language: "urdu" }),
 *   });
 */
export interface TextPipelineRequest {
  text: string;
  language: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// API RESPONSE TYPE — what the backend returns (identical for both endpoints)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Canonical response from BOTH /run-pipeline and /run-text.
 * Mirrors PipelineResponse in backend/main.py field-for-field.
 *
 * Every field listed here is GUARANTEED to be present in the JSON response.
 */
export interface PipelineResponse {
  /** "pending" | "running" | "complete" | "error" */
  pipeline_status: string;

  /** Raw Whisper output or the text input that was sent */
  raw_transcript: string;

  /** Language detected/confirmed by the pipeline (e.g. "Urdu", "Hindi") */
  source_language: string;

  /** Patient complaint translated to clinical English */
  clinical_english: string;

  /** Symptoms extracted by triage (e.g. "severe chest pain, started 1 hour ago") */
  symptoms: string[];

  /** Duration string from triage (may be empty) */
  duration: string;

  /** Severity score 0-10 from triage */
  severity: number;

  /** Clinical info the patient didn't provide (e.g. "fever temperature reading") */
  missing_info: string[];

  /** Specialist assessment — may contain Markdown */
  potential_conditions: string[];

  /** Clinical urgency 1 (routine) to 5 (emergency) */
  urgency_level: number;

  /** Suggested diagnostic tests */
  recommended_tests: string[];

  /** RAG source references used by specialist */
  evidence_sources: string[];

  /** true if Safety Agent detected a life-threatening condition */
  is_urgent: boolean;

  /** Specific red-flag conditions (e.g. "Chest pain", "Severe shortness of breath") */
  red_flags: string[];

  /** Dangerous drug interactions detected (if any) */
  drug_interactions: string[];

  /** true if Safety Agent forced an urgent escalation */
  override_required: boolean;

  /** Final referral note in English (Markdown) */
  referral_note_en: string;

  /** Back-translated referral note in patient's language */
  referral_note_native: string;

  /** Error details if pipeline_status === "error", otherwise null */
  error_message: string | null;
}

// ══════════════════════════════════════════════════════════════════════════════
// PER-AGENT TYPES — internal agent I/O (for debugging / advanced UI)
// ══════════════════════════════════════════════════════════════════════════════

/** Specialist agent input (Person D — Mikail) */
export interface SpecialistInput {
  symptoms: string[];
  severity: "Low" | "Medium" | "High" | "Critical";
  missing_info: string[];
}

/** RAG-retrieved document chunk (Person D — Mikail) */
export interface RetrievedChunk {
  index: number;
  content: string;
}

/** RAG retriever output (Person D — Mikail) */
export interface RAGResult {
  query: string;
  chunks: RetrievedChunk[];
  raw_context: string;
}

/** Specialist agent output (Person D — Mikail) */
export interface SpecialistOutput {
  started: boolean;
  completed: boolean;
  context: string;
  specialist_assessment: string;
  error?: string;
}

/** Safety agent input (Person E — Xajnan) */
export interface SafetyInput {
  symptoms: string[];
  severity: number;
  missing_info: string[];
  potential_conditions: string[];
}

/** Safety agent output (Person E — Xajnan) */
export interface SafetyOutput {
  started: boolean;
  completed: boolean;
  is_urgent: boolean;
  red_flags: string[];
  drug_interactions: string[];
  override_required: boolean;
  error?: string;
}

/** Summary agent input (Person E — Xajnan) */
export interface SummaryInput {
  clinical_english: string;
  symptoms: string[];
  severity: number;
  potential_conditions: string[];
  is_urgent: boolean;
  red_flags: string[];
  source_language: string;
}

/** Summary agent output (Person E — Xajnan) */
export interface SummaryOutput {
  started: boolean;
  completed: boolean;
  referral_note_en: string;
  referral_note_native: string;
  error?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// FRONTEND UI TYPES — for the animated pipeline visualization
// ══════════════════════════════════════════════════════════════════════════════

export type AgentStatus = "idle" | "active" | "complete" | "error";

export type PipelineStage =
  | "transcription"
  | "localization"
  | "triage"
  | "specialist"
  | "safety"
  | "summary"
  | "done"
  | "error";

/** Tracks which agent nodes are active in the animated pipeline UI */
export interface AgentState {
  transcription: AgentStatus;
  localization: AgentStatus;
  triage: AgentStatus;
  specialist: AgentStatus;
  safety: AgentStatus;
  summary: AgentStatus;
}

/**
 * camelCase version of PipelineResponse for React component props.
 * Use mapResponseToResult() to convert.
 */
export interface PipelineResult {
  rawTranscript: string;
  clinicalEnglish: string;
  symptoms: string[];
  duration: string;
  severity: number;
  potentialConditions: string[];
  urgencyLevel: number;
  recommendedTests: string[];
  evidenceSources: string[];
  missingInfo: string[];
  redFlags: string[];
  drugInteractions: string[];
  referralNoteEn: string;
  referralNoteNative: string;
  isUrgent: boolean;
  overrideRequired: boolean;
  sourceLanguage: string;
  pipelineStatus: string;
  errorMessage: string | null;
}

// ══════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ══════════════════════════════════════════════════════════════════════════════

/** Supported languages for the dropdown */
export const SUPPORTED_LANGUAGES = [
  { code: "urdu", label: "Urdu" },
  { code: "sindhi", label: "Sindhi" },
  { code: "pashto", label: "Pashto" },
  { code: "punjabi", label: "Punjabi" },
  { code: "english", label: "English" },
  { code: "other", label: "Other" },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]["code"];

/** Convert snake_case API response to camelCase PipelineResult for React */
export function mapResponseToResult(r: PipelineResponse): PipelineResult {
  return {
    rawTranscript: r.raw_transcript,
    clinicalEnglish: r.clinical_english,
    symptoms: r.symptoms,
    duration: r.duration,
    severity: r.severity,
    potentialConditions: r.potential_conditions,
    urgencyLevel: r.urgency_level,
    recommendedTests: r.recommended_tests,
    evidenceSources: r.evidence_sources,
    missingInfo: r.missing_info,
    redFlags: r.red_flags,
    drugInteractions: r.drug_interactions,
    referralNoteEn: r.referral_note_en,
    referralNoteNative: r.referral_note_native,
    isUrgent: r.is_urgent,
    overrideRequired: r.override_required,
    sourceLanguage: r.source_language,
    pipelineStatus: r.pipeline_status,
    errorMessage: r.error_message,
  };
}
