"use client";

import { useState, useCallback, useRef } from "react";
import type { OCRResult } from "@/types";

export type OCRStatus = "idle" | "loading" | "success" | "error" | "timeout";

export interface OCRState {
  status: OCRStatus;
  progress: number;
  stage: string;
  result: OCRResult | null;
  error: string | null;
}

const TIMEOUT_MS = 15_000;

export function useOCR() {
  const [state, setState] = useState<OCRState>({
    status: "idle",
    progress: 0,
    stage: "",
    result: null,
    error: null,
  });

  const abortRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reset = useCallback(() => {
    abortRef.current = true;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setState({
      status: "idle",
      progress: 0,
      stage: "",
      result: null,
      error: null,
    });
  }, []);

  const processDocument = useCallback(
    async (imageFile: File, documentType: string) => {
      abortRef.current = false;

      setState({
        status: "loading",
        progress: 0,
        stage: "Analyzing document...",
        result: null,
        error: null,
      });

      // Set up timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutRef.current = setTimeout(() => {
          reject(new Error("OCR_TIMEOUT"));
        }, TIMEOUT_MS);
      });

      try {
        // Dynamic import of lib/ocr.ts
        const { processDocument: ocrProcess } = await import("@/lib/ocr");

        if (abortRef.current) return;

        setState((prev) => ({
          ...prev,
          progress: 20,
          stage: "Analyzing document...",
        }));

        const resultPromise = ocrProcess(
          imageFile,
          documentType,
          (progress: number) => {
            if (!abortRef.current) {
              const mappedProgress = 20 + progress * 0.7;
              const stage =
                progress < 50 ? "Analyzing document..." : "Extracting fields...";
              setState((prev) => ({
                ...prev,
                progress: Math.round(mappedProgress),
                stage,
              }));
            }
          }
        );

        const result = await Promise.race([resultPromise, timeoutPromise]);

        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }

        if (abortRef.current) return;

        setState({
          status: "success",
          progress: 100,
          stage: "Complete",
          result,
          error: null,
        });

        return result;
      } catch (err) {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }

        if (abortRef.current) return;

        const isTimeout =
          err instanceof Error && err.message === "OCR_TIMEOUT";

        setState({
          status: isTimeout ? "timeout" : "error",
          progress: 0,
          stage: "",
          result: null,
          error: isTimeout
            ? "OCR processing timed out. Please fill in the fields manually."
            : err instanceof Error
              ? err.message
              : "An unexpected error occurred during OCR processing.",
        });

        return null;
      }
    },
    []
  );

  return {
    ...state,
    processDocument,
    reset,
  };
}
