import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { AdminNav } from "@/components/admin/admin-nav";
import { MobileNav } from "@/components/admin/mobile-nav";

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
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/admin/login");
  }

  // Verify user is in admin_users table
  const { data: adminUser } = await supabase
    .from("admin_users")
    .select("id")
    .eq("id", user.id)
    .single();

  if (!adminUser) {
    redirect("/admin/login");
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-zinc-200 bg-white lg:block">
        <AdminNav />
      </aside>

      {/* Mobile header */}
      <header className="sticky top-0 z-20 flex h-14 items-center border-b border-zinc-200 bg-white px-4 lg:hidden">
        <MobileNav />
        <span className="ml-3 text-sm font-semibold tracking-tight text-zinc-900">
          AUSH DocFlow
        </span>
      </header>

      {/* Main content */}
      <main className="lg:ml-64">
        <div className="mx-auto max-w-6xl p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
