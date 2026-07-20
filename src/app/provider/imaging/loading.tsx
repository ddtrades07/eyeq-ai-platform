import { CardGridSkeleton } from '@/components/ui/page-skeleton';

export default function ImagingLoading() {
  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      <CardGridSkeleton count={6} />
    </div>
  );
}
