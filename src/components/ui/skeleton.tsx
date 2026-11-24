/**
 * Skeletons — grey placeholders while a page loads (aoocommerce Skeleton.tsx).
 * Use in a segment's loading.tsx: <PageSkeleton /> or build from the pieces.
 */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-control bg-line ${className}`} />;
}

export function SkeletonText({ lines = 3, className = "" }: { lines?: number; className?: string }) {
  return (
    <div className={`flex flex-col gap-2 ${className}`} aria-hidden>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={`h-4 ${i === lines - 1 ? "w-2/3" : "w-full"}`} />
      ))}
    </div>
  );
}

export function SkeletonCard({ lines = 3, className = "" }: { lines?: number; className?: string }) {
  return (
    <div className={`rounded-card border border-line bg-surface p-4 shadow-card ${className}`} aria-hidden>
      <Skeleton className="mb-3 h-5 w-1/3" />
      <SkeletonText lines={lines} />
    </div>
  );
}

export function SkeletonStats({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-card border border-line bg-surface p-4 shadow-card">
          <Skeleton className="h-10 w-10 shrink-0" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-5 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonList({ rows = 6 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2" aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-card border border-line bg-surface p-4 shadow-card">
          <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** A whole page: title, optional tabs / stats, then a list. */
export function PageSkeleton({ stats = false, tabs = false, rows = 6 }: { stats?: boolean; tabs?: boolean; rows?: number }) {
  return (
    <div role="status" aria-label="กำลังโหลด" className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64 max-w-full" />
      </div>
      {tabs && (
        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-14 w-20 shrink-0 rounded-card" />
          ))}
        </div>
      )}
      {stats && <SkeletonStats />}
      <SkeletonList rows={rows} />
    </div>
  );
}
