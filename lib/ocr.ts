import type { OCRResult, OCRField } from "@/types";

/**
 * Mock OCR data for testing (used when NEXT_PUBLIC_MOCK_OCR=true).
 */
function getMockOCRResult(docType: string): OCRResult {
  const baseFields: OCRField[] =
    docType === "passport"
      ? [
          { fieldName: "firstName", value: "JOHN", confidence: 95 },
          { fieldName: "lastName", value: "DOE", confidence: 97 },
          { fieldName: "dateOfBirth", value: "1990-01-15", confidence: 92 },
          { fieldName: "passportNumber", value: "X12345678", confidence: 88 },
          { fieldName: "expirationDate", value: "2030-01-15", confidence: 90 },
        ]
      : [
          { fieldName: "firstName", value: "JOHN", confidence: 93 },
          { fieldName: "lastName", value: "DOE", confidence: 96 },
          { fieldName: "dateOfBirth", value: "01/15/1990", confidence: 89 },
          { fieldName: "address", value: "123 MAIN ST", confidence: 85 },
          { fieldName: "licenseNumber", value: "D1234567", confidence: 91 },
        ];

  return {
    fields: baseFields,
    rawText: baseFields.map((f) => `${f.fieldName}: ${f.value}`).join("\n"),
    processingTimeMs: 150,
  };
}

/**
 * Parses raw OCR text into structured fields for driver's license / state ID.
 * Targets common patterns from CA, TX, NY, FL, IL formats.
 * This is best-effort, demo-quality parsing.
 */
