import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { mapSubmissionFromDB } from "@/lib/mappers";
import { SubmissionsTable } from "@/components/admin/submissions-table";
import type { SubmissionRow } from "@/types";

export default async function AdminDashboardPage() {
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

  const { data: rows, error } = await supabase
    .from("submissions")
    .select("*")
    .order("created_at", { ascending: false });

  const submissions = error
    ? []
    : (rows as SubmissionRow[]).map(mapSubmissionFromDB);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
          Submissions
        </h1>
        <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-indigo-50 px-2 text-xs font-medium text-indigo-700">
          {submissions.length}
        </span>
      </div>

      <SubmissionsTable submissions={submissions} />
    </div>
  );
}
