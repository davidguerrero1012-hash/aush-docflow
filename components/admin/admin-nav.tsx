"use client";

import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { FileText, LogOut, ShieldCheck } from "lucide-react";

const navItems = [
  {
    label: "Submissions",
    href: "/admin/dashboard",
    icon: FileText,
  },
];

export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
  }

  return (
    <nav className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-zinc-200 px-5 py-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50">
          <ShieldCheck className="h-4 w-4 text-indigo-500" />
        </div>
        <span className="text-sm font-semibold tracking-tight text-zinc-900">
          AUSH DocFlow <span className="font-normal text-zinc-400">Admin</span>
        </span>
      </div>

      {/* Nav Items */}
      <div className="flex-1 px-3 py-4">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href === "/admin/dashboard" &&
                pathname.startsWith("/admin/dashboard"));
            return (
              <li key={item.href}>
                <a
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </a>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Logout */}
      <div className="border-t border-zinc-200 px-3 py-4">
        <Button
          variant="ghost"
          className="w-full justify-start gap-2.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Logout
        </Button>
      </div>
    </nav>
  );
}
