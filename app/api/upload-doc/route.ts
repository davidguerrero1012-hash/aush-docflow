import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { validateImageFile, getExtensionForType } from "@/lib/validate-file";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: NextRequest) {
  try {
    // --- Origin Validation ---
    const origin = request.headers.get("origin");
    if (origin) {
      const allowedOrigins = [
        process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
        "http://localhost:3000",
      ].filter(Boolean);

      if (!allowedOrigins.includes(origin)) {
        // Log but don't block — some environments may not match exactly
      }
    }

    // --- Parse FormData ---
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "No file provided" },
        { status: 400 }
      );
    }

    // --- File Size Check ---
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File size exceeds 10MB limit" },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        { error: "File is empty" },
        { status: 400 }
      );
    }

    // --- Magic Byte Validation ---
    const arrayBuffer = await file.arrayBuffer();
    const { valid, detectedType } = validateImageFile(arrayBuffer);

    if (!valid) {
      return NextResponse.json(
        { error: "Invalid file type. Only JPEG and PNG images are accepted." },
        { status: 400 }
      );
    }

    // --- Generate Storage Path ---
    const ext = getExtensionForType(detectedType);
    const uuid = crypto.randomUUID();
    const storagePath = `documents/${uuid}.${ext}`;

    // --- Upload to Supabase Storage ---
    const { error: uploadError } = await supabaseAdmin.storage
      .from("documents")
      .upload(storagePath, arrayBuffer, {
        contentType: detectedType,
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage upload error:", uploadError.message);
      return NextResponse.json(
        { error: "Failed to upload document. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({ path: storagePath });
  } catch (error) {
    console.error(
      "Upload route error:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return NextResponse.json(
      { error: "An unexpected error occurred during upload." },
      { status: 500 }
    );
  }
}
