import { Skeleton } from '@/components/ui/skeleton';

export default function SettingsLoading() {
  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      <Skeleton className="h-7 w-32" />
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-24 rounded-md" />
        ))}
      </div>
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-5 space-y-3">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-9 w-full rounded-md" />
            <Skeleton className="h-9 w-2/3 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
