"use client";

import { useEffect, useState, Suspense, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { Download, ArrowRight, CheckCircle2, Clock, Mail, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

type PDFStatus = "checking" | "ready" | "unavailable";

const PDF_POLL_INTERVAL = 3000;
const PDF_MAX_TIMEOUT = 30_000;

function SuccessContent() {
  const searchParams = useSearchParams();
  const refNumber = searchParams.get("ref");

  const [isValid, setIsValid] = useState<boolean | null>(refNumber ? null : false);
  const [pdfStatus, setPdfStatus] = useState<PDFStatus>("checking");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  // Validate reference number
  useEffect(() => {
    if (!refNumber) return;

    async function validate() {
      try {
        const res = await fetch(`/api/submit?ref=${encodeURIComponent(refNumber!)}`);
        if (res.ok) {
          setIsValid(true);
        } else {
          setIsValid(false);
        }
      } catch {
        // If validation fails (e.g., API not ready), still show the page
        setIsValid(true);
      }
    }

    validate();
  }, [refNumber]);

  // Poll for PDF readiness
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
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="animate-pulse text-center">
          <div className="mx-auto h-16 w-16 rounded-full bg-zinc-200" />
          <div className="mt-4 h-6 w-48 rounded bg-zinc-200 mx-auto" />
        </div>
      </div>
    );
  }

  if (!isValid) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="text-center max-w-md">
          <h1 className="text-xl font-semibold text-zinc-900">
            Invalid Reference
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            The reference number provided is not valid. Please check your
            confirmation email for the correct reference.
          </p>
          <Link href="/form">
            <Button className="mt-6 h-11 bg-indigo-500 text-white hover:bg-indigo-600">
              Start New Application
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md text-center">
        {/* Animated checkmark */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
          className="mx-auto mb-6"
        >
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50">
            <motion.svg
              viewBox="0 0 52 52"
              className="h-10 w-10"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <motion.circle
                cx="26"
                cy="26"
                r="24"
                fill="none"
                stroke="#10b981"
                strokeWidth="3"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.4, delay: 0.2 }}
              />
              <motion.path
                d="M15 27l7 7 15-15"
                fill="none"
                stroke="#10b981"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.4, delay: 0.5 }}
              />
            </motion.svg>
          </div>
        </motion.div>

        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
            Your Submission Has Been Received
          </h1>
        </motion.div>

        {/* Reference number */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-6"
        >
          <p className="text-sm text-zinc-500 mb-2">Reference Number</p>
          <div className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-6 py-3">
            <span className="font-mono text-lg font-semibold text-zinc-900 tracking-wider">
              {refNumber}
            </span>
          </div>
        </motion.div>

        {/* Email confirmation */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-4 flex items-center justify-center gap-2 text-sm text-zinc-500"
        >
          <Mail className="h-4 w-4" />
          <span>
            A confirmation email with your PDF summary has been sent to your
            email.
          </span>
        </motion.div>

        {/* PDF Download */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="mt-6"
        >
          {pdfStatus === "checking" && (
            <div className="flex items-center justify-center gap-2 text-sm text-zinc-400">
              <Clock className="h-4 w-4 animate-pulse" />
              <span>Generating your PDF summary...</span>
            </div>
          )}
          {pdfStatus === "ready" && (
            <Button
              onClick={handleDownload}
              className="h-11 bg-indigo-500 text-white hover:bg-indigo-600 shadow-lg shadow-indigo-500/25"
            >
              <Download className="mr-1.5 h-4 w-4" />
              Download PDF Summary
            </Button>
          )}
          {pdfStatus === "unavailable" && (
            <div className="flex items-center justify-center gap-2 text-sm text-zinc-400">
              <FileText className="h-4 w-4" />
              <span>PDF will be emailed to you shortly.</span>
            </div>
          )}
        </motion.div>

        {/* What happens next */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mt-10 rounded-xl border border-zinc-200 bg-white p-6 text-left shadow-sm"
        >
          <h3 className="text-sm font-semibold text-zinc-900 mb-4">
            What Happens Next
          </h3>
          <ul className="space-y-3">
            {[
              {
                icon: CheckCircle2,
                text: "Your application is now being reviewed by our team.",
              },
              {
                icon: Clock,
                text: "Processing typically takes 1-2 business days.",
              },
              {
                icon: Mail,
                text: "You'll receive an email update when your application status changes.",
              },
            ].map((item, i) => (
              <li key={i} className="flex items-start gap-3">
                <item.icon className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
                <span className="text-sm text-zinc-600">{item.text}</span>
              </li>
            ))}
          </ul>
        </motion.div>

        {/* Back to home */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="mt-6"
        >
          <Link
            href="/"
            className="inline-flex items-center gap-1 text-sm text-indigo-500 hover:text-indigo-600 transition-colors"
          >
            Back to Home
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </motion.div>
      </div>
    </div>
  );
}

export default function SuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="animate-pulse text-center">
            <div className="mx-auto h-16 w-16 rounded-full bg-zinc-200" />
            <div className="mt-4 h-6 w-48 rounded bg-zinc-200 mx-auto" />
          </div>
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
