"use client";

import { useFormContext, useWatch } from "react-hook-form";
import { motion } from "motion/react";
import { Pencil, FileText, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HoneypotField } from "@/components/shared/honeypot-field";
import type { IntakeFormData, OCRResult } from "@/types";

interface ReviewSubmitProps {
  onEditStep: (step: number) => void;
}

const EMPLOYMENT_STATUS_LABELS: Record<string, string> = {
  employed: "Employed",
  "self-employed": "Self-Employed",
  unemployed: "Unemployed",
  retired: "Retired",
  student: "Student",
};

const DOC_TYPE_LABELS: Record<string, string> = {
  drivers_license: "Driver's License",
  passport: "Passport",
  state_id: "State ID",
};

function ReviewCard({
  title,
  stepIndex,
  onEdit,
  children,
}: {
  title: string;
  stepIndex: number;
  onEdit: (step: number) => void;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm"
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => onEdit(stepIndex)}
          className="text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50"
        >
          <Pencil className="mr-1 h-3.5 w-3.5" />
          Edit
        </Button>
      </div>
      <div className="space-y-2">{children}</div>
    </motion.div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string | number | undefined | null }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1">
      <span className="text-sm text-zinc-500 shrink-0">{label}</span>
      <span className="text-sm font-medium text-zinc-900 text-right">
        {value ?? "---"}
      </span>
    </div>
  );
}

export function ReviewSubmit({ onEditStep }: ReviewSubmitProps) {
  const { control } = useFormContext<IntakeFormData>();

  const personal = useWatch({ control, name: "personalInfo" });
  const address = useWatch({ control, name: "addressInfo" });
  const employment = useWatch({ control, name: "employmentInfo" });
  const document = useWatch({ control, name: "documentUpload" });
  const additional = useWatch({ control, name: "additionalInfo" });

  const ocrData = document?.ocrData as OCRResult | null;

  return (
    <div className="space-y-1">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="mb-6"
      >
        <h2 className="text-xl font-semibold tracking-tight text-zinc-900">
          Review Your Application
        </h2>
        <p className="mt-1 text-sm text-zinc-500">
          Please review all information before submitting. Click Edit on any section to make changes.
        </p>
      </motion.div>

      <div className="space-y-4">
        {/* Personal Info */}
        <ReviewCard title="Personal Information" stepIndex={0} onEdit={onEditStep}>
          <ReviewRow label="Name" value={`${personal?.firstName || ""} ${personal?.lastName || ""}`} />
          <ReviewRow label="Date of Birth" value={personal?.dateOfBirth} />
          <ReviewRow label="SSN (Last 4)" value="••••" />
          <ReviewRow label="Phone" value={personal?.phone} />
          <ReviewRow label="Email" value={personal?.email} />
        </ReviewCard>

        {/* Address Info */}
        <ReviewCard title="Address Information" stepIndex={1} onEdit={onEditStep}>
          <ReviewRow label="Street" value={address?.streetAddress} />
          <ReviewRow
            label="City, State ZIP"
            value={`${address?.city || ""}, ${address?.state || ""} ${address?.zipCode || ""}`}
          />
          {!address?.mailingSameAsResidential && address?.mailingAddress && (
            <>
              <div className="my-2 border-t border-zinc-100" />
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider">
                Mailing Address
              </p>
              <ReviewRow label="Street" value={address.mailingAddress.street} />
              <ReviewRow
                label="City, State ZIP"
                value={`${address.mailingAddress.city}, ${address.mailingAddress.state} ${address.mailingAddress.zip}`}
              />
            </>
          )}
        </ReviewCard>

        {/* Employment Info */}
        <ReviewCard title="Employment Information" stepIndex={2} onEdit={onEditStep}>
          <ReviewRow label="Employer" value={employment?.employerName} />
          <ReviewRow label="Occupation" value={employment?.occupation} />
          <ReviewRow
            label="Annual Income"
            value={
              employment?.annualIncome !== undefined
                ? `$${Number(employment.annualIncome).toLocaleString("en-US")}`
                : undefined
            }
          />
          <ReviewRow
            label="Status"
            value={
              employment?.employmentStatus
                ? EMPLOYMENT_STATUS_LABELS[employment.employmentStatus] || employment.employmentStatus
                : undefined
            }
          />
        </ReviewCard>

        {/* Document Info */}
        <ReviewCard title="Document Verification" stepIndex={3} onEdit={onEditStep}>
          <ReviewRow
            label="Document Type"
            value={
              document?.documentType
                ? DOC_TYPE_LABELS[document.documentType] || document.documentType
                : undefined
            }
          />
          <ReviewRow
            label="Upload Status"
            value={document?.documentPath ? "Uploaded" : "Not uploaded"}
          />
          {ocrData && (
            <div className="mt-2 flex items-center gap-2 rounded-lg bg-indigo-50 p-3">
              <FileText className="h-4 w-4 text-indigo-500" />
              <span className="text-xs text-indigo-700">
                {ocrData.fields.filter((f) => f.confidence >= 95).length} of{" "}
                {ocrData.fields.length} fields auto-verified with high confidence
              </span>
            </div>
          )}
        </ReviewCard>

        {/* Additional Info */}
        <ReviewCard title="Additional Information" stepIndex={4} onEdit={onEditStep}>
          <ReviewRow
            label="Insurance"
            value={additional?.insuranceProvider || "Not provided"}
          />
          <ReviewRow
            label="Policy Number"
            value={additional?.policyNumber || "Not provided"}
          />
          <ReviewRow
            label="Dependents"
            value={additional?.dependentsCount ?? 0}
          />
          {additional?.additionalNotes && (
            <div className="mt-2">
              <p className="text-xs text-zinc-500 mb-1">Notes:</p>
              <p className="text-sm text-zinc-700 whitespace-pre-wrap rounded-lg bg-zinc-50 p-3">
                {additional.additionalNotes}
              </p>
            </div>
          )}
        </ReviewCard>
      </div>

      {/* Security note */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="flex items-start gap-2 rounded-lg bg-zinc-50 p-4 mt-4"
      >
        <Shield className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />
        <p className="text-xs text-zinc-500">
          Your information is encrypted and securely transmitted. SSN digits are
          encrypted with AES-256-GCM before storage.
        </p>
      </motion.div>

      {/* Honeypot */}
      <HoneypotField />
    </div>
  );
}
