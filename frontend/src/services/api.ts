/**
 * api.ts — Typed API client for the pipeline backend
 * ====================================================
 * Single import for all backend communication.
 *
 * Usage:
 *   import { submitAudio, submitText } from "@/services/api";
 *
 *   const result = await submitAudio(file, "urdu");
 *   const result = await submitText("mujhe bukhar hai", "urdu");
 */

import type {
  AudioPipelineRequest,
  TextPipelineRequest,
  PipelineResponse,
} from "../types/pipeline";

const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

class ApiError extends Error {
  constructor(
    public status: number,
    public detail: string,
  ) {
    super(`[${status}] ${detail}`);
    this.name = "ApiError";
  }
}

async function handleResponse(res: Response): Promise<PipelineResponse> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(res.status, body.detail ?? "Unknown error");
  }
  return res.json() as Promise<PipelineResponse>;
}

/**
 * POST /run-pipeline — send an audio file through the full 6-agent pipeline.
 *
 * @param audio  The audio File from <input type="file"> or MediaRecorder
 * @param language  One of SUPPORTED_LANGUAGES[].code  (default "urdu")
 * @returns PipelineResponse  (snake_case — use mapResponseToResult for React)
 */
export async function submitAudio(
  audio: AudioPipelineRequest["audio"],
  language: AudioPipelineRequest["language"] = "urdu",
): Promise<PipelineResponse> {
  const form = new FormData();
  form.append("audio", audio);
  form.append("language", language);

  const res = await fetch(`${API_BASE}/run-pipeline`, {
    method: "POST",
    body: form,
  });

  return handleResponse(res);
}

/**
 * POST /run-text — send typed symptoms (skips Whisper transcription).
 *
 * @param text  Patient symptoms as text (any supported language)
 * @param language  One of SUPPORTED_LANGUAGES[].code  (default "urdu")
 * @returns PipelineResponse  (snake_case — use mapResponseToResult for React)
 */
export async function submitText(
  text: TextPipelineRequest["text"],
  language: TextPipelineRequest["language"] = "urdu",
): Promise<PipelineResponse> {
  const res = await fetch(`${API_BASE}/run-text`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, language } satisfies TextPipelineRequest),
  });

  return handleResponse(res);
}

/**
 * GET / — quick health check to verify backend is reachable.
 */
export async function healthCheck(): Promise<{
  status: string;
  service: string;
  version: string;
  agents: string[];
}> {
  const res = await fetch(`${API_BASE}/`);
  if (!res.ok) throw new ApiError(res.status, "Backend unreachable");
  return res.json();
}

export { ApiError };
