"use client";

import { motion } from "framer-motion";
import {
  AGENT_PIPELINE_NODES,
  AgentPipelineNodeCard,
  type NodeRunState,
  type SafetyVisualState,
} from "@/components/agent-pipeline-diagram";
import {
  safetyStepDurationSec,
  stepDurationSec,
  usePipelineReplay,
} from "@/hooks/use-pipeline-replay";
import {
  canonicalMainNodeId,
  type PipelineMainId,
  PIPELINE_MAIN_IDS,
  SAFETY_NODE_ID,
} from "@/lib/pipeline-nodes";
import type { PipelineAgentStep } from "@/lib/types";

function getNode(mainId: PipelineMainId) {
  const n = AGENT_PIPELINE_NODES.find((x) => x.id === mainId);
  if (!n) throw new Error(`Unknown node ${mainId}`);
  return n;
}

function VerticalConnector({
  fillColor,
  durationSec,
  downstreamState,
  stepKey,
}: {
  fillColor: string;
  durationSec: number;
  downstreamState: NodeRunState;
  stepKey: string;
}) {
  const empty = downstreamState === "pending";

  return (
    <div className="flex w-full max-w-2xl justify-center py-2">
      <div className="relative h-16 w-2 overflow-hidden rounded-full bg-[var(--surface-muted)] ring-1 ring-[var(--border)]">
        <motion.div
          key={stepKey}
          className="absolute inset-0 rounded-full origin-bottom"
          style={{ backgroundColor: fillColor }}
          initial={{ scaleY: 0 }}
          animate={{ scaleY: empty ? 0 : 1 }}
          transition={{
            duration:
              downstreamState === "running"
                ? Math.max(durationSec, 0.2)
                : downstreamState === "done"
                  ? 0.2
                  : 0,
            ease: downstreamState === "running" ? "linear" : [0.22, 1, 0.36, 1],
          }}
        />
      </div>
    </div>
  );
}

function VerticalSafetyBlock({ state }: { state: SafetyVisualState }) {
  return (
    <motion.div
      className={`w-full max-w-2xl rounded-xl border-2 border-dashed p-4 ${
        state === "escalated"
          ? "border-red-600 bg-red-100/90 dark:border-red-500 dark:bg-red-950/65"
          : "border-red-400/55 bg-red-50/90 dark:border-red-500/50 dark:bg-red-950/40"
      }`}
      animate={
        state === "monitoring" || state === "escalated"
          ? {
              borderColor: [
                "rgba(220,38,38,0.45)",
                "rgb(220, 38, 38)",
              ],
            }
          : {}
      }
      transition={
        state === "monitoring"
          ? { duration: 1.5, repeat: Infinity, repeatType: "reverse" }
          : state === "escalated"
            ? { duration: 0.6, repeat: Infinity, repeatType: "reverse" }
            : {}
      }
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-lg" aria-hidden>
          ⚡
        </span>
        <h4 className="text-sm font-bold text-red-900 dark:text-red-200">
          Safety Agent (Parallel Observer)
        </h4>
        {state === "monitoring" && (
          <span className="rounded-full bg-red-600/15 px-2 py-0.5 text-[10px] font-semibold text-red-800 dark:bg-red-500/20 dark:text-red-300">
            Monitoring
          </span>
        )}
        {state === "escalated" && (
          <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
            Urgent escalation
          </span>
        )}
      </div>
      <p className="mt-2 text-xs leading-relaxed text-red-900/85 dark:text-red-100/90">
        Monitors Triage + Specialist outputs simultaneously. On red-flag
        detection or dangerous drug interactions, the pipeline can interrupt and
        route to Summary with an{" "}
        <strong className="text-red-950 dark:text-white">
          URGENT ESCALATION
        </strong>{" "}
        flag.
      </p>
    </motion.div>
  );
}

function safetyConnectorVisualState(
  sorted: PipelineAgentStep[],
  stepStates: Record<string, string>,
  nodeStates: Record<PipelineMainId, NodeRunState>
): NodeRunState {
  const hasSafety = sorted.some(
    (s) => s.id.toLowerCase() === SAFETY_NODE_ID
  );
  if (hasSafety) {
    return (stepStates[SAFETY_NODE_ID] ?? "pending") as NodeRunState;
  }
  if (nodeStates.specialist === "done" && nodeStates.summary === "pending") {
    return "running";
  }
  if (nodeStates.summary !== "pending") return "done";
  return "pending";
}

type Props = {
  pipeline: PipelineAgentStep[];
  urgentEscalation?: boolean;
  onReplayComplete?: () => void;
};

/** Main-column cards before the Safety block (excludes summary — rendered after Safety). */
const BEFORE_SAFETY: readonly PipelineMainId[] = [
  "trigger",
  "orchestrator",
  "localization",
  "triage",
  "specialist",
];

export function VerticalAgentPipeline({
  pipeline,
  urgentEscalation,
  onReplayComplete,
}: Props) {
  const { sorted, stepStates, nodeStates, safetyState } = usePipelineReplay(
    pipeline,
    true,
    onReplayComplete,
    urgentEscalation
  );

  const safetyConnState = safetyConnectorVisualState(
    sorted,
    stepStates,
    nodeStates
  );

  return (
    <div className="flex flex-col items-center gap-0">
      {BEFORE_SAFETY.map((mainId, index) => {
        const node = getNode(mainId);
        const hasDownstream = index < BEFORE_SAFETY.length - 1;
        const downstreamId = hasDownstream
          ? BEFORE_SAFETY[index + 1]!
          : null;
        const downstreamNode = downstreamId ? getNode(downstreamId) : null;
        const ds = downstreamId ? nodeStates[downstreamId] : "pending";
        const dur = downstreamId
          ? stepDurationSec(sorted, downstreamId)
          : 0;
        const started = downstreamId
          ? sorted.find((s) => canonicalMainNodeId(s.id) === downstreamId)
              ?.startedAt
          : undefined;

        return (
          <div key={mainId} className="flex w-full flex-col items-center">
            <AgentPipelineNodeCard
              node={node}
              state={nodeStates[mainId]}
              variant="list"
            />
            {hasDownstream && downstreamNode && (
              <VerticalConnector
                fillColor={downstreamNode.border}
                durationSec={dur}
                downstreamState={ds}
                stepKey={`${downstreamId}-${started ?? ""}`}
              />
            )}
          </div>
        );
      })}

      <VerticalConnector
        fillColor="rgb(248, 113, 113)"
        durationSec={safetyStepDurationSec(sorted)}
        downstreamState={safetyConnState}
        stepKey={`safety-${sorted.find((s) => s.id.toLowerCase() === SAFETY_NODE_ID)?.startedAt ?? "synthetic"}`}
      />

      <VerticalSafetyBlock state={safetyState} />

      <VerticalConnector
        fillColor={getNode("summary").border}
        durationSec={stepDurationSec(sorted, "summary")}
        downstreamState={nodeStates.summary}
        stepKey={`summary-${sorted.find((s) => canonicalMainNodeId(s.id) === "summary")?.startedAt ?? ""}`}
      />

      <AgentPipelineNodeCard
        node={getNode("summary")}
        state={nodeStates.summary}
        variant="list"
      />
    </div>
  );
}