function parseDLFields(rawText: string): OCRField[] {
  const fields: OCRField[] = [];
  const lines = rawText.split("\n").map((l) => l.trim());
  const fullText = rawText.toUpperCase();

  // Name patterns (common: "LN LASTNAME" or "FN FIRSTNAME" or "NAME: FIRST LAST")
  const lastNameMatch =
    fullText.match(/(?:LN|LAST\s*NAME|SURNAME)[:\s]+([A-Z][A-Z\s'-]+)/i) ??
    fullText.match(/(?:^|\n)\s*1\s+([A-Z][A-Z'-]+)\s*(?:\n|$)/m);
  if (lastNameMatch) {
    fields.push({
      fieldName: "lastName",
      value: lastNameMatch[1].trim(),
      confidence: 85,
    });
  }

  const firstNameMatch =
    fullText.match(/(?:FN|FIRST\s*NAME|GIVEN\s*NAME)[:\s]+([A-Z][A-Z\s'-]+)/i) ??
    fullText.match(/(?:^|\n)\s*2\s+([A-Z][A-Z'-]+)\s*(?:\n|$)/m);
  if (firstNameMatch) {
    fields.push({
      fieldName: "firstName",
      value: firstNameMatch[1].trim(),
      confidence: 85,
    });
  }

  // Date of birth patterns
  const dobMatch =
    fullText.match(
      /(?:DOB|DATE\s*OF\s*BIRTH|BIRTH\s*DATE|BD)[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i
    ) ?? fullText.match(/(\d{2}[\/\-]\d{2}[\/\-]\d{4})/);
  if (dobMatch) {
    fields.push({
      fieldName: "dateOfBirth",
      value: dobMatch[1].trim(),
      confidence: 80,
    });
  }

  // Address patterns
  const addressMatch = fullText.match(
    /(?:ADD(?:RESS)?|ADDR)[:\s]+(.+?)(?:\n|$)/i
  );
  if (addressMatch) {
    fields.push({
      fieldName: "address",
      value: addressMatch[1].trim(),
      confidence: 75,
    });
  } else {
    // Look for a line that looks like a street address
    for (const line of lines) {
      if (/^\d+\s+[A-Z]/i.test(line) && /(?:ST|AVE|BLVD|RD|DR|LN|CT|WAY|PL)/i.test(line)) {
        fields.push({
          fieldName: "address",
          value: line.trim(),
          confidence: 70,
        });
        break;
      }
    }
  }

  // License number patterns
  const licenseMatch = fullText.match(
    /(?:DL|LIC(?:ENSE)?|DLN|NO)[:\s#]+([A-Z]?\d{5,12})/i
  );
  if (licenseMatch) {
    fields.push({
      fieldName: "licenseNumber",
      value: licenseMatch[1].trim(),
      confidence: 88,
    });
  }

  // Expiration date
  const expMatch = fullText.match(
    /(?:EXP(?:IRES|IRATION)?|EXP\s*DATE)[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i
  );
  if (expMatch) {
    fields.push({
      fieldName: "expirationDate",
      value: expMatch[1].trim(),
      confidence: 82,
    });
  }

  return fields;
}

/**
 * Parses raw OCR text into structured fields for passport documents.
 * Passports have more standardized formats (MRZ lines at the bottom).
 */
function parsePassportFields(rawText: string): OCRField[] {
  const fields: OCRField[] = [];
  const fullText = rawText.toUpperCase();

  // MRZ line detection (two lines of 44 characters with < as filler)
  const mrzLines = fullText.match(/[A-Z0-9<]{44}/g);
  if (mrzLines && mrzLines.length >= 2) {
    const line1 = mrzLines[0];
    const line2 = mrzLines[1];

    // Line 1: Type + Country + Name (surname<<firstname)
    const nameSection = line1.substring(5).replace(/</g, " ").trim();
    const nameParts = nameSection.split(/\s{2,}/);
    if (nameParts.length >= 2) {
      fields.push({
        fieldName: "lastName",
        value: nameParts[0].trim(),
        confidence: 92,
      });
      fields.push({
        fieldName: "firstName",
        value: nameParts[1].trim(),
        confidence: 92,
      });
    }

    // Line 2: Passport number (positions 0-8), DOB (positions 13-18), Expiry (positions 21-26)
    const passportNum = line2.substring(0, 9).replace(/</g, "").trim();
    if (passportNum) {
      fields.push({
        fieldName: "passportNumber",
        value: passportNum,
        confidence: 90,
      });
    }

    const dobRaw = line2.substring(13, 19);
    if (/^\d{6}$/.test(dobRaw)) {
      const year = parseInt(dobRaw.substring(0, 2), 10);
      const month = dobRaw.substring(2, 4);
      const day = dobRaw.substring(4, 6);
      const fullYear = year > 50 ? 1900 + year : 2000 + year;
      fields.push({
        fieldName: "dateOfBirth",
        value: `${fullYear}-${month}-${day}`,
        confidence: 90,
      });
    }

    const expRaw = line2.substring(21, 27);
    if (/^\d{6}$/.test(expRaw)) {
      const year = parseInt(expRaw.substring(0, 2), 10);
      const month = expRaw.substring(2, 4);
      const day = expRaw.substring(4, 6);
      const fullYear = 2000 + year;
      fields.push({
        fieldName: "expirationDate",
        value: `${fullYear}-${month}-${day}`,
        confidence: 88,
      });
    }

    return fields;
  }

  // Fallback: try text-based patterns if MRZ not found
  const lastNameMatch = fullText.match(
    /(?:SURNAME|LAST\s*NAME|NOM)[:\s]+([A-Z][A-Z\s'-]+)/i
  );
  if (lastNameMatch) {
    fields.push({
      fieldName: "lastName",
      value: lastNameMatch[1].trim(),
      confidence: 82,
    });
  }

  const firstNameMatch = fullText.match(
    /(?:GIVEN\s*NAME|FIRST\s*NAME|PRENOM)[:\s]+([A-Z][A-Z\s'-]+)/i
  );
  if (firstNameMatch) {
    fields.push({
      fieldName: "firstName",
      value: firstNameMatch[1].trim(),
      confidence: 82,
    });
  }

  const dobMatch = fullText.match(
    /(?:DATE\s*OF\s*BIRTH|DOB|BIRTH)[:\s]+(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i
  );
  if (dobMatch) {
    fields.push({
      fieldName: "dateOfBirth",
      value: dobMatch[1].trim(),
      confidence: 78,
    });
  }

  const passportMatch = fullText.match(
    /(?:PASSPORT\s*NO|NO)[:\s]+([A-Z]?\d{6,9})/i
  );
  if (passportMatch) {
    fields.push({
      fieldName: "passportNumber",
      value: passportMatch[1].trim(),
      confidence: 85,
    });
  }

  return fields;
}

/**
 * Processes a document image using Tesseract.js OCR.
 * Supports NEXT_PUBLIC_MOCK_OCR env var for deterministic test results.
 * 15-second timeout — returns partial results on timeout.
 */
export async function processDocument(
  imageFile: File,
  docType: string,
  onProgress?: (progress: number) => void
): Promise<OCRResult> {
  // Mock mode for testing
  if (process.env.NEXT_PUBLIC_MOCK_OCR === "true") {
    // Simulate a brief processing delay with progress
    onProgress?.(0.3);
    await new Promise((resolve) => setTimeout(resolve, 100));
    onProgress?.(0.7);
    await new Promise((resolve) => setTimeout(resolve, 100));
    onProgress?.(1.0);
    return getMockOCRResult(docType);
  }

  const startTime = performance.now();
  const TIMEOUT_MS = 15_000;

  try {
    // Dynamic import of Tesseract.js to keep it out of the initial bundle
    const Tesseract = await import("tesseract.js");

    // Create a promise that rejects on timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error("OCR processing timed out after 15 seconds")),
        TIMEOUT_MS
      );
    });

    // Run OCR with timeout and progress reporting
    const recognizePromise = Tesseract.recognize(imageFile, "eng", {
      langPath: "/tesseract",
      logger: (msg: { progress: number }) => {
        if (onProgress && typeof msg.progress === "number") {
          onProgress(msg.progress);
        }
      },
    });

    const result = await Promise.race([recognizePromise, timeoutPromise]);
    const processingTimeMs = Math.round(performance.now() - startTime);
    const rawText = result.data.text;

    // Parse fields based on document type
    let fields: OCRField[];
    switch (docType) {
      case "passport":
        fields = parsePassportFields(rawText);
        break;
      case "drivers_license":
      case "state_id":
      default:
        fields = parseDLFields(rawText);
        break;
    }

    return {
      fields,
      rawText,
      processingTimeMs,
    };
  } catch (error) {
    const processingTimeMs = Math.round(performance.now() - startTime);
    const message =
      error instanceof Error ? error.message : "OCR processing failed";

    // On timeout or error, return empty result with the raw error info
    return {
      fields: [],
      rawText: `[Error: ${message}]`,
      processingTimeMs,
    };
  }
}
