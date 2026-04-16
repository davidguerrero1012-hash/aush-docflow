"use client";

import { useEffect, useState, Suspense, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { BlurFade } from "@/components/ui/blur-fade";
import Link from "next/link";

type PDFStatus = "checking" | "ready" | "unavailable";

const PDF_POLL_INTERVAL = 3000;
const PDF_MAX_TIMEOUT = 30_000;

function SuccessContent() {
  const searchParams = useSearchParams();
  const refNumber = searchParams.get("ref");

  const [isValid] = useState<boolean | null>(refNumber ? true : false);
  const [pdfStatus, setPdfStatus] = useState<PDFStatus>("checking");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!refNumber || !isValid) return;

    let elapsed = 0;
    let cancelled = false;

    const poll = async () => {
      if (cancelled || elapsed >= PDF_MAX_TIMEOUT) {
        if (!cancelled) setPdfStatus("unavailable");
        return;
      }

      try {
        const res = await fetch(
          `/api/generate-pdf?ref=${encodeURIComponent(refNumber)}`
        );
        if (res.ok) {
          const data = await res.json();
          if (data.url) {
            setPdfUrl(data.url);
            setPdfStatus("ready");
            return;
          }
        }
      } catch {
        // Continue polling
      }

      elapsed += PDF_POLL_INTERVAL;
      if (!cancelled) {
        setTimeout(poll, PDF_POLL_INTERVAL);
      }
    };

    poll();

    return () => {
      cancelled = true;
    };
  }, [refNumber, isValid]);

  const handleDownload = useCallback(() => {
    if (pdfUrl) {
      window.open(pdfUrl, "_blank");
    }
  }, [pdfUrl]);

  if (isValid === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-sm text-zinc-400">Loading...</p>
      </div>
    );
  }

  if (!isValid) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="text-center max-w-md">
          <h1 className="text-xl font-semibold text-zinc-900">
            Invalid Reference
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            The reference number provided is not valid.
          </p>
          <Link
            href="/form"
            className="mt-6 inline-flex h-11 items-center justify-center bg-zinc-900 px-6 text-sm font-medium text-white hover:bg-zinc-800 transition-colors"
          >
            Start New Application
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6">
      <div className="w-full max-w-lg text-center">

        {/* Confirmation line — no emoji, just a horizontal rule that draws in */}
        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="mx-auto mb-8 h-px w-24 bg-blue-700 origin-center"
        />

        <BlurFade delay={0.2} inView>
          <p className="text-xs font-medium uppercase tracking-[0.25em] text-zinc-400 mb-3">
            Submission Confirmed
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
            We received your application
          </h1>
        </BlurFade>

        {/* Reference number */}
        <BlurFade delay={0.4} inView>
          <div className="mt-8">
            <p className="text-xs text-zinc-400 mb-2 uppercase tracking-wider">Reference</p>
            <p className="font-mono text-xl font-semibold text-zinc-900 tracking-wider">
              {refNumber}
            </p>
          </div>
        </BlurFade>

        {/* Divider */}
        <BlurFade delay={0.5} inView>
          <div className="mx-auto mt-8 h-px w-16 bg-zinc-200" />
        </BlurFade>

        {/* Email note */}
        <BlurFade delay={0.6} inView>
          <p className="mt-8 text-sm text-zinc-500">
            A confirmation email with your PDF summary has been sent.
          </p>
        </BlurFade>

        {/* PDF Download */}
        <BlurFade delay={0.7} inView>
          <div className="mt-6">
            {pdfStatus === "checking" && (
              <p className="text-sm text-zinc-400">
                Generating PDF...
              </p>
            )}
            {pdfStatus === "ready" && (
              <button
                onClick={handleDownload}
                className="inline-flex h-11 items-center justify-center border border-zinc-300 bg-white px-6 text-sm font-medium text-zinc-900 hover:bg-zinc-50 transition-colors"
              >
                Download PDF
              </button>
            )}
            {pdfStatus === "unavailable" && (
              <p className="text-sm text-zinc-400">
                PDF will be emailed to you shortly.
              </p>
            )}
          </div>
        </BlurFade>

        {/* What happens next */}
        <BlurFade delay={0.9} inView>
          <div className="mt-12 border border-zinc-200 bg-white p-6 text-left">
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-400 mb-4">
              What happens next
            </p>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 bg-blue-700" />
                <p className="text-sm text-zinc-600">Your application is now being reviewed by our team.</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 bg-blue-700" />
                <p className="text-sm text-zinc-600">Processing typically takes 1-2 business days.</p>
              </div>
              <div className="flex items-start gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 bg-blue-700" />
                <p className="text-sm text-zinc-600">You will receive an email when your status changes.</p>
              </div>
            </div>
          </div>
        </BlurFade>

        {/* Back */}
        <BlurFade delay={1.1} inView>
          <div className="mt-8">
            <Link
              href="/"
              className="text-sm text-zinc-400 hover:text-zinc-600 transition-colors"
            >
              Back to home
            </Link>
          </div>
        </BlurFade>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <p className="text-sm text-zinc-400">Loading...</p>
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
