"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { FileText, Search } from "lucide-react";
import type { Submission } from "@/types";

interface SubmissionsTableProps {
  submissions: Submission[];
}

const STATUS_CONFIG = {
  new: {
    label: "New",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  reviewed: {
    label: "Reviewed",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  flagged: {
    label: "Flagged",
    className: "bg-red-50 text-red-700 border-red-200",
  },
} as const;

function StatusBadge({ status }: { status: Submission["status"] }) {
  const config = STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        config.className
      )}
    >
      {config.label}
    </span>
  );
}

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
  const [statusFilter, setStatusFilter] = useState<string>("all");

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
      {/* Search and Filter Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-11 pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(val) => setStatusFilter(val ?? "all")}>
          <SelectTrigger className="h-11 w-full sm:w-40">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="reviewed">Reviewed</SelectItem>
            <SelectItem value="flagged">Flagged</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-zinc-200 bg-white py-16">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-zinc-100">
            <FileText className="h-6 w-6 text-zinc-400" />
          </div>
          <p className="text-sm font-medium text-zinc-900">
            {submissions.length === 0
              ? "No submissions yet"
              : "No matching submissions"}
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            {submissions.length === 0
              ? "Submissions will appear here once the form is submitted."
              : "Try adjusting your search or filter."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-zinc-50/50 hover:bg-zinc-50/50">
                <TableHead className="pl-4 font-medium text-zinc-600">
                  Reference #
                </TableHead>
                <TableHead className="font-medium text-zinc-600">
                  Name
                </TableHead>
                <TableHead className="hidden font-medium text-zinc-600 md:table-cell">
                  Email
                </TableHead>
                <TableHead className="hidden font-medium text-zinc-600 sm:table-cell">
                  Date
                </TableHead>
                <TableHead className="pr-4 font-medium text-zinc-600">
                  Status
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((submission) => (
                <TableRow
                  key={submission.id}
                  className="cursor-pointer transition-colors hover:bg-zinc-50"
                  onClick={() =>
                    router.push(`/admin/dashboard/${submission.id}`)
                  }
                >
                  <TableCell className="pl-4 font-mono text-xs text-zinc-600">
                    {submission.referenceNumber}
                  </TableCell>
                  <TableCell className="font-medium text-zinc-900">
                    {submission.firstName} {submission.lastName}
                  </TableCell>
                  <TableCell className="hidden text-zinc-600 md:table-cell">
                    {submission.email}
                  </TableCell>
                  <TableCell className="hidden text-zinc-600 sm:table-cell">
                    {formatDate(submission.createdAt)}
                  </TableCell>
                  <TableCell className="pr-4">
                    <StatusBadge status={submission.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
