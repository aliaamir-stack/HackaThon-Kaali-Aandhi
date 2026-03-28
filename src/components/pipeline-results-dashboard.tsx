"use client";

import { motion } from "framer-motion";
import type { PipelineResponse } from "@/lib/types";

type Props = {
  data: PipelineResponse;
};

function urgencyVisual(level: number) {
  const n = Math.min(5, Math.max(1, Math.round(level)));
  const map: Record<
    number,
    { label: string; bar: string; chip: string; desc: string }
  > = {
    1: {
      label: "Routine",
      bar: "bg-emerald-500",
      chip:
        "border-emerald-500/40 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200",
      desc: "Low acuity — standard primary-care pacing.",
    },
    2: {
      label: "Low priority",
      bar: "bg-sky-500",
      chip:
        "border-sky-500/40 bg-sky-500/10 text-sky-900 dark:text-sky-100",
      desc: "Monitor; expedited follow-up if symptoms evolve.",
    },
    3: {
      label: "Moderate",
      bar: "bg-amber-500",
      chip:
        "border-amber-500/50 bg-amber-500/15 text-amber-950 dark:text-amber-100",
      desc: "Needs timely clinical attention.",
    },
    4: {
      label: "High",
      bar: "bg-orange-500",
      chip:
        "border-orange-500/50 bg-orange-500/15 text-orange-950 dark:text-orange-100",
      desc: "Urgent evaluation recommended.",
    },
    5: {
      label: "Emergency",
      bar: "bg-red-600",
      chip:
        "border-red-600/60 bg-red-600/15 text-red-950 dark:text-red-100",
      desc: "Treat as time-critical / ED-level concern.",
    },
  };
  return map[n] ?? map[3]!;
}

function severityVisual(score: number) {
  const s = Math.min(10, Math.max(0, score));
  let bar: string;
  let chip: string;
  if (s <= 3) {
    bar = "bg-teal-500";
    chip =
      "border-teal-500/40 bg-teal-500/10 text-teal-900 dark:text-teal-100";
  } else if (s <= 6) {
    bar = "bg-amber-500";
    chip =
      "border-amber-500/50 bg-amber-500/15 text-amber-950 dark:text-amber-100";
  } else if (s <= 8) {
    bar = "bg-orange-500";
    chip =
      "border-orange-500/50 bg-orange-500/15 text-orange-950 dark:text-orange-100";
  } else {
    bar = "bg-red-600";
    chip =
      "border-red-600/50 bg-red-600/15 text-red-950 dark:text-red-100";
  }
  return { s, bar, chip };
}

