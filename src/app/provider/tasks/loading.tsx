import { Skeleton } from '@/components/ui/skeleton';

export default function ProviderSectionLoading() {
  return (
    <div className="space-y-6 animate-in fade-in-50 duration-300">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-64" />
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}
