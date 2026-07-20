import { TableSkeleton, StatRowSkeleton } from '@/components/ui/page-skeleton';

export default function SchedulingLoading() {
  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      <StatRowSkeleton count={3} />
      <TableSkeleton rows={8} cols={6} />
    </div>
  );
}
