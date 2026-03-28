/** Canonical ids for the LangGraph-style pipeline UI (match backend `pipeline[].id` or aliases). */
export const PIPELINE_MAIN_IDS = [
  "trigger",
  "orchestrator",
  "localization",
  "triage",
  "specialist",
  "summary",
] as const;

export type PipelineMainId = (typeof PIPELINE_MAIN_IDS)[number];

/** Map legacy / alternate backend ids to a main card id. */
const ALIASES: Record<string, PipelineMainId> = {
  ingest: "trigger",
  audio_upload: "trigger",
  upload: "trigger",
  langgraph: "orchestrator",
  orchestrate: "orchestrator",
  agent1: "localization",
  translate: "localization",
  whisper: "localization",
  agent2: "triage",
  agent3: "specialist",
  agent4: "specialist",
  agent5: "summary",
  finalize: "summary",
};

export function canonicalMainNodeId(stepId: string): PipelineMainId | null {
  const lower = stepId.toLowerCase();
  if (PIPELINE_MAIN_IDS.includes(lower as PipelineMainId)) {
    return lower as PipelineMainId;
  }
  return ALIASES[lower] ?? null;
}

export const SAFETY_NODE_ID = "safety";
