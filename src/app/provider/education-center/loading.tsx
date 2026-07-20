import { CardGridSkeleton } from '@/components/ui/page-skeleton';

export default function EducationCenterLoading() {
  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      <CardGridSkeleton count={9} />
    </div>
  );
}
