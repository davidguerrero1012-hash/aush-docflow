import type { OCRResult, OCRField } from "@/types";

/**
 * Mock OCR data for testing (used when NEXT_PUBLIC_MOCK_OCR=true).
 */
function getMockOCRResult(docType: string): OCRResult {
  const baseFields: OCRField[] =
    docType === "passport"
      ? [
          { fieldName: "firstName", value: "JOHN", confidence: 98 },
          { fieldName: "lastName", value: "DOE", confidence: 99 },
          { fieldName: "dateOfBirth", value: "1990-01-15", confidence: 97 },
          { fieldName: "passportNumber", value: "X12345678", confidence: 95 },
          { fieldName: "expirationDate", value: "2030-01-15", confidence: 96 },
        ]
      : [
          { fieldName: "firstName", value: "JOHN", confidence: 97 },
          { fieldName: "lastName", value: "DOE", confidence: 99 },
          { fieldName: "dateOfBirth", value: "1990-01-15", confidence: 96 },
          { fieldName: "address", value: "123 MAIN ST, NEW YORK, NY 10001", confidence: 94 },
          { fieldName: "licenseNumber", value: "D1234567", confidence: 98 },
        ];

  return {
    fields: baseFields,
    rawText: baseFields.map((f) => `${f.fieldName}: ${f.value}`).join("\n"),
    processingTimeMs: 1200,
  };
}

/**
 * Processes a document image using Azure Document Intelligence (prebuilt-idDocument model).
 * This calls our server-side API route which handles the Azure SDK communication.
 * Falls back to client-side Tesseract.js if Azure is not configured.
 */
export async function processDocument(
  imageFile: File,
  docType: string,
  onProgress?: (progress: number) => void
): Promise<OCRResult> {
  // Mock mode for testing
  if (process.env.NEXT_PUBLIC_MOCK_OCR === "true") {
    onProgress?.(0.3);
    await new Promise((resolve) => setTimeout(resolve, 300));
    onProgress?.(0.7);
    await new Promise((resolve) => setTimeout(resolve, 300));
    onProgress?.(1.0);
    return getMockOCRResult(docType);
  }

  const startTime = performance.now();

  try {
    // Try Azure Document Intelligence via our API route (server-side)
    onProgress?.(0.1);

    const formData = new FormData();
    formData.append("file", imageFile);
    formData.append("docType", docType);

    const res = await fetch("/api/ocr", {
      method: "POST",
      body: formData,
    });

    onProgress?.(0.5);

    if (res.ok) {
      const data = await res.json();
      onProgress?.(1.0);
      return {
        fields: data.fields || [],
        rawText: data.rawText || "",
        processingTimeMs: Math.round(performance.now() - startTime),
      };
    }

    // If Azure API route fails, fall back to client-side Tesseract
    console.log("[ocr] Azure API unavailable, falling back to Tesseract.js");
    return await processWithTesseract(imageFile, docType, onProgress, startTime);
  } catch {
    // Fallback to Tesseract
    console.log("[ocr] Azure request failed, falling back to Tesseract.js");
    return await processWithTesseract(imageFile, docType, onProgress, startTime);
  }
}

/**
 * Fallback: Client-side OCR using Tesseract.js
 */
async function processWithTesseract(
  imageFile: File,
  docType: string,
  onProgress?: (progress: number) => void,
  startTime?: number
): Promise<OCRResult> {
  const start = startTime ?? performance.now();
  const TIMEOUT_MS = 15_000;

  try {
    const Tesseract = await import("tesseract.js");

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error("OCR processing timed out")),
        TIMEOUT_MS
      );
    });

    const recognizePromise = Tesseract.recognize(imageFile, "eng", {
      langPath: "/tesseract",
      logger: (msg: { progress: number }) => {
        if (onProgress && typeof msg.progress === "number") {
          onProgress(msg.progress);
        }
      },
    });

    const result = await Promise.race([recognizePromise, timeoutPromise]);
    const processingTimeMs = Math.round(performance.now() - start);
    const rawText = result.data.text;

    let fields: OCRField[];
    switch (docType) {
      case "passport":
        fields = parsePassportFields(rawText);
        break;
      default:
        fields = parseDLFields(rawText);
        break;
    }

    return { fields, rawText, processingTimeMs };
  } catch (error) {
    const processingTimeMs = Math.round(performance.now() - start);
    const message = error instanceof Error ? error.message : "OCR processing failed";
    return { fields: [], rawText: `[Error: ${message}]`, processingTimeMs };
  }
}

// --- Tesseract fallback parsers (kept for when Azure is unavailable) ---

