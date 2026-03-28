import type { PipelineResponse } from "./types";

function str(v: unknown, fallback = ""): string {
  if (v === null || v === undefined) return fallback;
  return String(v);
}

function num(v: unknown, fallback: number): number {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function bool(v: unknown, fallback: boolean): boolean {
  return typeof v === "boolean" ? v : fallback;
}

function strArr(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x));
}

function nullableStr(v: unknown): string | null {
  if (v === null) return null;
  if (v === undefined) return null;
  return String(v);
}

/**
 * Coerce backend JSON into PipelineResponse (tolerant of partial payloads).
 */
export function coercePipelineResponse(
  input: Record<string, unknown>
): PipelineResponse {
  return {
    pipeline_status: str(input.pipeline_status, "unknown"),
    raw_transcript: str(input.raw_transcript),
    source_language: str(input.source_language),
    clinical_english: str(input.clinical_english),
    symptoms: strArr(input.symptoms),
    duration: str(input.duration),
    severity: num(input.severity, 0),
    missing_info: strArr(input.missing_info),
    potential_conditions: strArr(input.potential_conditions),
    urgency_level: num(input.urgency_level, 1),
    recommended_tests: strArr(input.recommended_tests),
    evidence_sources: strArr(input.evidence_sources),
    is_urgent: bool(input.is_urgent, false),
    red_flags: strArr(input.red_flags),
    drug_interactions: strArr(input.drug_interactions),
    override_required: bool(input.override_required, false),
    referral_note_en: str(input.referral_note_en),
    referral_note_native: str(input.referral_note_native),
    error_message: nullableStr(input.error_message),
  };
}
