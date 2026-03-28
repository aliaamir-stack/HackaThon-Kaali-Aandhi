"use client";

import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <span className="inline-flex h-10 w-[5.5rem] rounded-full bg-[var(--surface-muted)]" />
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <motion.button
      type="button"
      layout
      whileTap={{ scale: 0.96 }}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="relative inline-flex h-10 w-[5.5rem] items-center rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-1 shadow-inner"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <motion.span
        layout
        className="absolute left-1 top-1 flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface)] text-sm shadow-md ring-1 ring-[var(--border)]"
        animate={{ x: isDark ? 44 : 0 }}
        transition={{ type: "spring", stiffness: 420, damping: 32 }}
      >
        {isDark ? "🌙" : "☀️"}
      </motion.span>
      <span className="sr-only">Toggle color theme</span>
    </motion.button>
  );
}
