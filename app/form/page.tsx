"use client";

import { Suspense } from "react";
import { FormShell } from "@/components/form/form-shell";

function FormContent() {
  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-8">
      <FormShell />
    </div>
  );
}

export default function FormPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-2xl px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-8 w-48 rounded bg-zinc-200" />
            <div className="rounded-xl border border-zinc-200 bg-white p-8">
              <div className="space-y-4">
                <div className="h-6 w-32 rounded bg-zinc-200" />
                <div className="h-11 rounded-lg bg-zinc-100" />
                <div className="h-11 rounded-lg bg-zinc-100" />
                <div className="h-11 rounded-lg bg-zinc-100" />
              </div>
            </div>
          </div>
        </div>
      }
    >
      <FormContent />
    </Suspense>
  );
}
