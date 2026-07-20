import { DashboardSkeleton } from '@/components/ui/page-skeleton';

export default function DashboardLoading() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="h-7 w-56 animate-pulse rounded-md bg-muted/70" />
        <div className="h-4 w-96 max-w-full animate-pulse rounded-md bg-muted/50" />
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-7">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl border border-border/50 bg-white/50" />
        ))}
      </div>
      <DashboardSkeleton />
    </div>
  );
}