function parseDLFields(rawText: string): OCRField[] {
  const fields: OCRField[] = [];
  const lines = rawText.split("\n").map((l) => l.trim());
  const fullText = rawText.toUpperCase();

  const lastNameMatch =
    fullText.match(/(?:LN|LAST\s*NAME|SURNAME)[:\s]+([A-Z][A-Z\s'-]+)/i) ??
    fullText.match(/(?:^|\n)\s*1\s+([A-Z][A-Z'-]+)\s*(?:\n|$)/m);
  if (lastNameMatch) {
    fields.push({ fieldName: "lastName", value: lastNameMatch[1].trim(), confidence: 85 });
  }

  const firstNameMatch =
    fullText.match(/(?:FN|FIRST\s*NAME|GIVEN\s*NAME)[:\s]+([A-Z][A-Z\s'-]+)/i) ??
    fullText.match(/(?:^|\n)\s*2\s+([A-Z][A-Z'-]+)\s*(?:\n|$)/m);
  if (firstNameMatch) {
    fields.push({ fieldName: "firstName", value: firstNameMatch[1].trim(), confidence: 85 });
  }

  const dobMatch =
    fullText.match(/(?:DOB|DATE\s*OF\s*BIRTH|BIRTH\s*DATE|BD)[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i) ??
    fullText.match(/(\d{2}[\/\-]\d{2}[\/\-]\d{4})/);
  if (dobMatch) {
    fields.push({ fieldName: "dateOfBirth", value: dobMatch[1].trim(), confidence: 80 });
  }

  const addressMatch = fullText.match(/(?:ADD(?:RESS)?|ADDR)[:\s]+(.+?)(?:\n|$)/i);
  if (addressMatch) {
    fields.push({ fieldName: "address", value: addressMatch[1].trim(), confidence: 75 });
  } else {
    for (const line of lines) {
      if (/^\d+\s+[A-Z]/i.test(line) && /(?:ST|AVE|BLVD|RD|DR|LN|CT|WAY|PL)/i.test(line)) {
        fields.push({ fieldName: "address", value: line.trim(), confidence: 70 });
        break;
      }
    }
  }

  const licenseMatch = fullText.match(/(?:DL|LIC(?:ENSE)?|DLN|NO)[:\s#]+([A-Z]?\d{5,12})/i);
  if (licenseMatch) {
    fields.push({ fieldName: "licenseNumber", value: licenseMatch[1].trim(), confidence: 88 });
  }

  return fields;
}

function parsePassportFields(rawText: string): OCRField[] {
  const fields: OCRField[] = [];
  const fullText = rawText.toUpperCase();

  const mrzLines = fullText.match(/[A-Z0-9<]{44}/g);
  if (mrzLines && mrzLines.length >= 2) {
    const line1 = mrzLines[0];
    const line2 = mrzLines[1];

    const nameSection = line1.substring(5).replace(/</g, " ").trim();
    const nameParts = nameSection.split(/\s{2,}/);
    if (nameParts.length >= 2) {
      fields.push({ fieldName: "lastName", value: nameParts[0].trim(), confidence: 92 });
      fields.push({ fieldName: "firstName", value: nameParts[1].trim(), confidence: 92 });
    }

    const passportNum = line2.substring(0, 9).replace(/</g, "").trim();
    if (passportNum) {
      fields.push({ fieldName: "passportNumber", value: passportNum, confidence: 90 });
    }

    const dobRaw = line2.substring(13, 19);
    if (/^\d{6}$/.test(dobRaw)) {
      const year = parseInt(dobRaw.substring(0, 2), 10);
      const month = dobRaw.substring(2, 4);
      const day = dobRaw.substring(4, 6);
      const fullYear = year > 50 ? 1900 + year : 2000 + year;
      fields.push({ fieldName: "dateOfBirth", value: `${fullYear}-${month}-${day}`, confidence: 90 });
    }

    return fields;
  }

  // Fallback text patterns
  const lastNameMatch = fullText.match(/(?:SURNAME|LAST\s*NAME|NOM)[:\s]+([A-Z][A-Z\s'-]+)/i);
  if (lastNameMatch) fields.push({ fieldName: "lastName", value: lastNameMatch[1].trim(), confidence: 82 });

  const firstNameMatch = fullText.match(/(?:GIVEN\s*NAME|FIRST\s*NAME|PRENOM)[:\s]+([A-Z][A-Z\s'-]+)/i);
  if (firstNameMatch) fields.push({ fieldName: "firstName", value: firstNameMatch[1].trim(), confidence: 82 });

  const dobMatch = fullText.match(/(?:DATE\s*OF\s*BIRTH|DOB|BIRTH)[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i);
  if (dobMatch) fields.push({ fieldName: "dateOfBirth", value: dobMatch[1].trim(), confidence: 78 });

  return fields;
}
