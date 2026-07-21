import Link from 'next/link';
import { CheckCircle2, Sparkles } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  SAAS_PLAN_ORDER,
  SAAS_PLANS,
  formatPlanPrice,
} from '@/lib/billing/saas-plans';
import { publicLiveDemoHref } from '@/lib/demo/public-demo-href';
import { LandingNav } from '@/components/landing/landing-nav';

export const metadata = {
  title: 'Membership · EyeQ AI',
  description:
    'For practice owners only. Patients do not pay for EyeQ access. Live Demo is free.',
};

export default function PricingPage() {
  const liveDemoHref = publicLiveDemoHref();

  return (
    <div className="min-h-screen bg-landing-bg text-landing-navy">
      <LandingNav liveDemoHref={liveDemoHref} />
      <main className="mx-auto max-w-6xl px-5 py-16 lg:px-8">
        <p className="text-sm font-medium text-landing-teal">Practice membership</p>
        <h1 className="landing-display mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
          Plans for practices. Patients never pay.
        </h1>
        <p className="mt-4 max-w-2xl rounded-xl border border-landing-teal/25 bg-landing-teal/5 px-4 py-3 text-sm font-medium text-landing-navy">
          For practice owners only. Patients do not pay for EyeQ access.
        </p>
        <p className="mt-4 max-w-2xl text-lg text-landing-muted">
          Owners subscribe for the organization. Live Demo stays free with synthetic data and no
          Checkout. Display prices are informational; activation happens only after verified Stripe
          webhooks.
        </p>

        <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {SAAS_PLAN_ORDER.map((id) => {
            const plan = SAAS_PLANS[id];
            return (
              <div
                key={id}
                className={cn(
                  'flex flex-col rounded-2xl border bg-white p-6 shadow-sm',
                  plan.highlighted
                    ? 'border-landing-teal/50 ring-1 ring-landing-teal/20'
                    : 'border-landing-border/80',
                )}
              >
                <p className="text-sm font-medium text-landing-teal">{plan.label}</p>
                <p className="mt-2 text-2xl font-semibold">{formatPlanPrice(plan)}</p>
                <p className="mt-2 text-sm text-landing-muted">{plan.blurb}</p>
                <ul className="mt-5 flex-1 space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex gap-2 text-sm text-landing-muted">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-landing-teal" />
                      {f}
                    </li>
                  ))}
                </ul>
                <p className="mt-4 text-xs text-landing-muted">
                  Seats:{' '}
                  {plan.limits.providerSeats == null
                    ? 'Custom'
                    : `${plan.limits.providerSeats} providers`}
                  {' · '}
                  Locations:{' '}
                  {plan.limits.locations == null ? 'Custom' : plan.limits.locations}
                </p>
                <Link
                  href={
                    plan.cta === 'checkout'
                      ? `/signup/practice?plan=${id}`
                      : '/contact'
                  }
                  className={cn(
                    buttonVariants({ size: 'sm' }),
                    'mt-6 w-full',
                    plan.highlighted
                      ? 'bg-landing-teal text-white hover:bg-landing-teal/90'
                      : 'border border-landing-border bg-white text-landing-navy',
                  )}
                >
                  {plan.cta === 'checkout' ? 'Start practice signup' : 'Contact EyeQ'}
                </Link>
              </div>
            );
          })}
        </div>

        <div className="mt-14 rounded-2xl border border-landing-teal/30 bg-landing-teal/5 p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-landing-navy">Live Demo is free</p>
              <p className="mt-1 text-sm text-landing-muted">
                Explore as owner, provider, staff, or patient: no payment, no live PHI.
              </p>
            </div>
            <Link
              href={liveDemoHref}
              className={cn(buttonVariants(), 'bg-landing-teal text-white hover:bg-landing-teal/90')}
            >
              <Sparkles className="h-4 w-4" />
              Open Live Demo
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
