/**
 * Magic byte validation for image files.
 * Checks the first bytes of a file buffer to determine its actual type,
 * preventing MIME type spoofing attacks.
 */

interface ValidationResult {
  valid: boolean;
  detectedType: string;
}

// Magic byte signatures
const JPEG_MAGIC = [0xff, 0xd8, 0xff];
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47];

function matchesSignature(bytes: Uint8Array, signature: number[]): boolean {
  if (bytes.length < signature.length) return false;
  for (let i = 0; i < signature.length; i++) {
    if (bytes[i] !== signature[i]) return false;
  }
  return true;
}

/**
 * Validates an image file by checking its magic bytes.
 * Only JPEG and PNG are accepted.
 */
export function validateImageFile(buffer: ArrayBuffer): ValidationResult {
  const bytes = new Uint8Array(buffer);

  if (bytes.length < 4) {
    return { valid: false, detectedType: "unknown" };
  }

  if (matchesSignature(bytes, JPEG_MAGIC)) {
    return { valid: true, detectedType: "image/jpeg" };
  }

  if (matchesSignature(bytes, PNG_MAGIC)) {
    return { valid: true, detectedType: "image/png" };
  }

  return { valid: false, detectedType: "unknown" };
}

/**
 * Returns the file extension for a detected MIME type.
 */
export function getExtensionForType(mimeType: string): string {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    default:
      return "bin";
  }
}
