"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Loader2, Send } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepNavigationProps {
  currentStep: number;
  onNext: () => void;
  onBack: () => void;
  onSubmit: () => void;
  isSubmitting: boolean;
}

export function StepNavigation({
  currentStep,
  onNext,
  onBack,
  onSubmit,
  isSubmitting,
}: StepNavigationProps) {
  const isFirst = currentStep === 0;
  const isLast = currentStep === 5;

  return (
    <>
      {/* Mobile: Fixed bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-200 bg-white/80 p-4 backdrop-blur-xl sm:hidden">
        <div className="flex items-center justify-between gap-3">
          {!isFirst && (
            <Button
              type="button"
              variant="ghost"
              onClick={onBack}
              disabled={isSubmitting}
              className="h-11 flex-1 text-zinc-600 active:scale-[0.98] transition-transform duration-200"
            >
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Back
            </Button>
          )}
          {isLast ? (
            <Button
              type="button"
              onClick={onSubmit}
              disabled={isSubmitting}
              className={cn(
                "h-11 flex-1 bg-indigo-500 text-white hover:bg-indigo-600 active:scale-[0.98] transition-all duration-200",
                "shadow-lg shadow-indigo-500/25"
              )}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="mr-1.5 h-4 w-4" />
                  Submit Application
                </>
              )}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={onNext}
              disabled={isSubmitting}
              className="h-11 flex-1 bg-indigo-500 text-white hover:bg-indigo-600 active:scale-[0.98] transition-all duration-200"
            >
              Next
              <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Desktop: Relative position */}
      <div className="mt-8 hidden items-center justify-between sm:flex">
        {!isFirst ? (
          <Button
            type="button"
            variant="ghost"
            onClick={onBack}
            disabled={isSubmitting}
            className="h-11 px-6 text-zinc-600 active:scale-[0.98] transition-transform duration-200"
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back
          </Button>
        ) : (
          <div />
        )}
        {isLast ? (
          <Button
            type="button"
            onClick={onSubmit}
            disabled={isSubmitting}
            className={cn(
              "h-11 px-8 bg-indigo-500 text-white hover:bg-indigo-600 active:scale-[0.98] transition-all duration-200",
              "shadow-lg shadow-indigo-500/25"
            )}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              <>
                <Send className="mr-1.5 h-4 w-4" />
                Submit Application
              </>
            )}
          </Button>
        ) : (
          <Button
            type="button"
            onClick={onNext}
            disabled={isSubmitting}
            className="h-11 px-8 bg-indigo-500 text-white hover:bg-indigo-600 active:scale-[0.98] transition-all duration-200"
          >
            Next
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        )}
      </div>
    </>
  );
}
