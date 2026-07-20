import { Skeleton } from '@/components/ui/skeleton';
import { CardGridSkeleton } from '@/components/ui/page-skeleton';

export default function WorkflowBuilderLoading() {
  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      <div className="flex items-center justify-between">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-9 w-32 rounded-md" />
      </div>
      <CardGridSkeleton count={6} />
    </div>
  );
}
