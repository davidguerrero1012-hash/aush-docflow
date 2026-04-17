import { NextResponse } from "next/server";
import type { OCRField } from "@/types";

export const maxDuration = 30;

/**
 * POST /api/ocr
 * Processes an uploaded document image using Azure Document Intelligence (prebuilt-idDocument).
 * Returns extracted fields with confidence scores.
 * Falls back to empty result if Azure is not configured.
 */
export async function POST(request: Request) {
  const endpoint = process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT;
  const apiKey = process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY;

  if (!endpoint || !apiKey) {
    return NextResponse.json(
      { error: "Azure Document Intelligence not configured" },
      { status: 503 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const docType = (formData.get("docType") as string) || "drivers_license";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Call Azure Document Intelligence - prebuilt-idDocument model
    const analyzeUrl = `${endpoint}/documentintelligence/documentModels/prebuilt-idDocument:analyze?api-version=2024-07-31-preview`;

    const analyzeRes = await fetch(analyzeUrl, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": apiKey,
        "Content-Type": file.type || "application/octet-stream",
      },
      body: buffer,
    });

    if (!analyzeRes.ok) {
      const errText = await analyzeRes.text().catch(() => "");
      console.error("[ocr] Azure analyze failed:", analyzeRes.status, errText);
      return NextResponse.json(
        { error: "Document analysis failed" },
        { status: 502 }
      );
    }

    // Get the operation-location header for polling
    const operationLocation = analyzeRes.headers.get("operation-location");
    if (!operationLocation) {
      return NextResponse.json(
        { error: "No operation location returned" },
        { status: 502 }
      );
    }

    // Poll for results (Azure is async)
    let result = null;
    const maxAttempts = 20;
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const pollRes = await fetch(operationLocation, {
        headers: {
          "Ocp-Apim-Subscription-Key": apiKey,
        },
      });

      if (!pollRes.ok) continue;

      const pollData = await pollRes.json();
      if (pollData.status === "succeeded") {
        result = pollData.analyzeResult;
        break;
      } else if (pollData.status === "failed") {
        return NextResponse.json(
          { error: "Document analysis failed" },
          { status: 502 }
        );
      }
      // status === "running" — keep polling
    }

    if (!result) {
      return NextResponse.json(
        { error: "Analysis timed out" },
        { status: 504 }
      );
    }

    // Extract fields from Azure response
    const fields = extractFieldsFromAzure(result, docType);
    const rawText = result.content || "";

    return NextResponse.json({ fields, rawText });
  } catch (error) {
    console.error("[ocr] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Extract structured fields from Azure Document Intelligence response.
 * The prebuilt-idDocument model returns fields like FirstName, LastName, DateOfBirth, etc.
 */
function extractFieldsFromAzure(
  analyzeResult: Record<string, unknown>,
  docType: string
): OCRField[] {
  const fields: OCRField[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const documents = analyzeResult.documents as Array<{ fields: Record<string, any> }> | undefined;

  if (!documents || documents.length === 0) return fields;

  const doc = documents[0];
  const docFields = doc.fields || {};

  // First Name
  const firstName = docFields.FirstName || docFields.GivenNames;
  if (firstName) {
    fields.push({
      fieldName: "firstName",
      value: (firstName.value || firstName.content || "").trim(),
      confidence: Math.round((firstName.confidence ?? 0) * 100),
    });
  }

  // Last Name
  const lastName = docFields.LastName || docFields.Surname;
  if (lastName) {
    fields.push({
      fieldName: "lastName",
      value: (lastName.value || lastName.content || "").trim(),
      confidence: Math.round((lastName.confidence ?? 0) * 100),
    });
  }

  // Date of Birth
  const dob = docFields.DateOfBirth;
  if (dob) {
    let dobValue = dob.valueDate || dob.value || dob.content || "";
    // Normalize to YYYY-MM-DD if possible
    if (dobValue && !dobValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const parsed = new Date(dobValue);
      if (!isNaN(parsed.getTime())) {
        dobValue = parsed.toISOString().split("T")[0];
      }
    }
    fields.push({
      fieldName: "dateOfBirth",
      value: dobValue.trim(),
      confidence: Math.round((dob.confidence ?? 0) * 100),
    });
  }

  // Address
  const address = docFields.Address;
  if (address) {
    fields.push({
      fieldName: "address",
      value: (address.value || address.content || "").trim(),
      confidence: Math.round((address.confidence ?? 0) * 100),
    });
  }

  // Document Number (license or passport)
  const docNumber = docFields.DocumentNumber || docFields.MachineReadableZone?.DocumentNumber;
  if (docNumber) {
    fields.push({
      fieldName: docType === "passport" ? "passportNumber" : "licenseNumber",
      value: (typeof docNumber === "object" ? (docNumber.value || docNumber.content || "") : String(docNumber)).trim(),
      confidence: Math.round(((typeof docNumber === "object" ? docNumber.confidence : undefined) ?? 0) * 100),
    });
  }

  // Expiration Date
  const expDate = docFields.DateOfExpiration || docFields.ExpirationDate;
  if (expDate) {
    let expValue = expDate.valueDate || expDate.value || expDate.content || "";
    if (expValue && !expValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const parsed = new Date(expValue);
      if (!isNaN(parsed.getTime())) {
        expValue = parsed.toISOString().split("T")[0];
      }
    }
    fields.push({
      fieldName: "expirationDate",
      value: expValue.trim(),
      confidence: Math.round((expDate.confidence ?? 0) * 100),
    });
  }

  return fields;
}
