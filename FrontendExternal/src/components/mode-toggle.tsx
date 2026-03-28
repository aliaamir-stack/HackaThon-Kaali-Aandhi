"use client";

import { motion } from "framer-motion";
import type { InputMode } from "@/lib/types";

type Props = {
  mode: InputMode;
  onChange: (m: InputMode) => void;
};

export function ModeToggle({ mode, onChange }: Props) {
  return (
    <div
      className="relative flex w-full max-w-md gap-1 rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-1.5 shadow-inner"
      role="tablist"
      aria-label="Input type"
    >
      {(
        [
          { id: "audio" as const, icon: "🎙", label: "Village audio" },
          { id: "image" as const, icon: "🖼", label: "Symptom image" },
        ] as const
      ).map(({ id, icon, label }) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={mode === id}
          onClick={() => onChange(id)}
          className="relative flex flex-1 items-center justify-center gap-2 rounded-xl py-3 text-sm font-medium"
        >
          {mode === id && (
            <motion.div
              layoutId="mode-pill"
              className="absolute inset-0 rounded-xl bg-[var(--surface)] shadow-md ring-1 ring-[var(--border)]"
              transition={{ type: "spring", stiffness: 400, damping: 35 }}
            />
          )}
          <span className="relative z-10 text-lg" aria-hidden>
            {icon}
          </span>
          <span className="relative z-10">{label}</span>
        </button>
      ))}
    </div>
  );
}
