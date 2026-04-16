"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Submission, OCRField } from "@/types";

interface SubmissionDetailProps {
  submission: Submission;
  documentUrl: string | null;
  pdfUrl: string | null;
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-4">
      <dt className="min-w-[140px] text-sm text-zinc-500">{label}</dt>
      <dd className="text-sm font-medium text-zinc-900">
        {value ?? <span className="text-zinc-400">-</span>}
      </dd>
    </div>
  );
}

function SectionBox({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-zinc-200 bg-white p-6">
      <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-zinc-500">
        {title}
      </h3>
      <dl className="space-y-3">{children}</dl>
    </div>
  );
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const level =
    confidence >= 80 ? "high" : confidence >= 50 ? "medium" : "low";
  const colors = {
    high: "text-emerald-700",
    medium: "text-amber-700",
    low: "text-red-700",
  };
  return (
    <span className={`text-xs font-medium ${colors[level]}`}>
      {confidence}%
    </span>
  );
}

export function SubmissionDetail({
  submission,
  documentUrl,
  pdfUrl,
}: SubmissionDetailProps) {
  const router = useRouter();
  const supabase = createClient();

  const [status, setStatus] = useState<Submission["status"]>(submission.status);
  const [adminNotes, setAdminNotes] = useState(submission.adminNotes ?? "");
  const [showSsn, setShowSsn] = useState(false);
  const [ssnValue, setSsnValue] = useState<string | null>(null);
  const [ssnLoading, setSsnLoading] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);

  const handleStatusChange = useCallback(
    async (newStatus: string) => {
      const validStatus = newStatus as Submission["status"];
      const previousStatus = status;
      setStatus(validStatus);
      setStatusSaving(true);

      try {
        const { error } = await supabase
          .from("submissions")
          .update({ status: validStatus })
          .eq("id", submission.id);

        if (error) {
          setStatus(previousStatus);
          console.error("Failed to update status:", error);
        }
      } catch {
        setStatus(previousStatus);
      } finally {
        setStatusSaving(false);
      }
    },
    [status, submission.id, supabase]
  );

  const handleNotesBlur = useCallback(async () => {
    if (adminNotes === (submission.adminNotes ?? "")) return;

    try {
      const { error } = await supabase
        .from("submissions")
        .update({ admin_notes: adminNotes || null })
        .eq("id", submission.id);

      if (error) {
        console.error("Failed to update notes:", error);
      }
    } catch {
      console.error("Failed to save admin notes");
    }
  }, [adminNotes, submission.id, submission.adminNotes, supabase]);

  const handleShowSsn = useCallback(async () => {
    if (showSsn) {
      setShowSsn(false);
      setSsnValue(null);
      return;
    }

    setSsnLoading(true);
    try {
      const res = await fetch(`/api/admin/decrypt-ssn/${submission.id}`, {
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setSsnValue(data.ssnLast4);
        setShowSsn(true);
      }
    } catch {
      console.error("Failed to decrypt SSN");
    } finally {
      setSsnLoading(false);
    }
  }, [showSsn, submission.id]);

  const formatDocType = (type: string) => {
    return type
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const STATUS_DOT: Record<Submission["status"], string> = {
    new: "bg-blue-500",
    reviewed: "bg-emerald-500",
    flagged: "bg-red-500",
  };

  const STATUS_LABEL: Record<Submission["status"], string> = {
    new: "New",
    reviewed: "Reviewed",
    flagged: "Flagged",
  };

  return (
    <div className="space-y-6">
      {/* Back link */}
      <button
        onClick={() => router.push("/admin/dashboard")}
        className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
      >
        <span aria-hidden="true">&larr;</span>
        Back to submissions
      </button>

      {/* Title row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
            {submission.referenceNumber}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {submission.firstName} {submission.lastName}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 text-sm text-zinc-600">
            <span
              className={`inline-block h-2 w-2 rounded-full ${STATUS_DOT[status]}`}
            />
            {STATUS_LABEL[status]}
          </span>
          <span className="text-sm text-zinc-400">
            {new Date(submission.createdAt).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </span>
          {pdfUrl ? (
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-9 items-center border border-zinc-200 bg-white px-3 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors"
            >
              Download PDF
            </a>
          ) : (
            <button
              type="button"
              onClick={async () => {
                try {
                  const res = await fetch("/api/generate-pdf", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      "x-internal-secret": "admin-trigger",
                    },
                    body: JSON.stringify({ submissionId: submission.id }),
                  });
                  if (res.ok) {
                    const data = await res.json();
                    if (data.pdfUrl) {
                      window.open(data.pdfUrl, "_blank");
                    }
                  }
                } catch {
                  // ignore
                }
              }}
              className="inline-flex h-9 items-center border border-zinc-200 bg-white px-3 text-sm text-zinc-700 hover:bg-zinc-50 transition-colors"
            >
              Generate PDF
            </button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Personal Information */}
          <SectionBox title="Personal Information">
            <InfoRow label="First Name" value={submission.firstName} />
            <InfoRow label="Last Name" value={submission.lastName} />
            <InfoRow label="Date of Birth" value={submission.dateOfBirth} />
            <InfoRow label="Phone" value={submission.phone} />
            <InfoRow label="Email" value={submission.email} />
            <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center sm:gap-4">
              <dt className="min-w-[140px] text-sm text-zinc-500">
                SSN (Last 4)
              </dt>
              <dd className="flex items-center gap-2">
                <span className="text-sm font-medium text-zinc-900">
                  {showSsn && ssnValue ? `***-**-${ssnValue}` : "----"}
                </span>
                <button
                  onClick={handleShowSsn}
                  disabled={ssnLoading}
                  className="text-sm text-blue-800 hover:text-blue-800 disabled:opacity-50 transition-colors"
                >
                  {ssnLoading
                    ? "Loading..."
                    : showSsn
                      ? "Hide"
                      : "Reveal"}
                </button>
              </dd>
            </div>
          </SectionBox>

          {/* Address */}
          <SectionBox title="Address">
            <InfoRow label="Street" value={submission.streetAddress} />
            <InfoRow label="City" value={submission.city} />
            <InfoRow label="State" value={submission.state} />
            <InfoRow label="ZIP Code" value={submission.zipCode} />
            <InfoRow
              label="Mailing Same"
              value={submission.mailingSameAsResidential ? "Yes" : "No"}
            />
            {!submission.mailingSameAsResidential &&
              submission.mailingAddress && (
                <>
                  <InfoRow
                    label="Mailing Street"
                    value={submission.mailingAddress.street}
                  />
                  <InfoRow
                    label="Mailing City"
                    value={submission.mailingAddress.city}
                  />
                  <InfoRow
                    label="Mailing State"
                    value={submission.mailingAddress.state}
                  />
                  <InfoRow
                    label="Mailing ZIP"
                    value={submission.mailingAddress.zip}
                  />
                </>
              )}
          </SectionBox>

          {/* Employment */}
          <SectionBox title="Employment">
            <InfoRow label="Employer" value={submission.employerName} />
            <InfoRow label="Occupation" value={submission.occupation} />
            <InfoRow
              label="Annual Income"
              value={`$${Number(submission.annualIncome).toLocaleString()}`}
            />
            <InfoRow
              label="Status"
              value={formatDocType(submission.employmentStatus)}
            />
          </SectionBox>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Document */}
          <SectionBox title="Document">
            <InfoRow
              label="Document Type"
              value={formatDocType(submission.documentType)}
            />
            {documentUrl && (
              <div className="pt-2">
                <div className="overflow-hidden border border-zinc-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={documentUrl}
                    alt="Uploaded document"
                    className="w-full object-contain"
                  />
                </div>
              </div>
            )}
            {submission.ocrData && submission.ocrData.fields.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-xs text-zinc-400">
                  OCR Results (processed in {submission.ocrData.processingTimeMs}
                  ms)
                </p>
                {submission.ocrData.fields.map(
                  (field: OCRField, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between border-b border-zinc-100 py-2"
                    >
                      <div>
                        <p className="text-xs text-zinc-500">
                          {field.fieldName}
                        </p>
                        <p className="text-sm font-medium text-zinc-900">
                          {field.value}
                        </p>
                      </div>
                      <ConfidenceBadge confidence={field.confidence} />
                    </div>
                  )
                )}
              </div>
            )}
          </SectionBox>

          {/* Additional */}
          <SectionBox title="Additional">
            <InfoRow label="Insurance" value={submission.insuranceProvider} />
            <InfoRow label="Policy #" value={submission.policyNumber} />
            <InfoRow label="Dependents" value={submission.dependentsCount} />
            <InfoRow label="Notes" value={submission.additionalNotes} />
          </SectionBox>

          {/* Admin */}
          <div className="border border-zinc-200 bg-white p-6">
            <h3 className="mb-4 text-xs font-medium uppercase tracking-wider text-zinc-500">
              Admin
            </h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm text-zinc-500">Status</label>
                <Select
                  value={status}
                  onValueChange={(val) => val && handleStatusChange(val)}
                >
                  <SelectTrigger
                    className={`h-9 w-full ${statusSaving ? "opacity-70" : ""}`}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-blue-500" />
                        New
                      </span>
                    </SelectItem>
                    <SelectItem value="reviewed">
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        Reviewed
                      </span>
                    </SelectItem>
                    <SelectItem value="flagged">
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-red-500" />
                        Flagged
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm text-zinc-500">Admin Notes</label>
                <textarea
                  placeholder="Add internal notes about this submission..."
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  onBlur={handleNotesBlur}
                  className="min-h-24 w-full resize-y border border-zinc-200 bg-white p-3 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-zinc-400 transition-colors"
                  rows={4}
                />
                <p className="text-xs text-zinc-400">
                  Auto-saves when you click away
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
