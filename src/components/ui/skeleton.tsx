import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
}

/** Base shimmer block */
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div className={cn("animate-pulse rounded-lg bg-muted/60", className)} />
  );
}

/** Card skeleton matching app's rounded-2xl card style */
export function SkeletonCard({ className }: SkeletonProps) {
  return (
    <div className={cn(
      "rounded-2xl border border-border/60 bg-card/40 p-5 space-y-3",
      className
    )}>
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-3 w-2/3" />
      <Skeleton className="h-3 w-1/2" />
    </div>
  );
}

/** Stat card skeleton matching StatCard component */
export function SkeletonStatCard() {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/40 p-6">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="w-12 h-12 rounded-lg" />
      </div>
      <Skeleton className="h-3 w-20 mb-2" />
      <Skeleton className="h-8 w-16" />
    </div>
  );
}

/** List item skeleton (jobs, applications, messages) */
export function SkeletonListItem() {
  return (
    <div className="flex items-center gap-4 p-3 rounded-xl border border-border/40">
      <Skeleton className="w-9 h-9 rounded-lg flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-6 w-16 rounded-md" />
    </div>
  );
}

/** Section header skeleton */
export function SkeletonSectionHeader() {
  return (
    <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
      <Skeleton className="h-3 w-32" />
      <Skeleton className="h-3 w-16" />
    </div>
  );
}

/** Job card skeleton matching JobsListing cards */
export function SkeletonJobCard() {
  return (
    <div className="bg-card/40 rounded-2xl p-6 border border-border/60">
      <div className="flex gap-5">
        <Skeleton className="w-16 h-16 rounded-lg flex-shrink-0" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-5 w-2/3" />
          <div className="flex gap-3">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-6 w-20 rounded-md" />
            <Skeleton className="h-6 w-16 rounded-md" />
            <Skeleton className="h-6 w-24 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}
