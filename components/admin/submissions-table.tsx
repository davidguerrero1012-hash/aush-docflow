"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { Submission } from "@/types";

interface SubmissionsTableProps {
  submissions: Submission[];
}

const STATUS_DOT: Record<Submission["status"], string> = {
  new: "bg-blue-500",
  reviewed: "bg-emerald-500",
  flagged: "bg-red-500",
};

const STATUS_LABEL: Record<Submission["status"], string> = {
  new: "New",
  reviewed: "Reviewed",
  flagged: "Flagged",
};

const FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "All" },
  { value: "new", label: "New" },
  { value: "reviewed", label: "Reviewed" },
  { value: "flagged", label: "Flagged" },
];

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function SubmissionsTable({ submissions }: SubmissionsTableProps) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = useMemo(() => {
    return submissions.filter((s) => {
      const matchesSearch =
        search === "" ||
        `${s.firstName} ${s.lastName}`
          .toLowerCase()
          .includes(search.toLowerCase()) ||
        s.email.toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || s.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [submissions, search, statusFilter]);

  return (
    <div className="space-y-4">
      {/* Search */}
      <input
        type="text"
        placeholder="Search by name or email..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="h-11 w-full border border-zinc-200 bg-white px-4 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none focus:border-zinc-400 transition-colors"
      />

      {/* Status filter */}
      <div className="flex items-center gap-1 text-sm">
        {FILTER_OPTIONS.map((opt, i) => (
          <span key={opt.value} className="flex items-center">
            {i > 0 && <span className="mx-2 text-zinc-300">|</span>}
            <button
              onClick={() => setStatusFilter(opt.value)}
              className={
                statusFilter === opt.value
                  ? "font-semibold text-zinc-900"
                  : "text-zinc-400 hover:text-zinc-600 transition-colors"
              }
            >
              {opt.label}
            </button>
          </span>
        ))}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm text-zinc-500">
            {submissions.length === 0
              ? "No submissions yet"
              : "No matching submissions"}
          </p>
        </div>
      ) : (
        <div className="border border-zinc-200 bg-white">
          <table className="w-full">
            <thead>
              <tr className="bg-zinc-100">
                <th className="py-3 px-4 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Reference
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Name
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 hidden md:table-cell">
                  Email
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 hidden sm:table-cell">
                  Date
                </th>
                <th className="py-3 px-4 text-left text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((submission) => (
                <tr
                  key={submission.id}
                  onClick={() =>
                    router.push(`/admin/dashboard/${submission.id}`)
                  }
                  className="border-b border-zinc-100 cursor-pointer hover:bg-zinc-50 transition-colors"
                >
                  <td className="py-4 px-4 font-mono text-xs text-zinc-600">
                    {submission.referenceNumber}
                  </td>
                  <td className="py-4 px-4 text-sm font-medium text-zinc-900">
                    {submission.firstName} {submission.lastName}
                  </td>
                  <td className="py-4 px-4 text-sm text-zinc-600 hidden md:table-cell">
                    {submission.email}
                  </td>
                  <td className="py-4 px-4 text-sm text-zinc-600 hidden sm:table-cell">
                    {formatDate(submission.createdAt)}
                  </td>
                  <td className="py-4 px-4">
                    <span className="flex items-center gap-2 text-sm text-zinc-700">
                      <span
                        className={`inline-block h-2 w-2 flex-shrink-0 rounded-full ${STATUS_DOT[submission.status]}`}
                      />
                      {STATUS_LABEL[submission.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
