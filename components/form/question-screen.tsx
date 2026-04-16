"use client";

import type { ReactNode } from "react";
import { BlurFade } from "@/components/ui/blur-fade";

interface QuestionScreenProps {
  questionNumber: number;
  questionText: string;
  subtitle?: string;
  children: ReactNode;
  isOptional?: boolean;
}

export function QuestionScreen({
  questionNumber,
  questionText,
  subtitle,
  children,
  isOptional,
}: QuestionScreenProps) {
  return (
    <div className="flex min-h-[calc(100vh-60px)] flex-col items-center justify-center px-4">
      <div className="w-full max-w-xl">
        <BlurFade delay={0.05} inView>
          <p className="mb-2 text-sm text-zinc-400">
            {questionNumber} {"->"}
            {isOptional && (
              <span className="ml-2 text-xs text-zinc-400">Optional</span>
            )}
          </p>
        </BlurFade>
        <BlurFade delay={0.15} inView>
          <h2 className="text-2xl font-semibold text-zinc-900 sm:text-3xl">
            {questionText}
          </h2>
        </BlurFade>
        {subtitle && (
          <BlurFade delay={0.25} inView>
            <p className="mt-2 text-base text-zinc-500">{subtitle}</p>
          </BlurFade>
        )}
        <BlurFade delay={0.3} inView>
          <div className="mt-8">{children}</div>
        </BlurFade>
      </div>
    </div>
  );
}
