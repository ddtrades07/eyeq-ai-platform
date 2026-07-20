import { Skeleton } from '@/components/ui/skeleton';

export default function PracticeSetupLoading() {
  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      <Skeleton className="h-7 w-48" />
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-xl border bg-card p-5 space-y-3">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-9 w-full rounded-md" />
            <Skeleton className="h-9 w-full rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
