import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendConfirmationEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    // --- Validate Internal Secret ---
    const secret = request.headers.get("x-internal-secret");
    if (!secret || secret !== process.env.INTERNAL_API_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // --- Parse Body ---
    const { submissionId, email, referenceNumber } = await request.json();
    if (!submissionId || !email || !referenceNumber) {
      return NextResponse.json(
        { error: "submissionId, email, and referenceNumber are required" },
        { status: 400 }
      );
    }

    // --- Fetch Submission to get PDF path ---
    const { data: submission, error: fetchError } = await supabaseAdmin
      .from("submissions")
      .select("pdf_url")
      .eq("id", submissionId)
      .single();

    if (fetchError || !submission) {
      console.error("Fetch submission error:", fetchError?.message);
      return NextResponse.json(
        { error: "Submission not found" },
        { status: 404 }
      );
    }

    if (!submission.pdf_url) {
      return NextResponse.json(
        { error: "PDF not yet generated for this submission" },
        { status: 404 }
      );
    }

    // --- Download PDF from Storage ---
    const { data: pdfData, error: downloadError } = await supabaseAdmin.storage
      .from("pdfs")
      .download(submission.pdf_url);

    if (downloadError || !pdfData) {
      console.error("PDF download error:", downloadError?.message);
      return NextResponse.json(
        { error: "Failed to download PDF" },
        { status: 500 }
      );
    }

    // Convert Blob to Buffer
    const pdfArrayBuffer = await pdfData.arrayBuffer();
    const pdfBuffer = Buffer.from(pdfArrayBuffer);

    // --- Send Email ---
    await sendConfirmationEmail(email, referenceNumber, pdfBuffer);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(
      "Send email error:",
      error instanceof Error ? error.message : "Unknown error"
    );
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }
}
