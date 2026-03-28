"use client";

import { motion } from "framer-motion";
import { useId } from "react";
import type { PipelineMainId } from "@/lib/pipeline-nodes";
import { PIPELINE_MAIN_IDS } from "@/lib/pipeline-nodes";

export type NodeRunState = "pending" | "running" | "done";

export type SafetyVisualState = "idle" | "monitoring" | "escalated";

export type NodeConfig = {
  id: PipelineMainId;
  eyebrow: string;
  title: string;
  description: string;
  tag: string;
  border: string;
  tagBg: string;
  tagText: string;
  glow: string;
  icon: React.ReactNode;
};

function IconMic() {
  return (
    <svg
      className="h-6 w-6"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.75}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 14a3 3 0 003-3V5a3 3 0 10-6 0v6a3 3 0 003 3z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4"
      />
    </svg>
  );
}

function IconBrain() {
  return (
    <svg
      className="h-6 w-6"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.75}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
      />
    </svg>
  );
}

function IconGlobe() {
  return (
    <svg
      className="h-6 w-6"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.75}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function IconClipboard() {
  return (
    <svg
      className="h-6 w-6"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.75}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
      />
    </svg>
  );
}

function IconMicroscope() {
  return (
    <svg
      className="h-6 w-6"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.75}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 10a3 3 0 11-6 0 3 3 0 016 0z"
      />
    </svg>
  );
}

