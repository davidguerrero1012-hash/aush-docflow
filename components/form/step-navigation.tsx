"use client";

import { Loader2 } from "lucide-react";

interface StepNavigationProps {
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onBack: () => void;
  onSubmit: () => void;
  onSkip?: () => void;
  isSubmitting: boolean;
  isOptional?: boolean;
}

export function StepNavigation({
  currentStep,
  totalSteps,
  onNext,
  onBack,
  onSubmit,
  onSkip,
  isSubmitting,
  isOptional,
}: StepNavigationProps) {
  const isFirst = currentStep === 0;
  const isReview = currentStep === totalSteps - 1;
  const isBeforeReview = currentStep === totalSteps - 2;

  return (
    <div className="mt-8 space-y-4">
      <div className="flex items-center gap-4">
        {isReview ? (
          <button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitting}
            className="h-12 w-full bg-zinc-900 text-base font-medium text-white hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting...
              </span>
            ) : (
              "Submit"
            )}
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={onNext}
              disabled={isSubmitting}
              className="h-12 bg-zinc-900 px-8 text-base font-medium text-white hover:bg-zinc-800 transition-colors disabled:opacity-50"
            >
              {isBeforeReview ? "Continue to review" : "OK"}
            </button>
            <span className="text-sm text-zinc-400">
              press Enter {"<-'"}
            </span>
          </>
        )}
      </div>

      {isOptional && onSkip && !isReview && (
        <button
          type="button"
          onClick={onSkip}
          className="text-sm text-zinc-400 underline underline-offset-2 hover:text-zinc-600 transition-colors"
        >
          Skip
        </button>
      )}

      {!isFirst && !isReview && (
        <p className="text-xs text-zinc-400">
          Shift + Enter to go back
        </p>
      )}
    </div>
  );
}
