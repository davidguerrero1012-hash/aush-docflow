"use client";

import { Skeleton } from "@/components/ui/skeleton";

interface OcrProcessorProps {
 progress: number;
 stage: string;
 documentPreview: string | null;
}

export function OcrProcessor({
 progress,
 stage,
 documentPreview,
}: OcrProcessorProps) {
 return (
  <div className="space-y-5">
   {/* Document preview with scan animation */}
   <div className="relative mx-auto max-w-[280px] overflow-hidden border border-zinc-200 bg-white shadow-sm">
    {documentPreview ? (
     // eslint-disable-next-line @next/next/no-img-element
     <img
      src={documentPreview}
      alt="Document being processed"
      className="block w-full opacity-60"
     />
    ) : (
     <div className="aspect-[3/2] bg-zinc-100" />
    )}

    {/* Animated scan line */}
    <div
     className="pointer-events-none absolute inset-x-0 h-1"
     style={{
      background:
       "linear-gradient(180deg, transparent, rgba(99, 102, 241, 0.4), transparent)",
      height: "40px",
      animation: "ocrScan 2s ease-in-out infinite",
     }}
    />

    <style>{`
     @keyframes ocrScan {
      0% { top: -40px; }
      100% { top: calc(100% + 40px); }
     }
    `}</style>
   </div>

   {/* Progress info */}
   <div className="text-center">
    <p className="text-sm font-medium text-zinc-900">
     {stage || "Processing..."}
    </p>
    <p className="mt-1 text-2xl font-semibold tabular-nums text-blue-700">
     {progress}%
    </p>
    <div className="mx-auto mt-3 h-1.5 w-48 overflow-hidden rounded-full bg-zinc-100">
     <div
      className="h-full rounded-full bg-blue-700 transition-all duration-300 ease-out"
      style={{ width: `${progress}%` }}
     />
    </div>
   </div>

   {/* Skeleton loaders for upcoming fields */}
   <div className="space-y-3 pt-2">
    <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
     Extracting fields...
    </p>
    {Array.from({ length: 5 }).map((_, i) => (
     <div key={i} className="flex items-center gap-3">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-9 flex-1" />
     </div>
    ))}
   </div>
  </div>
 );
}
