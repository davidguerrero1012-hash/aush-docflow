"use client";

import { useEffect, useCallback, useRef } from "react";
import type { UseFormReturn, FieldValues } from "react-hook-form";

const STORAGE_KEY = "aush-docflow-form-v1";
const DEBOUNCE_MS = 500;

interface PersistedData {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  formData: Record<string, any>;
  currentStep: number;
  timestamp: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function stripSensitiveFields(data: Record<string, any>): Record<string, any> {
  const clone = JSON.parse(JSON.stringify(data));
  if (clone.personalInfo) {
    clone.personalInfo.ssnLast4 = "";
  }
  return clone;
}

export function useFormPersistence<T extends FieldValues>(
  form: UseFormReturn<T>,
  currentStep: number
) {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Restore data on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return;

      const parsed: PersistedData = JSON.parse(stored);
      if (!parsed.formData || !parsed.timestamp) return;

      // Check if data is older than 24 hours
      const dayMs = 24 * 60 * 60 * 1000;
      if (Date.now() - parsed.timestamp > dayMs) {
        localStorage.removeItem(STORAGE_KEY);
        return;
      }

      // Restore form values (ssnLast4 will be empty string)
      form.reset(parsed.formData as T, {
        keepDefaultValues: true,
      });
    } catch {
      // If parsing fails, clear corrupted data
      localStorage.removeItem(STORAGE_KEY);
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Save on change (debounced)
  useEffect(() => {
    const subscription = form.watch((values) => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      debounceRef.current = setTimeout(() => {
        try {
          const safeData = stripSensitiveFields(
            values as Record<string, unknown>
          );
          const persistData: PersistedData = {
            formData: safeData,
            currentStep,
            timestamp: Date.now(),
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(persistData));
        } catch {
          // localStorage full or unavailable — silently fail
        }
      }, DEBOUNCE_MS);
    });

    return () => {
      subscription.unsubscribe();
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [form, currentStep]);

  const clearPersistedData = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const getPersistedStep = useCallback((): number | null => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return null;
      const parsed: PersistedData = JSON.parse(stored);
      return parsed.currentStep ?? null;
    } catch {
      return null;
    }
  }, []);

  return { clearPersistedData, getPersistedStep };
}
