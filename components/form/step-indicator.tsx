"use client";

import { motion } from "motion/react";

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
}

export function StepIndicator({ currentStep, totalSteps }: StepIndicatorProps) {
  const progressPercent = ((currentStep + 1) / totalSteps) * 100;

  return (
    <div
      className="fixed left-0 right-0 top-0 z-50"
      role="progressbar"
      aria-valuenow={currentStep + 1}
      aria-valuemin={1}
      aria-valuemax={totalSteps}
      aria-label={`Question ${currentStep + 1} of ${totalSteps}`}
    >
      <div className="h-1 w-full bg-zinc-200">
        <motion.div
          className="h-full bg-blue-700"
          initial={false}
          animate={{ width: `${progressPercent}%` }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        />
      </div>
      {/* Mobile question count */}
      <div className="absolute right-3 top-2 sm:hidden">
        <span className="text-xs tabular-nums text-zinc-400">
          {currentStep + 1} / {totalSteps}
        </span>
      </div>
    </div>
  );
}