function ListBlock({
  title,
  items,
  empty,
  variant,
}: {
  title: string;
  items: string[];
  empty: string;
  variant: "neutral" | "warn" | "danger";
}) {
  const shell =
    variant === "danger"
      ? "border-red-500/35 bg-red-500/[0.06]"
      : variant === "warn"
        ? "border-amber-500/35 bg-amber-500/[0.06]"
        : "border-[var(--border)] bg-[var(--surface-muted)]/50";

  return (
    <div className={`rounded-2xl border p-5 ${shell}`}>
      <h3 className="text-xs font-bold uppercase tracking-[0.15em] text-[var(--muted)]">
        {title}
      </h3>
      {items.length === 0 ? (
        <p className="mt-3 text-sm text-[var(--muted)]">{empty}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {items.map((item, i) => (
            <li
              key={i}
              className="flex gap-2 text-sm leading-relaxed text-[var(--foreground)]"
            >
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const fadeUp = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
};

export function PipelineResultsDashboard({ data }: Props) {
  const u = urgencyVisual(data.urgency_level);
  const sev = severityVisual(data.severity);
  const statusOk = data.pipeline_status !== "error";
  const showCrisis =
    data.is_urgent || data.override_required || data.urgency_level >= 4;

  return (
    <div className="space-y-8">
      {data.pipeline_status === "error" && data.error_message && (
        <motion.div
          {...fadeUp}
          className="rounded-2xl border-2 border-red-500/50 bg-red-500/10 px-5 py-4 text-red-900 dark:text-red-100"
        >
          <p className="text-xs font-bold uppercase tracking-wider">
            Pipeline error
          </p>
          <p className="mt-2 text-sm leading-relaxed">{data.error_message}</p>
        </motion.div>
      )}

      {showCrisis && statusOk && (
        <motion.div
          {...fadeUp}
          transition={{ delay: 0.05 }}
          className="rounded-2xl border-2 border-red-600/45 bg-gradient-to-br from-red-600/15 to-orange-600/10 px-5 py-4 shadow-lg shadow-red-900/10"
        >
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-2xl" aria-hidden>
              ⚠️
            </span>
            <div>
              <p className="text-sm font-bold text-red-900 dark:text-red-100">
                Safety escalation
              </p>
              <p className="mt-1 text-xs text-red-800/90 dark:text-red-200/90">
                {data.is_urgent && "Life-threatening signal flagged. "}
                {data.override_required &&
                  "Override required — urgent pathway to summary. "}
                {data.urgency_level >= 4 && "High clinical urgency level."}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      <motion.section
        {...fadeUp}
        transition={{ delay: 0.08 }}
        className="grid gap-4 md:grid-cols-2"
      >
        <div
          className={`rounded-3xl border-2 p-6 shadow-lg ${u.chip}`}
        >
          <p className="text-xs font-bold uppercase tracking-[0.2em] opacity-80">
            Urgency level
          </p>
          <div className="mt-3 flex items-end gap-3">
            <span className="text-5xl font-bold tabular-nums tracking-tight">
              {data.urgency_level}
            </span>
            <span className="pb-2 text-sm font-semibold">/ 5</span>
            <span className="mb-2 rounded-full border border-current/30 px-2.5 py-0.5 text-xs font-semibold">
              {u.label}
            </span>
          </div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
            <motion.div
              className={`h-full rounded-full ${u.bar}`}
              initial={{ width: 0 }}
              animate={{ width: `${(data.urgency_level / 5) * 100}%` }}
              transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
          <p className="mt-3 text-xs leading-relaxed opacity-90">{u.desc}</p>
        </div>

        <div
          className={`rounded-3xl border-2 p-6 shadow-lg ${sev.chip}`}
        >
          <p className="text-xs font-bold uppercase tracking-[0.2em] opacity-80">
            Severity (triage)
          </p>
          <div className="mt-3 flex items-end gap-3">
            <span className="text-5xl font-bold tabular-nums tracking-tight">
              {data.severity}
            </span>
            <span className="pb-2 text-sm font-semibold">/ 10</span>
          </div>
          <div className="mt-4 h-3 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
            <motion.div
              className={`h-full rounded-full ${sev.bar}`}
              initial={{ width: 0 }}
              animate={{ width: `${(sev.s / 10) * 100}%` }}
              transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
          <p className="mt-3 text-xs leading-relaxed opacity-90">
            Higher scores warrant faster workup and tighter follow-up.
          </p>
        </div>
      </motion.section>

      <motion.section
        {...fadeUp}
        transition={{ delay: 0.1 }}
        className="grid gap-4 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl md:grid-cols-3 md:p-8"
      >
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
            Pipeline status
          </p>
          <p className="mt-2 text-lg font-semibold capitalize">
            {data.pipeline_status}
          </p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
            Source language
          </p>
          <p className="mt-2 text-lg font-semibold">{data.source_language}</p>
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
            Duration (triage)
          </p>
          <p className="mt-2 text-lg font-semibold">
            {data.duration || "—"}
          </p>
        </div>
      </motion.section>

      <motion.section
        {...fadeUp}
        transition={{ delay: 0.12 }}
        className="space-y-4 rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg md:p-8"
      >
        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--accent)]">
          Transcript & clinical English
        </h2>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl bg-[var(--surface-muted)]/80 p-4 ring-1 ring-[var(--border)]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
              Raw transcript
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">
              {data.raw_transcript || "—"}
            </p>
          </div>
          <div className="rounded-2xl bg-[var(--surface-muted)]/80 p-4 ring-1 ring-[var(--border)]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--muted)]">
              Clinical English
            </p>
            <p className="mt-2 text-sm leading-relaxed text-[var(--foreground)]">
              {data.clinical_english || "—"}
            </p>
          </div>
        </div>
      </motion.section>

      <div className="grid gap-4 lg:grid-cols-2">
        <motion.div {...fadeUp} transition={{ delay: 0.14 }}>
          <ListBlock
            title="Symptoms"
            items={data.symptoms}
            empty="No symptoms extracted."
            variant="neutral"
          />
        </motion.div>
        <motion.div {...fadeUp} transition={{ delay: 0.16 }}>
          <ListBlock
            title="Missing information"
            items={data.missing_info}
            empty="None flagged."
            variant="warn"
          />
        </motion.div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <motion.div {...fadeUp} transition={{ delay: 0.18 }}>
          <ListBlock
            title="Red flags"
            items={data.red_flags}
            empty="No red flags recorded."
            variant="danger"
          />
        </motion.div>
        <motion.div {...fadeUp} transition={{ delay: 0.2 }}>
          <ListBlock
            title="Drug interactions"
            items={data.drug_interactions}
            empty="None detected."
            variant="warn"
          />
        </motion.div>
      </div>

      <motion.section
        {...fadeUp}
        transition={{ delay: 0.22 }}
        className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-lg md:p-8"
      >
        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--accent)]">
          Specialist — potential conditions
        </h2>
        <div className="mt-4 space-y-3 text-sm leading-relaxed text-[var(--foreground)]">
          {data.potential_conditions.length === 0 ? (
            <p className="text-[var(--muted)]">No specialist lines returned.</p>
          ) : (
            data.potential_conditions.map((line, i) => (
              <p key={i} className="whitespace-pre-wrap rounded-xl bg-[var(--surface-muted)]/60 p-3 ring-1 ring-[var(--border)]">
                {line}
              </p>
            ))
          )}
        </div>
      </motion.section>

      <div className="grid gap-4 lg:grid-cols-2">
        <motion.div {...fadeUp} transition={{ delay: 0.24 }}>
          <ListBlock
            title="Recommended tests"
            items={data.recommended_tests}
            empty="None suggested."
            variant="neutral"
          />
        </motion.div>
        <motion.div {...fadeUp} transition={{ delay: 0.26 }}>
          <ListBlock
            title="Evidence sources"
            items={data.evidence_sources}
            empty="No RAG references."
            variant="neutral"
          />
        </motion.div>
      </div>

      <motion.section
        {...fadeUp}
        transition={{ delay: 0.28 }}
        className="grid gap-4 md:grid-cols-2"
      >
        <div className="rounded-3xl border border-[var(--border)] bg-gradient-to-br from-[var(--surface)] to-[var(--surface-muted)]/40 p-6 shadow-lg">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--accent)]">
            Referral note (English)
          </h2>
          <div className="mt-4 max-h-[360px] overflow-auto text-sm leading-relaxed whitespace-pre-wrap">
            {data.referral_note_en || "—"}
          </div>
        </div>
        <div className="rounded-3xl border border-[var(--border)] bg-gradient-to-br from-[var(--surface)] to-[var(--surface-muted)]/40 p-6 shadow-lg">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--accent)]">
            Referral note (native)
          </h2>
          <div className="mt-4 max-h-[360px] overflow-auto text-sm leading-relaxed whitespace-pre-wrap">
            {data.referral_note_native || "—"}
          </div>
        </div>
      </motion.section>
    </div>
  );
}
