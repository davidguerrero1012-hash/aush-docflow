"use client";

import { useFormContext, useWatch } from "react-hook-form";
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

function ReviewSection({
  title,
  questionIndex,
  onEdit,
  children,
}: {
  title: string;
  questionIndex: number;
  onEdit: (step: number) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="py-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
          {title}
        </h3>
        <button
          type="button"
          onClick={() => onEdit(questionIndex)}
          className="text-sm text-blue-700 hover:text-blue-800 transition-colors"
        >
          Edit
        </button>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function ReviewRow({
  label,
  value,
}: {
  label: string;
  value: string | number | undefined | null;
}) {
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
    <div className="w-full max-w-xl mx-auto">
      {/* Personal Info — maps to questions 1-4 */}
      <ReviewSection title="Personal Information" questionIndex={1} onEdit={onEditStep}>
        <ReviewRow
          label="Name"
          value={`${personal?.firstName || ""} ${personal?.lastName || ""}`}
        />
        <ReviewRow label="Date of Birth" value={personal?.dateOfBirth} />
        <ReviewRow label="SSN (Last 4)" value="----" />
        <ReviewRow label="Phone" value={personal?.phone} />
        <ReviewRow label="Email" value={personal?.email} />
      </ReviewSection>

      <div className="border-t border-zinc-200" />

      {/* Address Info — maps to questions 5-6 */}
      <ReviewSection title="Address" questionIndex={5} onEdit={onEditStep}>
        <ReviewRow label="Street" value={address?.streetAddress} />
        <ReviewRow
          label="City, State ZIP"
          value={`${address?.city || ""}, ${address?.state || ""} ${address?.zipCode || ""}`}
        />
        {!address?.mailingSameAsResidential && address?.mailingAddress && (
          <>
            <div className="my-2 border-t border-zinc-100" />
            <p className="text-xs font-medium uppercase tracking-wider text-zinc-400">
              Mailing Address
            </p>
            <ReviewRow label="Street" value={address.mailingAddress.street} />
            <ReviewRow
              label="City, State ZIP"
              value={`${address.mailingAddress.city}, ${address.mailingAddress.state} ${address.mailingAddress.zip}`}
            />
          </>
        )}
      </ReviewSection>

      <div className="border-t border-zinc-200" />

      {/* Employment Info — maps to questions 7-8 */}
      <ReviewSection title="Employment" questionIndex={7} onEdit={onEditStep}>
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
              ? EMPLOYMENT_STATUS_LABELS[employment.employmentStatus] ||
                employment.employmentStatus
              : undefined
          }
        />
      </ReviewSection>

      <div className="border-t border-zinc-200" />

      {/* Document — maps to question 0 */}
      <ReviewSection title="Document" questionIndex={0} onEdit={onEditStep}>
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
          <p className="mt-1 text-xs text-zinc-500">
            {ocrData.fields.filter((f) => f.confidence >= 95).length} of{" "}
            {ocrData.fields.length} fields auto-verified
          </p>
        )}
      </ReviewSection>

      <div className="border-t border-zinc-200" />

      {/* Additional Info — maps to questions 9-10 */}
      <ReviewSection title="Additional" questionIndex={9} onEdit={onEditStep}>

        <ReviewRow
          label="Insurance"
          value={additional?.insuranceProvider || "Not provided"}
        />
        <ReviewRow
          label="Policy Number"
          value={additional?.policyNumber || "Not provided"}
        />
        <ReviewRow label="Dependents" value={additional?.dependentsCount ?? 0} />
        {additional?.additionalNotes && (
          <div className="mt-2">
            <p className="text-xs text-zinc-500 mb-1">Notes:</p>
            <p className="text-sm text-zinc-700 whitespace-pre-wrap bg-zinc-100 p-3">
              {additional.additionalNotes}
            </p>
          </div>
        )}
      </ReviewSection>

      {/* Security note */}
      <div className="mt-4 py-4 border-t border-zinc-200">
        <p className="text-xs text-zinc-400">
          Your information is encrypted and securely transmitted. SSN digits are
          encrypted with AES-256-GCM before storage.
        </p>
      </div>

      {/* Honeypot */}
      <HoneypotField />
    </div>
  );
}