function IconDocument() {
  return (
    <svg
      className="h-6 w-6"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={1.75}
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}

export const AGENT_PIPELINE_NODES: NodeConfig[] = [
  {
    id: "trigger",
    eyebrow: "TRIGGER",
    title: "Audio Upload",
    description:
      "Health worker uploads voice file via Streamlit UI.",
    tag: "WAV / MP3",
    border: "rgb(56, 189, 248)",
    tagBg: "rgba(56, 189, 248, 0.2)",
    tagText: "rgb(125, 211, 252)",
    glow: "rgba(56, 189, 248, 0.45)",
    icon: <IconMic />,
  },
  {
    id: "orchestrator",
    eyebrow: "ORCHESTRATOR",
    title: "LangGraph",
    description:
      "Initializes State JSON, routes between agents via conditional logic.",
    tag: "FastAPI",
    border: "rgb(167, 139, 250)",
    tagBg: "rgba(167, 139, 250, 0.2)",
    tagText: "rgb(196, 181, 253)",
    glow: "rgba(167, 139, 250, 0.45)",
    icon: <IconBrain />,
  },
  {
    id: "localization",
    eyebrow: "AGENT 1",
    title: "Localization",
    description:
      "Whisper transcribes → Llama translates to clinical English.",
    tag: "Whisper + Groq",
    tagBg: "rgba(45, 212, 191, 0.2)",
    tagText: "rgb(94, 234, 212)",
    border: "rgb(45, 212, 191)",
    glow: "rgba(45, 212, 191, 0.45)",
    icon: <IconGlobe />,
  },
  {
    id: "triage",
    eyebrow: "AGENT 2",
    title: "Triage",
    description:
      "Extracts structured symptoms, flags missing critical context.",
    tag: "DeepSeek-R1",
    border: "rgb(234, 179, 8)",
    tagBg: "rgba(234, 179, 8, 0.22)",
    tagText: "rgb(253, 224, 71)",
    glow: "rgba(234, 179, 8, 0.4)",
    icon: <IconClipboard />,
  },
  {
    id: "specialist",
    eyebrow: "AGENT 3",
    title: "Specialist",
    description:
      "Cross-references symptoms against WHO/CDC RAG knowledge base.",
    tag: "DeepSeek-R1 + RAG",
    border: "rgb(249, 115, 22)",
    tagBg: "rgba(249, 115, 22, 0.2)",
    tagText: "rgb(253, 186, 116)",
    glow: "rgba(249, 115, 22, 0.45)",
    icon: <IconMicroscope />,
  },
  {
    id: "summary",
    eyebrow: "AGENT 5",
    title: "Summary",
    description:
      "Generates referral note for doctor + back-translation to native language.",
    tag: "DeepSeek-R1",
    border: "rgb(34, 197, 94)",
    tagBg: "rgba(34, 197, 94, 0.2)",
    tagText: "rgb(134, 239, 172)",
    glow: "rgba(34, 197, 94, 0.45)",
    icon: <IconDocument />,
  },
];

function FlowArrow({ active }: { active: boolean }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const markerId = `ah-${uid}`;
  return (
    <div
      className="hidden shrink-0 items-center justify-center md:flex"
      style={{ width: 28 }}
      aria-hidden
    >
      <svg width="28" height="24" viewBox="0 0 28 24" className="overflow-visible">
        <defs>
          <marker
            id={markerId}
            markerWidth="8"
            markerHeight="8"
            refX="6"
            refY="3"
            orient="auto"
          >
            <path d="M0,0 L0,6 L6,3 z" fill="var(--pipeline-arrow)" />
          </marker>
        </defs>
        <motion.path
          d="M2 12 H22"
          fill="none"
          stroke="var(--pipeline-arrow)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="5 5"
          markerEnd={`url(#${markerId})`}
          initial={false}
          animate={
            active
              ? { strokeDashoffset: [0, -20] }
              : { strokeDashoffset: 0 }
          }
          transition={
            active
              ? { duration: 1.2, repeat: Infinity, ease: "linear" }
              : { duration: 0.2 }
          }
        />
      </svg>
    </div>
  );
}

export function AgentPipelineNodeCard({
  node,
  state,
  variant = "diagram",
}: {
  node: NodeConfig;
  state: NodeRunState;
  /** `list` = full-width column layout for vertical pipeline pages. */
  variant?: "diagram" | "list";
}) {
  const isRunning = state === "running";
  const isDone = state === "done";

  return (
    <motion.article
      layout
      className={
        variant === "list"
          ? "relative flex min-h-[160px] w-full max-w-2xl flex-col rounded-xl border-2 bg-[var(--pipeline-card-bg)] p-5 shadow-lg md:min-h-[180px]"
          : "relative flex min-h-[200px] w-[min(100%,240px)] shrink-0 flex-col rounded-xl border-2 bg-[var(--pipeline-card-bg)] p-4 shadow-lg md:min-h-[220px] md:w-[200px]"
      }
      style={{
        borderColor: node.border,
        boxShadow:
          isRunning || isDone
            ? `0 0 0 1px ${node.border}, 0 12px 40px -8px ${node.glow}`
            : undefined,
      }}
      animate={
        isRunning
          ? {
              boxShadow: [
                `0 0 0 1px ${node.border}, 0 8px 32px -8px ${node.glow}`,
                `0 0 0 1px ${node.border}, 0 16px 48px -4px ${node.glow}`,
                `0 0 0 1px ${node.border}, 0 8px 32px -8px ${node.glow}`,
              ],
            }
          : {}
      }
      transition={
        isRunning ? { duration: 1.4, repeat: Infinity } : { duration: 0.25 }
      }
    >
      <div
        className="mb-3 flex items-start justify-between gap-2"
        style={{ color: node.border }}
      >
        <span className="rounded-lg bg-[var(--pipeline-icon-bg)] p-2 ring-1 ring-white/10">
          {node.icon}
        </span>
        {isDone && (
          <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
            Done
          </span>
        )}
        {isRunning && (
          <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white/90 ring-1 ring-white/20">
            Active
          </span>
        )}
      </div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
        {node.eyebrow}
      </p>
      <h3 className="mt-0.5 text-sm font-bold leading-tight text-[var(--foreground)]">
        {node.title}
      </h3>
      <p className="mt-2 flex-1 text-xs leading-relaxed text-[var(--muted)]">
        {node.description}
      </p>
      <span
        className="mt-3 inline-flex w-fit rounded-full px-2.5 py-1 text-[10px] font-semibold"
        style={{
          backgroundColor: node.tagBg,
          color: node.tagText,
        }}
      >
        {node.tag}
      </span>
    </motion.article>
  );
}

type Props = {
  nodeStates: Record<PipelineMainId, NodeRunState>;
  safetyState: SafetyVisualState;
  /** True while any main step is running (animates connectors). */
  flowActive: boolean;
};

export function AgentPipelineDiagram({
  nodeStates,
  safetyState,
  flowActive,
}: Props) {
  return (
    <div
      className="rounded-2xl border border-[var(--border)] bg-[var(--pipeline-diagram-bg)] p-4 shadow-inner md:p-6"
      style={
        {
          "--pipeline-card-bg": "var(--surface)",
          "--pipeline-diagram-bg":
            "color-mix(in srgb, var(--surface-muted) 55%, var(--surface))",
          "--pipeline-arrow": "color-mix(in srgb, var(--muted) 65%, transparent)",
          "--pipeline-icon-bg":
            "color-mix(in srgb, var(--surface-muted) 80%, transparent)",
        } as React.CSSProperties
      }
    >
      <div className="mb-2 md:mb-4">
        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--muted)]">
          Agent pipeline
        </p>
        <h3 className="text-lg font-semibold tracking-tight text-[var(--foreground)] md:text-xl">
          Data flow
        </h3>
      </div>

      <div className="flex flex-col gap-6">
        <div className="flex items-stretch gap-0 overflow-x-auto pb-2 md:overflow-visible md:pb-0">
          <div className="flex min-w-min items-stretch">
            {AGENT_PIPELINE_NODES.map((node, i) => {
              const state = nodeStates[node.id] ?? "pending";
              const next = AGENT_PIPELINE_NODES[i + 1];
              const arrowActive =
                flowActive &&
                (state === "running" ||
                  state === "done" ||
                  (next && nodeStates[next.id] !== "pending"));
              return (
                <div key={node.id} className="flex items-stretch">
                  <AgentPipelineNodeCard node={node} state={state} />
                  {i < AGENT_PIPELINE_NODES.length - 1 && (
                    <FlowArrow active={!!arrowActive} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-6 md:gap-2 md:items-start">
          <div className="hidden md:block md:col-span-3" aria-hidden />
          <motion.div
            className={`rounded-xl border-2 border-dashed border-red-400/55 p-4 shadow-none dark:border-red-500/50 md:col-span-3 md:col-start-4 ${
              safetyState === "escalated"
                ? "bg-red-100/95 dark:bg-red-950/65"
                : "bg-red-50/90 dark:bg-red-950/40"
            }`}
            style={{
              boxShadow:
                safetyState === "escalated"
                  ? "0 0 32px -4px rgba(220, 38, 38, 0.35)"
                  : safetyState === "monitoring"
                    ? "0 0 24px -6px rgba(220, 38, 38, 0.18)"
                    : undefined,
            }}
            animate={
              safetyState === "monitoring" || safetyState === "escalated"
                ? {
                    borderColor: [
                      "rgba(220,38,38,0.45)",
                      "rgb(220, 38, 38)",
                    ],
                  }
                : {}
            }
            transition={
              safetyState === "monitoring"
                ? { duration: 1.5, repeat: Infinity, repeatType: "reverse" }
                : safetyState === "escalated"
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
              {safetyState === "monitoring" && (
                <span className="rounded-full bg-red-600/15 px-2 py-0.5 text-[10px] font-semibold text-red-800 dark:bg-red-500/20 dark:text-red-300">
                  Monitoring
                </span>
              )}
              {safetyState === "escalated" && (
                <span className="rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                  Urgent escalation
                </span>
              )}
            </div>
            <p className="mt-2 text-xs leading-relaxed text-red-900/85 dark:text-red-100/90">
              Monitors Triage + Specialist outputs simultaneously. On detection
              of red-flag conditions or dangerous drug interactions, the
              pipeline can be interrupted and routed to Summary with an{" "}
              <strong className="text-red-950 dark:text-white">
                URGENT ESCALATION
              </strong>{" "}
              flag — highest priority override in the system.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export function defaultNodeStates(): Record<PipelineMainId, NodeRunState> {
  return Object.fromEntries(
    PIPELINE_MAIN_IDS.map((id) => [id, "pending" as const])
  ) as Record<PipelineMainId, NodeRunState>;
}
