"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type {
  AnalyzeSuccessResponse,
  InputMode,
  LanguageCode,
} from "@/lib/types";

type AnalysisSessionContextValue = {
  pendingFile: File | null;
  pendingMode: InputMode;
  pendingLanguage: LanguageCode;
  beginAnalysis: (file: File, mode: InputMode, language: LanguageCode) => void;
  clearPending: () => void;
  lastResult: AnalyzeSuccessResponse | null;
  setLastResult: (value: AnalyzeSuccessResponse | null) => void;
};

const AnalysisSessionContext =
  createContext<AnalysisSessionContextValue | null>(null);

export function AnalysisSessionProvider({ children }: { children: ReactNode }) {
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingMode, setPendingMode] = useState<InputMode>("audio");
  const [pendingLanguage, setPendingLanguage] =
    useState<LanguageCode>("urdu");
  const [lastResult, setLastResult] = useState<AnalyzeSuccessResponse | null>(
    null
  );

  const beginAnalysis = useCallback(
    (file: File, mode: InputMode, language: LanguageCode) => {
      setLastResult(null);
      setPendingFile(file);
      setPendingMode(mode);
      setPendingLanguage(language);
    },
    []
  );

  const clearPending = useCallback(() => {
    setPendingFile(null);
  }, []);

  const value = useMemo(
    () => ({
      pendingFile,
      pendingMode,
      pendingLanguage,
      beginAnalysis,
      clearPending,
      lastResult,
      setLastResult,
    }),
    [
      pendingFile,
      pendingMode,
      pendingLanguage,
      beginAnalysis,
      clearPending,
      lastResult,
      setLastResult,
    ]
  );

  return (
    <AnalysisSessionContext.Provider value={value}>
      {children}
    </AnalysisSessionContext.Provider>
  );
}

export function useAnalysisSession() {
  const ctx = useContext(AnalysisSessionContext);
  if (!ctx) {
    throw new Error(
      "useAnalysisSession must be used within AnalysisSessionProvider"
    );
  }
  return ctx;
}
