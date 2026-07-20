import { TableSkeleton } from '@/components/ui/page-skeleton';

export default function AppointmentsLoading() {
  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      <TableSkeleton rows={10} cols={6} />
    </div>
  );
}
