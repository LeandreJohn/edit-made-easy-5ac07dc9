/** Lightweight skeleton primitives used while dashboard data is loading. */

export const SkeletonLine = ({ className }: { className?: string }) => (
  <div className={`h-3 rounded bg-muted-foreground/15 animate-pulse ${className ?? 'w-full'}`} />
);

export const SkeletonBlock = ({ className }: { className?: string }) => (
  <div className={`rounded-xl bg-muted-foreground/10 animate-pulse ${className ?? 'h-24 w-full'}`} />
);

/** Generic card skeleton matching the dashboard section preview layout. */
const SectionSkeleton = ({ rows = 6 }: { rows?: number }) => (
  <div
    className="space-y-6"
    role="status"
    aria-live="polite"
    aria-label="Loading your information"
  >
    <div className="flex items-center gap-4">
      <div className="h-16 w-16 rounded-full bg-muted-foreground/15 animate-pulse" />
      <div className="flex-1 space-y-2">
        <SkeletonLine className="h-4 w-48" />
        <SkeletonLine className="w-32" />
      </div>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="space-y-2">
          <SkeletonLine className="h-2.5 w-24" />
          <SkeletonLine className="h-3.5 w-3/4" />
        </div>
      ))}
    </div>
    <span className="sr-only">Loading your information…</span>
  </div>
);

export default SectionSkeleton;
