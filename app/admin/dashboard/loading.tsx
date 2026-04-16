import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
 return (
  <div className="space-y-6">
   {/* Page title skeleton */}
   <div className="flex items-center gap-3">
    <Skeleton className="h-8 w-40" />
    <Skeleton className="h-6 w-10 rounded-full" />
   </div>

   {/* Search and filter bar skeleton */}
   <div className="flex items-center gap-3">
    <Skeleton className="h-11 flex-1 max-w-sm" />
    <Skeleton className="h-11 w-32" />
   </div>

   {/* Table skeleton */}
   <div className="overflow-hidden border border-zinc-200 bg-white">
    {/* Table header */}
    <div className="border-b border-zinc-200 bg-zinc-50/50 px-4 py-3">
     <div className="flex items-center gap-8">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-4 w-20" />
     </div>
    </div>

    {/* Table rows */}
    {Array.from({ length: 5 }).map((_, i) => (
     <div
      key={i}
      className="flex items-center gap-8 border-b border-zinc-100 px-4 py-4 last:border-b-0"
     >
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-4 w-36" />
      <Skeleton className="h-4 w-44" />
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-5 w-16 rounded-full" />
     </div>
    ))}
   </div>
  </div>
 );
}
