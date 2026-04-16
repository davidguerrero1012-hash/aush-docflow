"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

export function AdminLogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
  }

  return (
    <button
      onClick={handleLogout}
      className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
    >
      Logout
    </button>
  );
}
