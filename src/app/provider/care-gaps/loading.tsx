import { TableSkeleton } from '@/components/ui/page-skeleton';

export default function CareGapsLoading() {
  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      <TableSkeleton rows={8} cols={6} />
    </div>
  );
}
