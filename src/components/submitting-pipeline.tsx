"use client";

import { motion } from "framer-motion";

const PLACEHOLDERS = [
  "TRIGGER: Audio upload & LangGraph orchestration",
  "AGENT 1: Localization (Whisper + Groq)",
  "AGENT 2: Triage (DeepSeek-R1)",
  "AGENT 3: Specialist + RAG knowledge base",
  "Safety parallel observer + AGENT 5: Summary",
];

export function SubmittingPipeline() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 12 }}
      transition={{ duration: 0.4 }}
      className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-xl md:p-8"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-30"
        style={{
          background:
            "linear-gradient(110deg, transparent 40%, var(--accent-glow) 50%, transparent 60%)",
          backgroundSize: "200% 100%",
        }}
      />
      <motion.div
        className="pointer-events-none absolute inset-0 opacity-40"
        animate={{ backgroundPosition: ["0% 0%", "200% 0%"] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "linear" }}
        style={{
          background:
            "linear-gradient(110deg, transparent 40%, rgba(255,255,255,0.08) 50%, transparent 60%)",
          backgroundSize: "200% 100%",
        }}
      />
      <header className="relative mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
          Awaiting orchestration
        </p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight">
          Contacting multi-agent backend
        </h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Timestamps from each agent will drive the live timeline once the
          response arrives.
        </p>
      </header>
      <ul className="relative space-y-4">
        {PLACEHOLDERS.map((label, i) => (
          <li key={label} className="flex items-center gap-4">
            <motion.div
              className="h-10 w-10 shrink-0 rounded-full border border-[var(--border)] bg-[var(--surface-muted)]"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                delay: i * 0.15,
              }}
            />
            <div className="min-w-0 flex-1 space-y-2">
              <motion.div
                className="h-3 max-w-[70%] rounded-full bg-[var(--surface-muted)]"
                animate={{ opacity: [0.4, 0.9, 0.4] }}
                transition={{
                  duration: 1.4,
                  repeat: Infinity,
                  delay: i * 0.12,
                }}
              />
              <p className="text-sm font-medium text-[var(--muted)]">
                {label}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </motion.section>
  );
}
