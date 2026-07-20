import { CardGridSkeleton, StatRowSkeleton } from '@/components/ui/page-skeleton';

export default function TimelineIntelligenceLoading() {
  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      <StatRowSkeleton count={4} />
      <CardGridSkeleton count={4} />
    </div>
  );
}
