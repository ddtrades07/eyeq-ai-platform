'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { MoreHorizontal } from 'lucide-react';
import { toast } from 'sonner';
import { CareGapStatus } from '@prisma/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { setCareGapStatus } from '@/server/actions/care-gaps';

export function CareGapRowActions({ careGapId }: { careGapId: string }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  function update(status: CareGapStatus) {
    startTransition(async () => {
      const r = await setCareGapStatus({ id: careGapId, status });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success('Updated');
      router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" disabled={pending}>
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => update(CareGapStatus.CONTACTED)}>
          Mark contacted
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => update(CareGapStatus.BOOKED)}>
          Mark booked
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => update(CareGapStatus.DISMISSED)} className="text-destructive">
          Dismiss
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
