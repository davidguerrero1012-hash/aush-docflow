import { z } from "zod";

const US_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA",
  "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD",
  "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ",
  "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC",
  "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
  "DC",
] as const;

export const personalInfoSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  dateOfBirth: z.string().min(1, "Date of birth is required").refine(
    (val) => {
      const date = new Date(val);
      return !isNaN(date.getTime()) && date < new Date();
    },
    { message: "Please enter a valid date of birth" }
  ),
  ssnLast4: z
    .string()
    .length(4, "Must be exactly 4 digits")
    .regex(/^\d{4}$/, "Must be 4 digits"),
  phone: z
    .string()
    .min(1, "Phone number is required")
    .regex(/^[\d\s\-\(\)\+]{7,20}$/, "Please enter a valid phone number"),
  email: z.string().min(1, "Email is required").email("Please enter a valid email"),
});

const mailingAddressSchema = z.object({
  street: z.string().min(1, "Street address is required"),
  city: z.string().min(1, "City is required"),
  state: z.enum(US_STATES, { message: "Please select a state" }),
  zip: z
    .string()
    .length(5, "ZIP code must be 5 digits")
    .regex(/^\d{5}$/, "ZIP code must be 5 digits"),
});

export const addressInfoSchema = z
  .object({
    streetAddress: z.string().min(1, "Street address is required"),
    city: z.string().min(1, "City is required"),
    state: z.enum(US_STATES, { message: "Please select a state" }),
    zipCode: z
      .string()
      .length(5, "ZIP code must be 5 digits")
      .regex(/^\d{5}$/, "ZIP code must be 5 digits"),
    mailingSameAsResidential: z.boolean(),
    mailingAddress: mailingAddressSchema.optional(),
  })
  .refine(
    (data) => {
      if (!data.mailingSameAsResidential) {
        return data.mailingAddress !== undefined;
      }
      return true;
    },
    {
      message: "Mailing address is required when different from residential",
      path: ["mailingAddress"],
    }
  );

export const employmentInfoSchema = z.object({
  employerName: z.string().min(1, "Employer name is required"),
  occupation: z.string().min(1, "Occupation is required"),
  annualIncome: z
    .number({ message: "Annual income is required" })
    .min(0, "Income must be 0 or greater"),
  employmentStatus: z.enum(
    ["employed", "self-employed", "unemployed", "retired", "student"],
    { message: "Please select an employment status" }
  ),
});

export const documentUploadSchema = z.object({
  documentType: z.enum(["drivers_license", "passport", "state_id"], {
    message: "Please select a document type",
  }),
  documentPath: z.string().min(1, "Please upload a document"),
  ocrData: z.any().nullable(),
});

export const additionalInfoSchema = z.object({
  insuranceProvider: z.string().optional().default(""),
  policyNumber: z.string().optional().default(""),
  dependentsCount: z
    .number()
    .int("Must be a whole number")
    .min(0, "Must be 0 or greater")
    .default(0),
  additionalNotes: z.string().max(2000, "Maximum 2000 characters").optional().default(""),
});

// ---------------------------------------------------------------------------
// OCR Result Schema — validates OCR data structure before DB insertion
// ---------------------------------------------------------------------------
export const ocrFieldSchema = z.object({
  fieldName: z.string(),
  value: z.string(),
  confidence: z.number().min(0).max(100),
  boundingBox: z
    .object({
      x: z.number(),
      y: z.number(),
      width: z.number(),
      height: z.number(),
    })
    .optional(),
});

export const ocrResultSchema = z.object({
  fields: z.array(ocrFieldSchema),
  rawText: z.string(),
  processingTimeMs: z.number().min(0),
});

// ---------------------------------------------------------------------------
// Full Form Schema
// ---------------------------------------------------------------------------
export const intakeFormSchema = z.object({
  personalInfo: personalInfoSchema,
  addressInfo: addressInfoSchema,
  employmentInfo: employmentInfoSchema,
  documentUpload: documentUploadSchema,
  additionalInfo: additionalInfoSchema,
});

export type PersonalInfoFormData = z.infer<typeof personalInfoSchema>;
export type AddressInfoFormData = z.infer<typeof addressInfoSchema>;
export type EmploymentInfoFormData = z.infer<typeof employmentInfoSchema>;
export type DocumentUploadFormData = z.infer<typeof documentUploadSchema>;
export type AdditionalInfoFormData = z.infer<typeof additionalInfoSchema>;
export type IntakeFormSchemaData = z.infer<typeof intakeFormSchema>;

export const US_STATE_OPTIONS = US_STATES.map((abbr) => ({
  value: abbr,
  label: abbr,
}));

export const STEP_SCHEMAS = [
  personalInfoSchema,
  addressInfoSchema,
  employmentInfoSchema,
  documentUploadSchema,
  additionalInfoSchema,
  null, // review step has no schema
] as const;

export const STEP_FIELD_PREFIXES = [
  "personalInfo",
  "addressInfo",
  "employmentInfo",
  "documentUpload",
  "additionalInfo",
  null,
] as const;
