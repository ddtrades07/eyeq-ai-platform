'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { setActiveLocation } from '@/server/actions/location';
import { toast } from 'sonner';
import type { LocationOption } from '@/lib/location/scope';

export function LocationSwitcher({
  locations,
  activeLocationId,
  canViewAll,
}: {
  locations: LocationOption[];
  activeLocationId: string | null;
  canViewAll: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  const value = activeLocationId ?? 'all';

  function onChange(next: string) {
    startTransition(async () => {
      try {
        await setActiveLocation(next === 'all' ? 'all' : next);
        router.refresh();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : 'Could not switch location');
      }
    });
  }

  if (locations.length === 0) return null;

  return (
    <div className="flex items-center gap-1.5">
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
      ) : (
        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
      )}
      <Select value={value} onValueChange={onChange} disabled={pending}>
        <SelectTrigger className="h-8 w-[140px] border-dashed text-xs sm:w-[180px]">
          <SelectValue placeholder="Location" />
        </SelectTrigger>
        <SelectContent>
          {canViewAll ? (
            <SelectItem value="all">All locations</SelectItem>
          ) : null}
          {locations.map((loc) => (
            <SelectItem key={loc.id} value={loc.id}>
              {loc.shortName || loc.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
