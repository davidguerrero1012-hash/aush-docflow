import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { nanoid } from "nanoid";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { encryptSSN } from "@/lib/encryption";
import { rateLimit } from "@/lib/rate-limit";
import {
  personalInfoSchema,
  addressInfoSchema,
  employmentInfoSchema,
  documentUploadSchema,
  additionalInfoSchema,
  ocrResultSchema,
} from "@/lib/schemas";

export const maxDuration = 30;

export async function POST(request: NextRequest) {
  try {
    // --- Rate Limiting ---
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip") ??
      "unknown";
    const { success: rateLimitOk } = rateLimit(ip, 5, 60_000);
    if (!rateLimitOk) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    // --- Origin Validation ---
    const origin = request.headers.get("origin");
    const allowedOrigins = [
      process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, ""),
      process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
      "http://localhost:3000",
    ].filter(Boolean);

    if (origin && !allowedOrigins.includes(origin)) {
      // In production, be stricter. For now, warn but don't block non-origin requests
      // (some clients may not send Origin header)
    }

    // --- Parse Body ---
    const body = await request.json();

    // --- Honeypot Check ---
    if (body.website || body.honeypot || body._hp) {
      // Silently reject bot submissions with a fake success
      return NextResponse.json(
        { success: true, referenceNumber: "AUSH-000000000000" },
        { status: 200 }
      );
    }

    // --- Validate All Steps with Zod ---
    const personalResult = personalInfoSchema.safeParse(body.personalInfo);
    if (!personalResult.success) {
      return NextResponse.json(
        { error: "Invalid personal information", details: personalResult.error.issues },
        { status: 400 }
      );
    }

    const addressResult = addressInfoSchema.safeParse(body.addressInfo);
    if (!addressResult.success) {
      return NextResponse.json(
        { error: "Invalid address information", details: addressResult.error.issues },
        { status: 400 }
      );
    }

    const employmentResult = employmentInfoSchema.safeParse(body.employmentInfo);
    if (!employmentResult.success) {
      return NextResponse.json(
        { error: "Invalid employment information", details: employmentResult.error.issues },
        { status: 400 }
      );
    }

    const documentResult = documentUploadSchema.safeParse(body.documentUpload);
    if (!documentResult.success) {
      return NextResponse.json(
        { error: "Invalid document information", details: documentResult.error.issues },
        { status: 400 }
      );
    }

    const additionalResult = additionalInfoSchema.safeParse(body.additionalInfo);
    if (!additionalResult.success) {
      return NextResponse.json(
        { error: "Invalid additional information", details: additionalResult.error.issues },
        { status: 400 }
      );
    }

    // --- Validate OCR data if present ---
    let validatedOcrData = null;
    if (body.documentUpload?.ocrData) {
      const ocrResult = ocrResultSchema.safeParse(body.documentUpload.ocrData);
      if (ocrResult.success) {
        validatedOcrData = ocrResult.data;
      }
      // If OCR data is invalid, we still proceed but store null
    }

    const personal = personalResult.data;
    const address = addressResult.data;
    const employment = employmentResult.data;
    const document = documentResult.data;
    const additional = additionalResult.data;

    // --- Encrypt SSN ---
    const ssnEncrypted = encryptSSN(personal.ssnLast4);

    // --- Generate Reference Number ---
    const referenceNumber = `AUSH-${nanoid(12)}`;

    // --- Insert into Supabase ---
    const { data: submission, error: dbError } = await supabaseAdmin
      .from("submissions")
      .insert({
        reference_number: referenceNumber,
        status: "new",
        first_name: personal.firstName,
        last_name: personal.lastName,
        date_of_birth: personal.dateOfBirth,
        ssn_last4_encrypted: ssnEncrypted,
        phone: personal.phone,
        email: personal.email,
        street_address: address.streetAddress,
        city: address.city,
        state: address.state,
        zip_code: address.zipCode,
        mailing_same_as_residential: address.mailingSameAsResidential,
        mailing_address: address.mailingSameAsResidential
          ? null
          : address.mailingAddress ?? null,
        employer_name: employment.employerName,
        occupation: employment.occupation,
        annual_income: employment.annualIncome,
        employment_status: employment.employmentStatus,
        document_url: document.documentPath,
        document_type: document.documentType,
        ocr_data: validatedOcrData,
        ocr_fields_edited: body.ocrFieldsEdited ?? [],
        insurance_provider: additional.insuranceProvider || null,
        policy_number: additional.policyNumber || null,
        dependents_count: additional.dependentsCount ?? 0,
        additional_notes: additional.additionalNotes || null,
      })
      .select("id")
      .single();

    if (dbError) {
      console.error("Database insert error:", dbError.message);
      return NextResponse.json(
        { error: "Failed to save submission. Please try again." },
        { status: 500 }
      );
    }

    // --- Async PDF + Email (after response is sent) ---
    const submissionId = submission.id;
    const submissionEmail = personal.email;
    const internalSecret = process.env.INTERNAL_API_SECRET;
    const baseUrl =
      process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : "http://localhost:3000";

    after(async () => {
      try {
        // Generate PDF
        const pdfResponse = await fetch(`${baseUrl}/api/generate-pdf`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-internal-secret": internalSecret ?? "",
          },
          body: JSON.stringify({ submissionId }),
        });

        if (!pdfResponse.ok) {
          console.error("PDF generation failed:", await pdfResponse.text());
          return;
        }

        // Send email
        const emailResponse = await fetch(`${baseUrl}/api/send-email`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-internal-secret": internalSecret ?? "",
          },
          body: JSON.stringify({
            submissionId,
            email: submissionEmail,
            referenceNumber,
          }),
        });

        if (!emailResponse.ok) {
          console.error("Email sending failed:", await emailResponse.text());
        }
      } catch (err) {
        console.error("Async post-submission tasks failed:", err);
      }
    });

    return NextResponse.json({
      success: true,
      referenceNumber,
    });
  } catch (error) {
    console.error("Submit route error:", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}
