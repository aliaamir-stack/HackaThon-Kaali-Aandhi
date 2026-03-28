"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { LanguageSelect } from "@/components/language-select";
import { MediaInput } from "@/components/media-input";
import { ModeToggle } from "@/components/mode-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAnalysisSession } from "@/context/analysis-session";
import type { InputMode, LanguageCode } from "@/lib/types";

export default function Home() {
  const router = useRouter();
  const { beginAnalysis } = useAnalysisSession();
  const [mode, setMode] = useState<InputMode>("audio");
  const [language, setLanguage] = useState<LanguageCode>("urdu");
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  useEffect(() => {
    setFile(null);
  }, [mode]);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const handleFile = useCallback((f: File | null) => {
    setFile(f);
  }, []);

  const runAnalysis = () => {
    if (!file) return;
    beginAnalysis(file, mode, language);
    router.push("/analyze");
  };

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

      <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--background)_88%,transparent)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 md:px-8">
          <div className="flex items-center gap-3">
            <motion.div
              layout
              className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--surface)] text-xl shadow-lg ring-1 ring-[var(--border)]"
              whileHover={{ scale: 1.04, rotate: -3 }}
            >
              🌾
            </motion.div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">
                Rural health AI
              </p>
              <h1 className="text-lg font-semibold tracking-tight md:text-xl">
                Village signal desk
              </h1>
            </div>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-10 md:gap-14 md:px-8 md:py-14">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-6"
        >
          <div className="max-w-3xl space-y-4">
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl md:leading-tight">
              One canvas for{" "}
              <span className="bg-gradient-to-r from-[var(--accent)] to-[var(--accent-soft)] bg-clip-text text-transparent">
                audio & imagery
              </span>
              , routed through your agents
            </h2>
            <p className="text-base leading-relaxed text-[var(--muted)] md:text-lg">
              Capture village-clinic audio or a symptom photograph. Run analysis
              opens a dedicated pipeline page, then a results page — all
              client-side calls to your API (no Next.js{" "}
              <code className="rounded bg-[var(--surface-muted)] px-1.5 py-0.5 text-sm">
                /api
              </code>{" "}
              routes).
            </p>
          </div>

          <div className="flex flex-col items-stretch gap-6 md:flex-row md:flex-wrap md:items-end md:justify-between">
            <ModeToggle mode={mode} onChange={setMode} />
            <div className="w-full max-w-xs md:w-auto">
              <LanguageSelect value={language} onChange={setLanguage} />
            </div>
            <motion.div
              className="flex flex-wrap items-center gap-3 md:justify-end"
              initial={false}
            >
              <span className="text-xs font-medium text-[var(--muted)]">
                {process.env.NEXT_PUBLIC_USE_MOCK === "true"
                  ? "Mock mode — NEXT_PUBLIC_USE_MOCK=true"
                  : process.env.NEXT_PUBLIC_API_URL
                    ? `POST ${process.env.NEXT_PUBLIC_API_URL}${process.env.NEXT_PUBLIC_RUN_PIPELINE_PATH ?? "/run-pipeline"}`
                    : "Set NEXT_PUBLIC_API_URL in .env.local"}
              </span>
            </motion.div>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.05 }}
          className="space-y-5"
        >
          <MediaInput
            mode={mode}
            file={file}
            previewUrl={previewUrl}
            onFile={handleFile}
            disabled={false}
          />
          <div className="flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-[var(--muted)]">
              {file
                ? `${file.name} · ${(file.size / 1024).toFixed(1)} KB`
                : "Select or capture input to enable analysis."}
            </p>
            <motion.button
              type="button"
              disabled={!file}
              whileHover={{ scale: file ? 1.02 : 1 }}
              whileTap={{ scale: file ? 0.98 : 1 }}
              onClick={runAnalysis}
              className="rounded-2xl bg-[var(--accent)] px-8 py-3.5 text-sm font-semibold text-white shadow-xl shadow-[var(--accent)]/30 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Run multi-agent analysis
            </motion.button>
          </div>
        </motion.section>

        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="border-t border-[var(--border)] pt-10 text-center text-xs text-[var(--muted)]"
        >
          Multipart POST to{" "}
          <code className="rounded bg-[var(--surface-muted)] px-1.5 py-0.5">
            /run-pipeline
          </code>
          : fields{" "}
          <code className="rounded bg-[var(--surface-muted)] px-1.5 py-0.5">
            audio
          </code>{" "}
          or{" "}
          <code className="rounded bg-[var(--surface-muted)] px-1.5 py-0.5">
            image
          </code>{" "}
          plus{" "}
          <code className="rounded bg-[var(--surface-muted)] px-1.5 py-0.5">
            language
          </code>
          . Response must match{" "}
          <code className="rounded bg-[var(--surface-muted)] px-1.5 py-0.5">
            PipelineResponse
          </code>
          .
        </motion.footer>
      </main>
    </div>
  );
}
