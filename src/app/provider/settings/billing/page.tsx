import Link from 'next/link';
import { AlertTriangle, CreditCard } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import {
  GlassCard,
  GlassCardContent,
  GlassCardHeader,
  GlassCardTitle,
} from '@/components/ui/glass-card';
import { PageHeader } from '@/components/ui/page-header';
import { requirePermission } from '@/lib/auth/require';
import { db } from '@/lib/db';
import { formatDate } from '@/lib/utils';
import { SAAS_PLANS, type SaasPlanId } from '@/lib/billing/saas-plans';
import { getOrganizationSubscriptionAccess } from '@/lib/billing/subscription-access';
import { BillingManageActions } from '@/components/billing/billing-manage-actions';
import { PlanCheckoutCards } from '@/components/billing/plan-checkout-cards';

export const metadata = { title: 'Billing' };

function usagePct(used: number, limit: number | null | undefined) {
  if (!limit || limit <= 0) return null;
  return Math.min(100, Math.round((used / limit) * 100));
}

export default async function BillingSettingsPage() {
  const user = await requirePermission('org:manage');
  if (!user.organizationId) return null;

  const [org, accessBundle, providerCount, locationCount] = await Promise.all([
    db.organization.findUniqueOrThrow({
      where: { id: user.organizationId },
      select: { name: true },
    }),
    getOrganizationSubscriptionAccess(user.organizationId),
    db.user.count({
      where: { organizationId: user.organizationId, isActive: true, role: { not: 'PATIENT' } },
    }),
    db.location.count({ where: { organizationId: user.organizationId, active: true } }),
  ]);

  const { sub, access } = accessBundle;
  const plan = (sub?.plan ?? 'PRACTICE') as SaasPlanId;
  const planCopy = SAAS_PLANS[plan];

  const metrics = [
    { label: 'Staff seats', used: providerCount, limit: sub?.providerSeatLimit ?? 5 },
    { label: 'Locations', used: locationCount, limit: sub?.locationSeatLimit ?? 2 },
    {
      label: 'AI actions',
      used: sub?.aiActionsUsed ?? 0,
      limit: sub?.aiActionsLimit ?? null,
    },
    {
      label: 'Scribe sessions',
      used: sub?.scribeMinutesUsed ?? 0,
      limit: sub?.scribeMinutesLimit ?? null,
    },
    {
      label: 'SMS reminders',
      used: sub?.smsRemindersUsed ?? 0,
      limit: sub?.smsRemindersLimit ?? null,
    },
    {
      label: 'Storage (MB)',
      used: sub?.storageMbUsed ?? 0,
      limit: sub?.storageMbLimit ?? null,
    },
  ];

  const needsCheckout =
    !access.productionWorkflowsAllowed && access.status !== 'DEMO';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Billing & membership"
        description={`${org.name} organization subscription. Patients never pay. Clinical records are not deleted when billing lapses.`}
        actions={
          <Link
            href="/provider/settings/subscription"
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            Plan & usage detail
          </Link>
        }
      />

      {access.showBillingWarning ? (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <div className="font-semibold">Billing attention</div>
            <p className="text-amber-900/90">{access.reason}</p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <GlassCard className="lg:col-span-1">
          <GlassCardHeader>
            <GlassCardTitle className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-primary" /> Current plan
            </GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent className="space-y-3">
            <div className="text-2xl font-semibold tracking-tight">{planCopy.label}</div>
            <p className="text-sm text-muted-foreground">{planCopy.blurb}</p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{String(access.status).replace(/_/g, ' ')}</Badge>
              <Badge variant="outline">
                {planCopy.limits.providerSeats ?? 'Custom'} seats ·{' '}
                {planCopy.limits.locations ?? 'Custom'} locations
              </Badge>
            </div>
            {sub?.nextInvoiceAt || sub?.currentPeriodEnd ? (
              <p className="text-xs text-muted-foreground">
                Next bill / period end:{' '}
                {formatDate(sub.nextInvoiceAt ?? sub.currentPeriodEnd!)}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Next bill date appears after Stripe activates the subscription.
              </p>
            )}
            {sub?.adminAlertNote ? (
              <p className="rounded-lg border border-border/60 bg-muted/30 p-2 text-xs">
                {sub.adminAlertNote}
              </p>
            ) : null}
            <BillingManageActions canCheckout={Boolean(sub?.stripeCustomerId)} />
          </GlassCardContent>
        </GlassCard>

        <GlassCard className="lg:col-span-2">
          <GlassCardHeader>
            <GlassCardTitle>Usage meters</GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent className="grid gap-3 sm:grid-cols-2">
            {metrics.map((m) => {
              const pct = usagePct(m.used, m.limit);
              return (
                <div key={m.label} className="rounded-xl border border-border/50 bg-white/50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-muted-foreground">{m.label}</span>
                    {pct !== null && pct >= 80 ? (
                      <Badge variant="warning" className="text-[10px]">
                        {pct}%
                      </Badge>
                    ) : null}
                  </div>
                  <div className="mt-1 text-lg font-semibold tabular-nums">
                    {m.used}
                    {m.limit != null ? (
                      <span className="text-sm font-normal text-muted-foreground"> / {m.limit}</span>
                    ) : null}
                  </div>
                  {pct !== null ? (
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary/70"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </GlassCardContent>
        </GlassCard>
      </div>

      {needsCheckout ? (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Activate membership</h2>
          <PlanCheckoutCards initialPlan={plan} />
        </section>
      ) : null}

      <p className="text-xs text-muted-foreground">
        Invoices and payment methods are managed in the Stripe Customer Portal. EyeQ never stores
        card numbers. Stripe metadata contains organizationId only — never PHI.
      </p>
    </div>
  );
}
