import { StatRowSkeleton, TableSkeleton } from '@/components/ui/page-skeleton';

export default function FinancialReportsLoading() {
  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      <StatRowSkeleton count={4} />
      <TableSkeleton rows={10} cols={6} />
    </div>
  );
}
