// =============================================================================
// AUSH DocFlow — Shared TypeScript Types
// =============================================================================

// ---------------------------------------------------------------------------
// Step 1: Personal Info
// ---------------------------------------------------------------------------
export interface PersonalInfo {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  ssnLast4: string;
  phone: string;
  email: string;
}

// ---------------------------------------------------------------------------
// Step 2: Address Info
// ---------------------------------------------------------------------------
export interface MailingAddress {
  street: string;
  city: string;
  state: string;
  zip: string;
}

export interface AddressInfo {
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
  mailingSameAsResidential: boolean;
  mailingAddress?: MailingAddress;
}

// ---------------------------------------------------------------------------
// Step 3: Employment Info
// ---------------------------------------------------------------------------
export type EmploymentStatus =
  | "employed"
  | "self-employed"
  | "unemployed"
  | "retired"
  | "student";

export interface EmploymentInfo {
  employerName: string;
  occupation: string;
  annualIncome: number;
  employmentStatus: EmploymentStatus;
}

// ---------------------------------------------------------------------------
// Step 4: Document Upload
// ---------------------------------------------------------------------------
export type DocumentType = "drivers_license" | "passport" | "state_id";

export interface DocumentUploadData {
  documentType: DocumentType;
  documentPath: string | null; // Supabase storage path after upload
  ocrData: OCRResult | null;
}

export interface AdditionalInfo {
  insuranceProvider: string;
  policyNumber: string;
  dependentsCount: number;
  additionalNotes: string;
}

// OCR
export interface OCRField {
  fieldName: string;
  value: string;
  confidence: number;
  boundingBox?: { x: number; y: number; width: number; height: number };
}

export interface OCRResult {
  fields: OCRField[];
  rawText: string;
  processingTimeMs: number;
}

export type ConfidenceLevel = "high" | "medium" | "low";

// Combined form (what React Hook Form manages)
export interface IntakeFormData {
  personalInfo: PersonalInfo;
  addressInfo: AddressInfo;
  employmentInfo: EmploymentInfo;
  documentUpload: DocumentUploadData;
  additionalInfo: AdditionalInfo;
}

// Submission record (what's in Supabase)
export interface Submission {
  id: string;
  referenceNumber: string;
  status: "new" | "reviewed" | "flagged";
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  ssnLast4Encrypted: string;
  phone: string;
  email: string;
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
  mailingSameAsResidential: boolean;
  mailingAddress: MailingAddress | null;
  employerName: string;
  occupation: string;
  annualIncome: number;
  employmentStatus: string;
  documentUrl: string;
  documentType: string;
  ocrData: OCRResult | null;
  ocrFieldsEdited: string[];
  insuranceProvider: string | null;
  policyNumber: string | null;
  dependentsCount: number;
  additionalNotes: string | null;
  adminNotes: string | null;
  pdfUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// Database Row (snake_case Supabase type)
// ---------------------------------------------------------------------------
export interface SubmissionRow {
  id: string;
  reference_number: string;
  status: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  ssn_last4_encrypted: string;
  phone: string;
  email: string;
  street_address: string;
  city: string;
  state: string;
  zip_code: string;
  mailing_same_as_residential: boolean;
  mailing_address: MailingAddress | null;
  employer_name: string;
  occupation: string;
  annual_income: number;
  employment_status: string;
  document_url: string;
  document_type: string;
  ocr_data: OCRResult | null;
  ocr_fields_edited: string[];
  insurance_provider: string | null;
  policy_number: string | null;
  dependents_count: number;
  additional_notes: string | null;
  admin_notes: string | null;
  pdf_url: string | null;
  created_at: string;
  updated_at: string;
}

// ---------------------------------------------------------------------------
// API Response Types
// ---------------------------------------------------------------------------
export interface SubmitResponse {
  success: boolean;
  referenceNumber: string;
}

export interface UploadResponse {
  path: string;
}

export interface GeneratePdfResponse {
  pdfUrl: string;
}

export interface ErrorResponse {
  error: string;
}
