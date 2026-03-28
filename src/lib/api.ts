import { coercePipelineResponse } from "./coerce-pipeline-response";
import type {
  AnalyzeSuccessResponse,
  InputMode,
  PipelineAgentStep,
} from "./types";

const API_URL =
  typeof process !== "undefined"
    ? process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? ""
    : "";

/** When `"true"`, skip the network and return a local demo payload (no API_URL needed). */
const USE_MOCK =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_USE_MOCK === "true";

const RUN_PIPELINE_PATH =
  (typeof process !== "undefined" &&
    process.env.NEXT_PUBLIC_RUN_PIPELINE_PATH?.replace(/\/$/, "")) ||
  "/run-pipeline";

function buildSyntheticPipeline(): PipelineAgentStep[] {
  const now = Date.now();
  const span = (offset: number, dur: number) => ({
    startedAt: new Date(now + offset).toISOString(),
    endedAt: new Date(now + offset + dur).toISOString(),
  });
  return [
    {
      id: "trigger",
      label: "TRIGGER: Audio Upload",
      detail: "Health worker uploads voice file via web UI.",
      ...span(0, 350),
    },
    {
      id: "orchestrator",
      label: "ORCHESTRATOR: LangGraph",
      detail: "State JSON + conditional routing between agents.",
      ...span(400, 500),
    },
    {
      id: "localization",
      label: "AGENT 1: Localization",
      detail: "Whisper → clinical English via Llama.",
      ...span(950, 800),
    },
    {
      id: "triage",
      label: "AGENT 2: Triage",
      detail: "Structured symptoms + missing context flags.",
      ...span(1800, 900),
    },
    {
      id: "specialist",
      label: "AGENT 3: Specialist",
      detail: "WHO/CDC RAG cross-reference.",
      ...span(1900, 1100),
    },
    {
      id: "safety",
      label: "Safety Agent (parallel observer)",
      detail: "Monitors triage + specialist outputs.",
      ...span(2000, 1000),
    },
    {
      id: "summary",
      label: "AGENT 5: Summary",
      detail: "Referral note + back-translation.",
      ...span(2900, 650),
    },
  ];
}

function mockPipelinePayload(): AnalyzeSuccessResponse {
  const base = coercePipelineResponse({
    pipeline_status: "complete",
    raw_transcript: "Demo transcript (NEXT_PUBLIC_USE_MOCK=true).",
    source_language: "Urdu",
    clinical_english:
      "Patient reports cough and low-grade fever for two days (demo).",
    symptoms: ["Productive cough", "Low-grade fever", "Fatigue"],
    duration: "2 days",
    severity: 4,
    missing_info: ["SpO₂", "Chest X-ray"],
    potential_conditions: [
      "Consider **viral URI** vs early **pneumonia** if hypoxic.",
    ],
    urgency_level: 2,
    recommended_tests: ["Vitals", "SpO₂", "CXR if indicated"],
    evidence_sources: ["Demo guideline reference"],
    is_urgent: false,
    red_flags: [],
    drug_interactions: [],
    override_required: false,
    referral_note_en: "## Demo\n\nOutpatient follow-up; return if worsening.",
    referral_note_native: "ڈیمو: علاج جاری رکھیں۔",
    error_message: null,
  });
  return {
    ...base,
    pipeline: buildSyntheticPipeline(),
    urgentEscalation: false,
  };
}

function parseJsonBody(raw: unknown): AnalyzeSuccessResponse {
  if (!raw || typeof raw !== "object") {
    throw new Error("API returned empty or non-object JSON");
  }
  const body = raw as Record<string, unknown>;
  const pipeline = Array.isArray(body.pipeline)
    ? (body.pipeline as PipelineAgentStep[])
    : buildSyntheticPipeline();

  const core = coercePipelineResponse(body);
  return {
    ...core,
    pipeline,
    urgentEscalation:
      typeof body.urgentEscalation === "boolean"
        ? body.urgentEscalation
        : undefined,
  };
}

/**
 * POST multipart to `{NEXT_PUBLIC_API_URL}{NEXT_PUBLIC_RUN_PIPELINE_PATH}` (default `/run-pipeline`).
 * - **audio** mode: `audio` + `language`
 * - **image** mode: `image` + `language` (same route; align field name with your FastAPI model)
 */
export async function submitForAnalysis(
  file: File,
  mode: InputMode,
  language: string
): Promise<AnalyzeSuccessResponse> {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 400));
    return mockPipelinePayload();
  }

  if (!API_URL) {
    throw new Error(
      "Missing NEXT_PUBLIC_API_URL. Add it to .env.local or set NEXT_PUBLIC_USE_MOCK=true for demo data."
    );
  }

  const form = new FormData();
  if (mode === "audio") {
    form.append("audio", file);
  } else {
    form.append("image", file);
  }
  form.append("language", language);

  const url = `${API_URL}${RUN_PIPELINE_PATH.startsWith("/") ? "" : "/"}${RUN_PIPELINE_PATH}`;
  const res = await fetch(url, {
    method: "POST",
    body: form,
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(text || `Request failed (${res.status})`);
  }

  let json: unknown;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new Error("API did not return valid JSON");
  }

  return parseJsonBody(json);
}
