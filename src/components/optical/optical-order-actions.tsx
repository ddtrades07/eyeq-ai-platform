'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { OpticalOrderStatus } from '@prisma/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { advanceOpticalOrder, dispenseOpticalOrder } from '@/server/actions/optical';

const NEXT: Partial<Record<OpticalOrderStatus, OpticalOrderStatus>> = {
  QUOTE: OpticalOrderStatus.ORDERED,
  ORDERED: OpticalOrderStatus.AT_LAB,
  AT_LAB: OpticalOrderStatus.IN_PRODUCTION,
  IN_PRODUCTION: OpticalOrderStatus.SHIPPED,
  SHIPPED: OpticalOrderStatus.RECEIVED,
  RECEIVED: OpticalOrderStatus.QUALITY_CHECK,
  QUALITY_CHECK: OpticalOrderStatus.READY_FOR_PICKUP,
};

export function OpticalOrderActions({
  orderId,
  status,
  balanceCents,
}: {
  orderId: string;
  status: OpticalOrderStatus;
  balanceCents: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const next = NEXT[status];

  function advance() {
    if (!next) return;
    startTransition(async () => {
      const r = await advanceOpticalOrder({ orderId, status: next });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success(`Moved to ${next.replace(/_/g, ' ').toLowerCase()}`);
      router.refresh();
    });
  }

  function dispense() {
    startTransition(async () => {
      const r = await dispenseOpticalOrder({ orderId, paymentCents: balanceCents });
      if (!r.ok) {
        toast.error(r.error);
        return;
      }
      toast.success('Product dispensed');
      router.refresh();
    });
  }

  if (status === OpticalOrderStatus.DISPENSED || status === OpticalOrderStatus.CANCELLED) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {next ? (
        <Button size="sm" onClick={advance} disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Advance to {next.replace(/_/g, ' ').toLowerCase()}
        </Button>
      ) : null}
      {status === OpticalOrderStatus.READY_FOR_PICKUP ? (
        <Button size="sm" variant="secondary" onClick={dispense} disabled={pending}>
          Dispense{balanceCents > 0 ? ` · collect $${(balanceCents / 100).toFixed(2)}` : ''}
        </Button>
      ) : null}
    </div>
  );
}
