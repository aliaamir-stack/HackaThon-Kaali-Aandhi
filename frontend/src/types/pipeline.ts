// ============================================
// Safety + Summary Agents — Type Definitions
// Person E's pipeline segment
// ============================================


/** Input the safety node receives from the pipeline state */
export interface SafetyInput {
  symptoms: string[];
  severity: number;
  missing_info: string[];
  potential_conditions: string[];
}

/** A single red flag detected by the safety agent */
export interface RedFlag {
  index: number;
  condition: string;
}

/** Full output returned by the safety agent node */
export interface SafetyOutput {
  /** Signals that the safety node has started */
  started: boolean;

  /** Signals that the safety node has finished */
  completed: boolean;

  /** True if a life-threatening condition was detected */
  is_urgent: boolean;

  /** Specific red-flag conditions detected */
  red_flags: string[];

  /** Dangerous drug interactions flagged */
  drug_interactions: string[];

  /** If true, pipeline skips to Summary with URGENT flag */
  override_required: boolean;

  /** Error message if the safety node failed */
  error?: string;
}


/** Input the summary node receives from the pipeline state */
export interface SummaryInput {
  clinical_english: string;
  symptoms: string[];
  severity: number;
  potential_conditions: string[];
  is_urgent: boolean;
  red_flags: string[];
  source_language: string;
}

/** Full output returned by the summary agent node */
export interface SummaryOutput {
  /** Signals that the summary node has started */
  started: boolean;

  /** Signals that the summary node has finished */
  completed: boolean;

  /** Final referral note in English (Markdown) */
  referral_note_en: string;

  /** Back-translated referral note in patient's language */
  referral_note_native: string;

  /** Error message if the summary node failed */
  error?: string;
}
