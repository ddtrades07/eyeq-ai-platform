'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Button, buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  SAAS_PLAN_ORDER,
  SAAS_PLANS,
  formatPlanPrice,
  type SaasPlanId,
} from '@/lib/billing/saas-plans';
import { startPracticeCheckout } from '@/server/actions/saas-billing';
import { toast } from 'sonner';

export function PlanCheckoutCards({
  initialPlan = 'PRACTICE',
  checkoutSuccess = false,
}: {
  initialPlan?: SaasPlanId;
  checkoutSuccess?: boolean;
}) {
  const router = useRouter();
  const [plan, setPlan] = React.useState<SaasPlanId>(initialPlan);
  const [pending, startTransition] = React.useTransition();

  function checkout() {
    const selected = SAAS_PLANS[plan];
    if (selected.cta !== 'checkout') {
      router.push('/contact');
      return;
    }
    startTransition(async () => {
      const result = await startPracticeCheckout({ plan });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      window.location.href = result.data.url;
    });
  }

  return (
    <div className="space-y-6">
      {checkoutSuccess ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
          Checkout returned successfully. Membership activates only after Stripe confirms payment via
          webhook — refresh in a moment if status is still inactive.
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        {SAAS_PLAN_ORDER.map((id) => {
          const p = SAAS_PLANS[id];
          return (
            <button
              key={id}
              type="button"
              onClick={() => setPlan(id)}
              className={cn(
                'rounded-xl border p-4 text-left transition',
                plan === id ? 'border-primary bg-primary/5' : 'border-border bg-card',
              )}
            >
              <div className="font-semibold">{p.label}</div>
              <div className="text-sm text-muted-foreground">{formatPlanPrice(p)}</div>
              <p className="mt-2 text-xs text-muted-foreground">{p.blurb}</p>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-3">
        <Button onClick={checkout} disabled={pending}>
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {SAAS_PLANS[plan].cta === 'checkout' ? 'Continue to Stripe Checkout' : 'Contact EyeQ'}
        </Button>
        <Link href="/demo" className={buttonVariants({ variant: 'outline' })}>
          Skip — explore Live Demo (free)
        </Link>
      </div>
      <p className="text-xs text-muted-foreground">
        Do not trust the browser success URL alone. Production access unlocks after signed webhook
        activation. No PHI is sent to Stripe.
      </p>
    </div>
  );
}
