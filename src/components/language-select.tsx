"use client";

import { SUPPORTED_LANGUAGES, type LanguageCode } from "@/lib/types";

type Props = {
  value: LanguageCode;
  onChange: (code: LanguageCode) => void;
  disabled?: boolean;
};

export function LanguageSelect({ value, onChange, disabled }: Props) {
  return (
    <label className="flex flex-col gap-1.5 text-sm">
      <span className="font-medium text-[var(--foreground)]">Language</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as LanguageCode)}
        className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-[var(--foreground)] shadow-inner outline-none transition focus:ring-2 focus:ring-[var(--accent)] disabled:opacity-50"
      >
        {SUPPORTED_LANGUAGES.map(({ code, label }) => (
          <option key={code} value={code}>
            {label}
          </option>
        ))}
      </select>
      <span className="text-xs text-[var(--muted)]">
        Sent as <code className="rounded bg-[var(--surface-muted)] px-1">language</code>{" "}
        with your upload.
      </span>
    </label>
  );
}
