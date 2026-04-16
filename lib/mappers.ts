import type { Submission, SubmissionRow, OCRResult, MailingAddress } from "@/types";

/**
 * Maps a Supabase database row (snake_case) to a Submission (camelCase).
 */
export function mapSubmissionFromDB(row: SubmissionRow): Submission {
  return {
    id: row.id,
    referenceNumber: row.reference_number,
    status: row.status as Submission["status"],
    firstName: row.first_name,
    lastName: row.last_name,
    dateOfBirth: row.date_of_birth,
    ssnLast4Encrypted: row.ssn_last4_encrypted,
    phone: row.phone,
    email: row.email,
    streetAddress: row.street_address,
    city: row.city,
    state: row.state,
    zipCode: row.zip_code,
    mailingSameAsResidential: row.mailing_same_as_residential,
    mailingAddress: row.mailing_address as MailingAddress | null,
    employerName: row.employer_name,
    occupation: row.occupation,
    annualIncome: row.annual_income,
    employmentStatus: row.employment_status,
    documentUrl: row.document_url,
    documentType: row.document_type,
    ocrData: row.ocr_data as OCRResult | null,
    ocrFieldsEdited: row.ocr_fields_edited ?? [],
    insuranceProvider: row.insurance_provider,
    policyNumber: row.policy_number,
    dependentsCount: row.dependents_count,
    additionalNotes: row.additional_notes,
    adminNotes: row.admin_notes,
    pdfUrl: row.pdf_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Maps a Submission (camelCase) to a Supabase database row (snake_case).
 * Omits `id`, `created_at`, and `updated_at` as these are managed by the database.
 */
export function mapSubmissionToDB(
  data: Omit<Submission, "id" | "createdAt" | "updatedAt">
): Omit<SubmissionRow, "id" | "created_at" | "updated_at"> {
  return {
    reference_number: data.referenceNumber,
    status: data.status,
    first_name: data.firstName,
    last_name: data.lastName,
    date_of_birth: data.dateOfBirth,
    ssn_last4_encrypted: data.ssnLast4Encrypted,
    phone: data.phone,
    email: data.email,
    street_address: data.streetAddress,
    city: data.city,
    state: data.state,
    zip_code: data.zipCode,
    mailing_same_as_residential: data.mailingSameAsResidential,
    mailing_address: data.mailingAddress,
    employer_name: data.employerName,
    occupation: data.occupation,
    annual_income: data.annualIncome,
    employment_status: data.employmentStatus,
    document_url: data.documentUrl,
    document_type: data.documentType,
    ocr_data: data.ocrData,
    ocr_fields_edited: data.ocrFieldsEdited,
    insurance_provider: data.insuranceProvider,
    policy_number: data.policyNumber,
    dependents_count: data.dependentsCount,
    additional_notes: data.additionalNotes,
    admin_notes: data.adminNotes,
    pdf_url: data.pdfUrl,
  };
}
