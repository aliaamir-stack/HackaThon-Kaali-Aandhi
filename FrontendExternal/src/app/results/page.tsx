"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { AnalysisChrome } from "@/components/analysis-chrome";
import { PipelineResultsDashboard } from "@/components/pipeline-results-dashboard";
import { useAnalysisSession } from "@/context/analysis-session";

export default function ResultsPage() {
  const router = useRouter();
  const { lastResult } = useAnalysisSession();

  useEffect(() => {
    if (!lastResult) {
      router.replace("/");
    }
  }, [lastResult, router]);

  if (!lastResult) {
    return null;
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[var(--background)] text-[var(--foreground)]">
      <div
        className="pointer-events-none fixed inset-0 -z-10"
        aria-hidden
        style={{
          background:
            "radial-gradient(ellipse 120% 80% at 50% -20%, var(--hero-glow), transparent 50%), radial-gradient(ellipse 60% 40% at 100% 50%, var(--glow-2), transparent 45%)",
        }}
      />

      <AnalysisChrome
        title="Pipeline results"
        subtitle="Full PipelineResponse — urgency-aware clinical summary"
      />

      <main className="mx-auto max-w-5xl px-4 py-10 md:px-8 md:py-14">
        <PipelineResultsDashboard data={lastResult} />

        <div className="mt-12 flex flex-wrap justify-center gap-4 border-t border-[var(--border)] pt-10">
          <Link
            href="/"
            className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-6 py-3 text-sm font-semibold text-[var(--foreground)] shadow-md transition hover:bg-[var(--surface-muted)]"
          >
            New capture
          </Link>
        </div>
      </main>
    </div>
  );
}
