import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { generateSubmissionPDF } from "@/lib/pdf";
import { mapSubmissionFromDB } from "@/lib/mappers";
import type { SubmissionRow } from "@/types";

export async function POST(request: NextRequest) {
  try {
    // --- Validate Internal Secret ---
    const secret = request.headers.get("x-internal-secret");
    if (!secret || secret !== process.env.INTERNAL_API_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // --- Parse Body ---
    const { submissionId } = await request.json();
    if (!submissionId) {
      return NextResponse.json(
        { error: "submissionId is required" },
        { status: 400 }
      );
    }

    // --- Fetch Submission ---
    const { data: row, error: fetchError } = await supabaseAdmin
      .from("submissions")
      .select("*")
      .eq("id", submissionId)
      .single();

    if (fetchError || !row) {
      console.error("Fetch submission error:", fetchError?.message);
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 }
      );
    }

    const submission = mapSubmissionFromDB(row as SubmissionRow);

    // --- Generate PDF ---
    const pdfBuffer = await generateSubmissionPDF(submission);

    // --- Upload PDF to Storage ---
    const pdfPath = `pdfs/${submissionId}.pdf`;
    const { error: uploadError } = await supabaseAdmin.storage
      .from("pdfs")
      .upload(pdfPath, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      console.error("PDF upload error:", uploadError.message);
      return NextResponse.json(
        { error: "Failed to upload PDF" },
        { status: 500 }
      );
    }

    // --- Generate Signed URL (1 hour expiry) ---
    const { data: signedUrlData, error: signedUrlError } =
      await supabaseAdmin.storage
        .from("pdfs")
        .createSignedUrl(pdfPath, 3600);

    if (signedUrlError) {
      console.error("Signed URL error:", signedUrlError.message);
      return NextResponse.json(
        { error: "Failed to generate PDF URL" },
        { status: 500 }
      );
    }

    // --- Update Submission with PDF URL ---
    const { error: updateError } = await supabaseAdmin
      .from("submissions")
      .update({ pdf_url: pdfPath })
      .eq("id", submissionId);

    if (updateError) {
      console.error("Update submission error:", updateError.message);
      // Non-fatal: PDF was generated and uploaded, URL just wasn't saved
    }

    return NextResponse.json({ pdfUrl: signedUrlData.signedUrl });
  } catch (error) {
    console.error(
      "Generate PDF error:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
