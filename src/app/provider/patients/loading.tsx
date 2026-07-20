import { TableSkeleton, StatRowSkeleton } from '@/components/ui/page-skeleton';

export default function PatientsLoading() {
  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      <StatRowSkeleton count={3} />
      <TableSkeleton rows={10} cols={5} />
    </div>
  );
}
