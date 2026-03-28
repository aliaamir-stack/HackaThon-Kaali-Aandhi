"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  defaultNodeStates,
  type NodeRunState,
  type SafetyVisualState,
} from "@/components/agent-pipeline-diagram";
import {
  canonicalMainNodeId,
  PIPELINE_MAIN_IDS,
  SAFETY_NODE_ID,
} from "@/lib/pipeline-nodes";
import type { PipelineAgentStep } from "@/lib/types";

type StepState = "pending" | "running" | "done";

function parseMs(iso: string) {
  return new Date(iso).getTime();
}

function mergeRunState(
  a: NodeRunState | undefined,
  b: NodeRunState
): NodeRunState {
  const rank: Record<NodeRunState, number> = {
    pending: 0,
    running: 1,
    done: 2,
  };
  if (!a) return b;
  return rank[a] >= rank[b] ? a : b;
}

export function usePipelineReplay(
  pipeline: PipelineAgentStep[] | null,
  enabled: boolean,
  onReplayComplete?: () => void,
  urgentEscalation?: boolean
) {
  const [states, setStates] = useState<Record<string, StepState>>({});
  const onCompleteRef = useRef(onReplayComplete);
  onCompleteRef.current = onReplayComplete;

  const sorted = useMemo(() => {
    if (!pipeline?.length) return [];
    return [...pipeline].sort(
      (a, b) => parseMs(a.startedAt) - parseMs(b.startedAt)
    );
  }, [pipeline]);

  useEffect(() => {
    if (!enabled || !sorted.length) {
      setStates({});
      return;
    }

    const initial: Record<string, StepState> = {};
    sorted.forEach((s) => {
      initial[s.id] = "pending";
    });
    setStates(initial);

    const t0 = Math.min(...sorted.map((s) => parseMs(s.startedAt)));
    const timers: number[] = [];

    sorted.forEach((step) => {
      const start = parseMs(step.startedAt) - t0;
      const end = parseMs(step.endedAt) - t0;
      timers.push(
        window.setTimeout(() => {
          setStates((prev) => ({ ...prev, [step.id]: "running" }));
        }, Math.max(0, start))
      );
      timers.push(
        window.setTimeout(() => {
          setStates((prev) => ({ ...prev, [step.id]: "done" }));
        }, Math.max(0, end))
      );
    });

    const lastEnd = Math.max(...sorted.map((s) => parseMs(s.endedAt) - t0));
    timers.push(
      window.setTimeout(() => onCompleteRef.current?.(), lastEnd + 120)
    );

    return () => timers.forEach((t) => clearTimeout(t));
  }, [enabled, sorted]);

  const nodeStates = useMemo(() => {
    const out = defaultNodeStates();
    for (const step of sorted) {
      const nid = canonicalMainNodeId(step.id);
      if (!nid) continue;
      const s = (states[step.id] ?? "pending") as NodeRunState;
      out[nid] = mergeRunState(out[nid], s);
    }
    return out;
  }, [sorted, states]);

  const safetyState: SafetyVisualState = useMemo(() => {
    if (urgentEscalation) return "escalated";
    const raw = states[SAFETY_NODE_ID];
    if (raw === "running") return "monitoring";
    if (
      nodeStates.triage === "running" ||
      nodeStates.specialist === "running"
    ) {
      return "monitoring";
    }
    return "idle";
  }, [urgentEscalation, states, nodeStates]);

  return { sorted, stepStates: states, nodeStates, safetyState };
}

export function stepDurationSec(
  sorted: PipelineAgentStep[],
  mainId: (typeof PIPELINE_MAIN_IDS)[number]
): number {
  const step = sorted.find((s) => canonicalMainNodeId(s.id) === mainId);
  if (!step) return 0.45;
  return Math.max(
    0.2,
    (parseMs(step.endedAt) - parseMs(step.startedAt)) / 1000
  );
}

export function safetyStepDurationSec(sorted: PipelineAgentStep[]): number {
  const step = sorted.find((s) => s.id.toLowerCase() === SAFETY_NODE_ID);
  if (!step) return 0.4;
  return Math.max(
    0.2,
    (parseMs(step.endedAt) - parseMs(step.startedAt)) / 1000
  );
}
