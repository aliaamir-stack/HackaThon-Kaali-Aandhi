"use client";

import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

type Props = {
  title: string;
  subtitle?: string;
};

export function AnalysisChrome({ title, subtitle }: Props) {
  return (
    <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--background)_88%,transparent)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 md:px-8">
        <div className="flex min-w-0 flex-1 items-center gap-4">
          <Link
            href="/"
            className="shrink-0 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2 text-sm font-medium text-[var(--foreground)] transition hover:bg-[var(--surface)]"
          >
            ← Home
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold tracking-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="truncate text-xs text-[var(--muted)]">{subtitle}</p>
            )}
          </div>
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
}
