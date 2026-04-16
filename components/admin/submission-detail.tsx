"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Download,
  Loader2,
} from "lucide-react";
import type { Submission, OCRField } from "@/types";

interface SubmissionDetailProps {
  submission: Submission;
  documentUrl: string | null;
  pdfUrl: string | null;
}


function ConfidenceBadge({ confidence }: { confidence: number }) {
  const level =
    confidence >= 80 ? "high" : confidence >= 50 ? "medium" : "low";
  const config = {
    high: {
      label: `${confidence}% High`,
      className: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    medium: {
      label: `${confidence}% Medium`,
      className: "bg-amber-50 text-amber-700 border-amber-200",
    },
    low: {
      label: `${confidence}% Low`,
      className: "bg-red-50 text-red-700 border-red-200",
    },
  };
  const c = config[level];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        c.className
      )}
      aria-label={`Confidence: ${c.label}`}
    >
      {c.label}
    </span>
  );
}

function InfoRow({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:items-baseline sm:gap-4">
      <dt className="min-w-[140px] text-sm text-zinc-500">{label}</dt>
      <dd className="text-sm font-medium text-zinc-900">
        {value ?? <span className="text-zinc-400">-</span>}
      </dd>
    </div>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="border-b border-zinc-100 pb-3">
        <CardTitle className="text-base font-semibold tracking-tight text-zinc-900">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <dl className="space-y-3">{children}</dl>
      </CardContent>
    </Card>
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/admin/dashboard")}
            aria-label="Back to submissions"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
              {submission.firstName} {submission.lastName}
            </h1>
            <p className="text-sm text-zinc-500">
              {submission.referenceNumber} &middot;{" "}
              {new Date(submission.createdAt).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Label className="text-sm text-zinc-500">Status</Label>
            <Select value={status} onValueChange={(val) => val && handleStatusChange(val)}>
              <SelectTrigger
                className={cn(
                  "h-9 w-32",
                  statusSaving && "opacity-70"
                )}
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

          {pdfUrl && (
            <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm">
                <Download className="mr-1.5 h-3.5 w-3.5" />
                PDF
              </Button>
            </a>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Personal Info */}
          <SectionCard title="Personal Information">
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
                  {showSsn && ssnValue
                    ? `***-**-${ssnValue}`
                    : "***-**-****"}
                </span>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={handleShowSsn}
                  disabled={ssnLoading}
                  aria-label={showSsn ? "Hide SSN" : "Show SSN"}
                >
                  {ssnLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : showSsn ? (
                    <EyeOff className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                </Button>
              </dd>
            </div>
          </SectionCard>

          {/* Address Info */}
          <SectionCard title="Address Information">
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
          </SectionCard>

          {/* Employment Info */}
          <SectionCard title="Employment Information">
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
          </SectionCard>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Document Info */}
          <SectionCard title="Document Information">
            <InfoRow
              label="Document Type"
              value={formatDocType(submission.documentType)}
            />
            {documentUrl && (
              <div className="pt-2">
                <div className="overflow-hidden rounded-lg border border-zinc-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={documentUrl}
                    alt="Uploaded document"
                    className="w-full object-contain"
                  />
                </div>
              </div>
            )}
          </SectionCard>

          {/* OCR Data */}
          {submission.ocrData && submission.ocrData.fields.length > 0 && (
            <SectionCard title="OCR Results">
              <p className="text-xs text-zinc-500">
                Processed in {submission.ocrData.processingTimeMs}ms
              </p>
              <div className="space-y-2 pt-1">
                {submission.ocrData.fields.map(
                  (field: OCRField, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-lg border border-zinc-100 bg-zinc-50/50 px-3 py-2"
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
            </SectionCard>
          )}

          {/* Additional Info */}
          <SectionCard title="Additional Information">
            <InfoRow
              label="Insurance"
              value={submission.insuranceProvider}
            />
            <InfoRow
              label="Policy #"
              value={submission.policyNumber}
            />
            <InfoRow
              label="Dependents"
              value={submission.dependentsCount}
            />
            <InfoRow
              label="Notes"
              value={submission.additionalNotes}
            />
          </SectionCard>

          {/* Admin Notes */}
          <Card className="shadow-sm">
            <CardHeader className="border-b border-zinc-100 pb-3">
              <CardTitle className="text-base font-semibold tracking-tight text-zinc-900">
                Admin Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <Textarea
                placeholder="Add internal notes about this submission..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                onBlur={handleNotesBlur}
                className="min-h-24 resize-y"
                rows={4}
              />
              <p className="mt-1.5 text-xs text-zinc-400">
                Auto-saves when you click away
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
