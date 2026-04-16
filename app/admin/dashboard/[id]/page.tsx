import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { mapSubmissionFromDB } from "@/lib/mappers";
import { SubmissionDetail } from "@/components/admin/submission-detail";
import type { SubmissionRow } from "@/types";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SubmissionDetailPage({ params }: PageProps) {
  const { id } = await params;
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
      },
    }
  );

  // Fetch submission
  const { data: row, error } = await supabase
    .from("submissions")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !row) {
    notFound();
  }

  const submission = mapSubmissionFromDB(row as SubmissionRow);

  // Generate signed URL for document (1-hour expiry)
  let documentUrl: string | null = null;
  if (submission.documentUrl) {
    const { data: docSignedUrl } = await supabase.storage
      .from("documents")
      .createSignedUrl(submission.documentUrl, 3600);

    documentUrl = docSignedUrl?.signedUrl ?? null;
  }

  // Generate signed URL for PDF if it exists (1-hour expiry)
  let pdfUrl: string | null = null;
  if (submission.pdfUrl) {
    const { data: pdfSignedUrl } = await supabase.storage
      .from("pdfs")
      .createSignedUrl(submission.pdfUrl, 3600);

    pdfUrl = pdfSignedUrl?.signedUrl ?? null;
  }

  return (
    <SubmissionDetail
      submission={submission}
      documentUrl={documentUrl}
      pdfUrl={pdfUrl}
    />
  );
}
