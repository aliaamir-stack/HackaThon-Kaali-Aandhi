// ============================================
// Pipeline API Response Types
// Maps to backend PipelineState + control flags
// ============================================

/** Individual message in the pipeline conversation */
export interface PipelineMessage {
  role: "human" | "ai" | "system";
  content: string;
  timestamp?: string;
}

/** The full response returned by POST /run-pipeline */
export interface PipelineResponse {
  /** Signals that the pipeline has started processing */
  started: boolean;

  /** Signals that the pipeline has finished all stages */
  completed: boolean;

  /** Current stage the pipeline is on (useful for progress tracking) */
  current_stage:
  | "transcription"
  | "localization"
  | "triage"
  | "safety"
  | "specialist"
  | "summary"
  | "done"
  | "error";

  /** Raw transcript from audio input */
  transcript: string;

  /** English-localized version of transcript */
  localized_text: string;

  /** Symptoms extracted by the triage agent */
  symptoms: string[];

  /** Severity level assigned by triage */
  severity: "Low" | "Medium" | "High" | "Critical";

  /** Information the triage agent flagged as missing */
  missing_info: string[];

  /** Whether the safety agent flagged a life-threatening situation */
  override_required: boolean;

  /** RAG-retrieved medical context used by specialist */
  context: string;

  /** The specialist agent's full clinical assessment (Markdown) */
  specialist_assessment: string;

  /** Final compiled referral note (Markdown) */
  final_summary: string;

  /** Conversation message history */
  messages: PipelineMessage[];

  /** Error message if pipeline failed at any stage */
  error?: string;
}

/** Request payload for POST /run-pipeline */
export interface PipelineRequest {
  /** Base64-encoded audio file OR plain text input */
  input: string;

  /** Whether the input is audio or text */
  input_type: "audio" | "text";

  /** Optional filename for audio uploads */
  filename?: string;
}

/** Lightweight status check response */
export interface PipelineStatus {
  started: boolean;
  completed: boolean;
  current_stage: PipelineResponse["current_stage"];
}
