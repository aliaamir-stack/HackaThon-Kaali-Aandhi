"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { AnalysisChrome } from "@/components/analysis-chrome";
import { SubmittingPipeline } from "@/components/submitting-pipeline";
import { VerticalAgentPipeline } from "@/components/vertical-agent-pipeline";
import { useAnalysisSession } from "@/context/analysis-session";
import { submitForAnalysis } from "@/lib/api";
import type { AnalyzeSuccessResponse } from "@/lib/types";

export default function AnalyzePage() {
  const router = useRouter();
  const { pendingFile, pendingMode, pendingLanguage, clearPending, setLastResult } =
    useAnalysisSession();
  const [phase, setPhase] = useState<"fetching" | "pipeline" | "error">(
    "fetching"
  );
  const [data, setData] = useState<AnalyzeSuccessResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** After a file was provided, clearing pending (post-pipeline) must not trigger redirect home. */
  const everHadPendingFileRef = useRef(false);

  useEffect(() => {
    if (!pendingFile) {
      if (!everHadPendingFileRef.current) {
        router.replace("/");
      }
      return;
    }

    everHadPendingFileRef.current = true;

    let cancelled = false;
    setPhase("fetching");
    setError(null);
    setData(null);

    (async () => {
      try {
        const res = await submitForAnalysis(
          pendingFile,
          pendingMode,
          pendingLanguage
        );
        if (cancelled) return;
        setData(res);
        setPhase("pipeline");
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Request failed");
        setPhase("error");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [pendingFile, pendingMode, pendingLanguage, router]);

  const onPipelineDone = useCallback(() => {
    if (!data) return;
    flushSync(() => {
      setLastResult(data);
      clearPending();
    });
    router.push("/results");
  }, [data, setLastResult, clearPending, router]);

  if (!pendingFile && phase !== "error" && phase !== "pipeline") {
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
        title="Multi-agent analysis"
        subtitle="Pipeline replay from your backend timestamps"
      />

      <main className="mx-auto max-w-6xl px-4 py-10 md:px-8 md:py-14">
        {phase === "fetching" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-8"
          >
            <p className="text-center text-sm text-[var(--muted)]">
              Upload received. Waiting for orchestration response…
            </p>
            <SubmittingPipeline />
          </motion.div>
        )}

        {phase === "error" && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-auto max-w-lg space-y-6 text-center"
          >
            <p
              className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:text-red-300"
              role="alert"
            >
              {error}
            </p>
            <Link
              href="/"
              className="inline-block rounded-2xl bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-white shadow-lg"
            >
              Back to capture
            </Link>
          </motion.div>
        )}

        {phase === "pipeline" && data && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-10"
          >
            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent)]">
                Live run
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">
                Vertical agent pipeline
              </h2>
              <p className="mx-auto mt-2 max-w-xl text-sm text-[var(--muted)]">
                Connectors fill while the downstream agent runs (from{" "}
                <code className="rounded bg-[var(--surface-muted)] px-1 text-[11px]">
                  startedAt
                </code>{" "}
                to{" "}
                <code className="rounded bg-[var(--surface-muted)] px-1 text-[11px]">
                  endedAt
                </code>
                ).
              </p>
            </div>
            <VerticalAgentPipeline
              pipeline={data.pipeline}
              urgentEscalation={
                data.urgentEscalation ??
                (data.is_urgent && data.override_required)
              }
              onReplayComplete={onPipelineDone}
            />
          </motion.div>
        )}
      </main>
    </div>
  );
}
