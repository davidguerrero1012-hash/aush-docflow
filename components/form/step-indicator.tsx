"use client";

import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STEP_LABELS = [
  "Personal",
  "Address",
  "Employment",
  "Document",
  "Additional",
  "Review",
];

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

export function StepIndicator({ currentStep, totalSteps }: StepIndicatorProps) {
  const progressPercent = ((currentStep + 1) / totalSteps) * 100;

  return (
    <div
      role="progressbar"
      aria-valuenow={currentStep + 1}
      aria-valuemin={1}
      aria-valuemax={totalSteps}
      aria-label={`Step ${currentStep + 1} of ${totalSteps}: ${STEP_LABELS[currentStep]}`}
    >
      {/* Mobile: Progress bar */}
      <div className="sm:hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-zinc-900">
            Step {currentStep + 1} of {totalSteps}
          </span>
          <span className="text-sm text-zinc-500">
            {STEP_LABELS[currentStep]}
          </span>
        </div>
        <div className="h-1 w-full rounded-full bg-zinc-100 overflow-hidden">
          <div
            className="h-full bg-indigo-500 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Desktop: Numbered circles with connecting lines */}
      <div className="hidden sm:flex items-center justify-center">
        {Array.from({ length: totalSteps }).map((_, index) => {
          const isCompleted = index < currentStep;
          const isActive = index === currentStep;
          const isUpcoming = index > currentStep;

          return (
            <div key={index} className="flex items-center">
              {/* Circle */}
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-all duration-200",
                    isCompleted &&
                      "bg-indigo-500 text-white",
                    isActive &&
                      "bg-indigo-500 text-white ring-4 ring-indigo-500/20",
                    isUpcoming &&
                      "bg-zinc-100 text-zinc-400"
                  )}
                >
                  {isCompleted ? (
                    <Check className="h-4 w-4" strokeWidth={2.5} />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                </div>
                <span
                  className={cn(
                    "mt-1.5 text-xs font-medium transition-colors duration-200",
                    isActive && "text-indigo-600",
                    isCompleted && "text-zinc-600",
                    isUpcoming && "text-zinc-400"
                  )}
                >
                  {STEP_LABELS[index]}
                </span>
              </div>

              {/* Connecting line */}
              {index < totalSteps - 1 && (
                <div
                  className={cn(
                    "mx-2 h-0.5 w-8 lg:w-12 rounded-full transition-colors duration-200 -mt-5",
                    index < currentStep ? "bg-indigo-500" : "bg-zinc-200"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
