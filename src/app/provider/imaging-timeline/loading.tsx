import { Skeleton } from '@/components/ui/skeleton';
import { TableSkeleton } from '@/components/ui/page-skeleton';

export default function ImagingTimelineLoading() {
  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      <div className="flex items-center gap-3">
        <Skeleton className="h-9 w-40 rounded-md" />
        <Skeleton className="h-9 w-40 rounded-md" />
      </div>
      <TableSkeleton rows={10} cols={5} />
    </div>
  );
}
