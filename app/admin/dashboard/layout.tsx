import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import Image from "next/image";
import { AdminLogoutButton } from "@/components/admin/admin-logout-button";

export const metadata = {
  title: "Admin Dashboard | AUSH DocFlow",
  robots: "noindex, nofollow",
};

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll called from Server Component — safe to ignore
          }
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  // Use service role to check admin_users (bypasses RLS)
  const { createClient } = await import("@supabase/supabase-js");
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: adminUser } = await adminClient
    .from("admin_users")
    .select("id")
    .eq("id", user.id)
    .single();

  if (!adminUser) {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="fixed top-0 left-0 right-0 z-30 flex h-14 items-center justify-between border-b border-zinc-200 bg-white px-6">
        <div className="flex items-center gap-2.5">
          <Image src="/aush-logo.png" alt="AUSH" width={28} height={28} />
          <span className="text-sm font-semibold tracking-tight text-zinc-900">
            DocFlow <span className="font-normal text-zinc-400">Admin</span>
          </span>
        </div>
        <AdminLogoutButton />
      </header>

      <main className="pt-14">
        <div className="mx-auto max-w-6xl p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
