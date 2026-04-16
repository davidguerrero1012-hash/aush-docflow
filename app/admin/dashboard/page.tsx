import { createClient } from "@supabase/supabase-js";
import { mapSubmissionFromDB } from "@/lib/mappers";
import { SubmissionsTable } from "@/components/admin/submissions-table";
import type { SubmissionRow } from "@/types";

export default async function AdminDashboardPage() {
  // Layout already verified user is authenticated admin
  // Use service role to fetch submissions (bypasses RLS)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
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
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
        Submissions ({submissions.length})
      </h1>

      <SubmissionsTable submissions={submissions} />
    </div>
  );
}
