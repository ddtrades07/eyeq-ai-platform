import { CardGridSkeleton } from '@/components/ui/page-skeleton';

export default function Loading() {
  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      <div className="space-y-2">
        <div className="h-7 w-56 rounded bg-muted animate-pulse" />
        <div className="h-4 w-80 rounded bg-muted animate-pulse" />
      </div>
      <CardGridSkeleton count={4} />
    </div>
  );
}
