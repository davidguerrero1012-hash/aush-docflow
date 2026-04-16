"use client";

import { Suspense } from "react";
import { FormShell } from "@/components/form/form-shell";

export default function FormPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-sm text-zinc-400">Loading...</div>
        </div>
      }
    >
      <FormShell />
    </Suspense>
  );
}
