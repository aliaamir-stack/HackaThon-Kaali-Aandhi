"use client";

import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useCallback, useRef, useState } from "react";
import type { InputMode } from "@/lib/types";

type Props = {
  mode: InputMode;
  file: File | null;
  previewUrl: string | null;
  onFile: (f: File | null) => void;
  disabled?: boolean;
};

export function MediaInput({
  mode,
  file,
  previewUrl,
  onFile,
  disabled,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const accept = mode === "audio" ? "audio/*" : "image/*";

  const pick = () => inputRef.current?.click();

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDrag(false);
      if (disabled) return;
      const f = e.dataTransfer.files[0];
      if (!f) return;
      if (mode === "audio" && !f.type.startsWith("audio/")) return;
      if (mode === "image" && !f.type.startsWith("image/")) return;
      onFile(f);
    },
    [disabled, mode, onFile]
  );

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }, []);

  const startRecording = useCallback(async () => {
    if (disabled || mode !== "audio") return;
    const stream = await navigator.mediaDevices
      .getUserMedia({ audio: true })
      .catch(() => null);
    if (!stream) return;
    chunksRef.current = [];
    const mr = new MediaRecorder(stream);
    mediaRecorderRef.current = mr;
    mr.ondataavailable = (ev) => {
      if (ev.data.size) chunksRef.current.push(ev.data);
    };
    mr.onstop = () => {
      stream.getTracks().forEach((t) => t.stop());
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      const f = new File([blob], `recording-${Date.now()}.webm`, {
        type: blob.type,
      });
      onFile(f);
    };
    mr.start();
    setRecording(true);
  }, [disabled, mode, onFile]);

  return (
    <motion.div
      layout
      className="relative min-h-[min(52vh,520px)] w-full overflow-hidden rounded-3xl border-2 border-dashed border-[var(--border-strong)] bg-[var(--surface)] shadow-[0_24px_80px_-24px_rgba(15,23,42,0.35)] transition-colors"
      style={{
        borderColor: drag ? "var(--accent)" : undefined,
        background: drag
          ? "linear-gradient(145deg, var(--surface), var(--accent-glow))"
          : undefined,
      }}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDrag(true);
      }}
      onDragLeave={() => setDrag(false)}
      onDrop={onDrop}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.45] dark:opacity-[0.35]"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 20% 0%, var(--glow-1), transparent 55%), radial-gradient(ellipse 70% 50% at 100% 100%, var(--glow-2), transparent 50%)",
        }}
      />
      <div className="relative flex h-full min-h-[min(52vh,520px)] flex-col items-center justify-center gap-6 p-8 md:p-12">
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          disabled={disabled}
          onChange={(e) => {
            const f = e.target.files?.[0];
            onFile(f ?? null);
            e.target.value = "";
          }}
        />

        <AnimatePresence mode="wait">
          {previewUrl && mode === "image" ? (
            <motion.div
              key="preview"
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="relative flex max-h-[min(40vh,360px)] w-full max-w-lg items-center justify-center"
            >
              <Image
                src={previewUrl}
                alt="Selected"
                width={800}
                height={600}
                unoptimized
                className="max-h-[min(40vh,360px)] w-auto max-w-full rounded-2xl object-contain shadow-xl ring-1 ring-[var(--border)]"
              />
            </motion.div>
          ) : previewUrl && mode === "audio" ? (
            <motion.div
              key="audio-prev"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--surface-muted)] p-6 shadow-inner"
            >
              <p className="mb-3 text-center text-sm font-medium text-[var(--muted)]">
                {file?.name ?? "Audio ready"}
              </p>
              <audio
                controls
                src={previewUrl}
                className="w-full rounded-lg"
              />
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4 text-center"
            >
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-[var(--surface-muted)] text-4xl shadow-inner ring-1 ring-[var(--border)]">
                {mode === "audio" ? "🎙" : "📷"}
              </div>
              <div>
                <p className="text-lg font-semibold tracking-tight text-[var(--foreground)]">
                  {mode === "audio"
                    ? "Drop rural clinic audio or record live"
                    : "Drop a symptom photo or clinical still"}
                </p>
                <p className="mt-2 max-w-md text-sm text-[var(--muted)]">
                  Your file is sent to our multi-agent pipeline for symptom
                  alignment and caregiver-ready translations. No API routes in
                  this app — only your backend.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <motion.button
            type="button"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={disabled}
            onClick={pick}
            className="rounded-xl bg-[var(--accent)] px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-[var(--accent)]/25 transition hover:brightness-110 disabled:opacity-50"
          >
            Choose file
          </motion.button>
          {mode === "audio" && (
            <motion.button
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={disabled}
              onClick={recording ? stopRecording : startRecording}
              className="rounded-xl border border-[var(--border-strong)] bg-[var(--surface-muted)] px-6 py-3 text-sm font-semibold text-[var(--foreground)] transition hover:bg-[var(--surface)] disabled:opacity-50"
            >
              {recording ? "Stop recording" : "Record"}
            </motion.button>
          )}
          {file && (
            <button
              type="button"
              disabled={disabled}
              onClick={() => onFile(null)}
              className="rounded-xl px-4 py-3 text-sm font-medium text-[var(--muted)] underline-offset-4 hover:text-[var(--foreground)] hover:underline disabled:opacity-50"
            >
              Clear
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
