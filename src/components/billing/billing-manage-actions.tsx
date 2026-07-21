'use client';

import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { openBillingPortal, startPracticeCheckout } from '@/server/actions/saas-billing';
import { toast } from 'sonner';
import type { SaasPlanId } from '@/lib/billing/saas-plans';

export function BillingManageActions({
  canCheckout,
  upgradePlan = 'GROWTH',
}: {
  canCheckout: boolean;
  upgradePlan?: SaasPlanId;
}) {
  const [pending, startTransition] = React.useTransition();

  function portal() {
    startTransition(async () => {
      const result = await openBillingPortal({});
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      window.location.href = result.data.url;
    });
  }

  function upgrade() {
    startTransition(async () => {
      const result = await startPracticeCheckout({ plan: upgradePlan });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      window.location.href = result.data.url;
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" size="sm" onClick={portal} disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        Manage billing
      </Button>
      {canCheckout ? (
        <Button type="button" size="sm" onClick={upgrade} disabled={pending}>
          Upgrade / change plan
        </Button>
      ) : null}
    </div>
  );
}
