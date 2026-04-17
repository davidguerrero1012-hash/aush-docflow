import { NextResponse } from "next/server";

export const maxDuration = 30;

/**
 * POST /api/verify-face
 * Compares a selfie face against the face on an ID document using Azure AI Face API.
 * Returns verification result with confidence score.
 */
export async function POST(request: Request) {
  const endpoint = process.env.AZURE_FACE_ENDPOINT;
  const apiKey = process.env.AZURE_FACE_KEY;

  if (!endpoint || !apiKey) {
    // If Face API not configured, return a pass-through result
    return NextResponse.json({
      verified: true,
      confidence: 0,
      message: "Face verification not configured — skipped",
    });
  }

  try {
    const formData = await request.formData();
    const idPhoto = formData.get("idPhoto") as File | null;
    const selfie = formData.get("selfie") as File | null;

    if (!idPhoto || !selfie) {
      return NextResponse.json(
        { error: "Both idPhoto and selfie are required" },
        { status: 400 }
      );
    }

    // Step 1: Detect face in ID document photo
    const idFaceId = await detectFace(endpoint, apiKey, await idPhoto.arrayBuffer());
    if (!idFaceId) {
      return NextResponse.json({
        verified: false,
        confidence: 0,
        message: "Could not detect a face in the ID document",
      });
    }

    // Step 2: Detect face in selfie
    const selfieFaceId = await detectFace(endpoint, apiKey, await selfie.arrayBuffer());
    if (!selfieFaceId) {
      return NextResponse.json({
        verified: false,
        confidence: 0,
        message: "Could not detect a face in the selfie",
      });
    }

    // Step 3: Verify the two faces match
    const verifyResult = await verifyFaces(endpoint, apiKey, idFaceId, selfieFaceId);

    return NextResponse.json({
      verified: verifyResult.isIdentical,
      confidence: Math.round(verifyResult.confidence * 100),
      message: verifyResult.isIdentical
        ? "Face verification successful"
        : "Face does not match the ID document",
    });
  } catch (error) {
    console.error("[verify-face] Error:", error);
    return NextResponse.json(
      { error: "Face verification failed" },
      { status: 500 }
    );
  }
}

/**
 * Detect a face in an image and return the faceId.
 */
async function detectFace(
  endpoint: string,
  apiKey: string,
  imageBuffer: ArrayBuffer
): Promise<string | null> {
  const detectUrl = `${endpoint}/face/v1.0/detect?returnFaceId=true&recognitionModel=recognition_04&detectionModel=detection_03`;

  const res = await fetch(detectUrl, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": apiKey,
      "Content-Type": "application/octet-stream",
    },
    body: Buffer.from(imageBuffer),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.error("[verify-face] Detect failed:", res.status, errText);
    return null;
  }

  const faces = await res.json();
  if (!Array.isArray(faces) || faces.length === 0) {
    return null;
  }

  return faces[0].faceId;
}

/**
 * Verify whether two faces belong to the same person.
 */
async function verifyFaces(
  endpoint: string,
  apiKey: string,
  faceId1: string,
  faceId2: string
): Promise<{ isIdentical: boolean; confidence: number }> {
  const verifyUrl = `${endpoint}/face/v1.0/verify`;

  const res = await fetch(verifyUrl, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ faceId1, faceId2 }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.error("[verify-face] Verify failed:", res.status, errText);
    return { isIdentical: false, confidence: 0 };
  }

  return await res.json();
}
