import Link from 'next/link';
import { AlertTriangle, CreditCard } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import {
  GlassCard,
  GlassCardContent,
  GlassCardHeader,
  GlassCardTitle,
  SectionHeader,
} from '@/components/ui/glass-card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { requirePermission } from '@/lib/auth/require';
import { db } from '@/lib/db';
import { formatDate } from '@/lib/utils';
import type { SaasPlan } from '@prisma/client';

export const metadata = { title: 'Plan & usage' };

const PLAN_COPY: Record<
  SaasPlan,
  { label: string; blurb: string; seats: string }
> = {
  PILOT: {
    label: 'Pilot',
    blurb: 'Controlled launch for one practice. Limited seats and usage.',
    seats: 'Up to 5 providers · 2 locations',
  },
  PRACTICE: {
    label: 'Practice',
    blurb: 'Single-office production plan with standard AI and messaging usage.',
    seats: 'Up to 10 providers · 3 locations',
  },
  GROWTH: {
    label: 'Growth',
    blurb: 'Multi-location practices with higher AI and reminder volume.',
    seats: 'Up to 25 providers · 8 locations',
  },
  ENTERPRISE: {
    label: 'Enterprise',
    blurb: 'Custom contracts, SSO, and dedicated launch support.',
    seats: 'Custom seats and limits',
  },
};

function usagePct(used: number, limit: number | null | undefined) {
  if (!limit || limit <= 0) return null;
  return Math.min(100, Math.round((used / limit) * 100));
}

export default async function SubscriptionPage() {
  const user = await requirePermission('org:manage');
  if (!user.organizationId) return null;

  const [org, sub, providerCount, locationCount, aiUsage, scribeMinutes] = await Promise.all([
    db.organization.findUniqueOrThrow({
      where: { id: user.organizationId },
      select: { name: true, livePhiEnabled: true, controlledPilotEnabled: true },
    }),
    db.orgSubscription.findUnique({ where: { organizationId: user.organizationId } }),
    db.provider.count({ where: { organizationId: user.organizationId } }),
    db.location.count({ where: { organizationId: user.organizationId, active: true } }),
    db.aiUsageRecord.count({ where: { organizationId: user.organizationId } }),
    db.ambientScribeSession.count({ where: { organizationId: user.organizationId } }),
  ]);

  const plan = sub?.plan ?? 'PILOT';
  const status = sub?.billingStatus ?? 'MANUAL';
  const pastDue = status === 'PAST_DUE';

  const metrics = [
    {
      label: 'Providers',
      used: providerCount,
      limit: sub?.providerSeatLimit ?? 5,
    },
    {
      label: 'Locations',
      used: locationCount,
      limit: sub?.locationSeatLimit ?? 2,
    },
    {
      label: 'AI actions (recorded)',
      used: sub?.aiActionsUsed ?? aiUsage,
      limit: sub?.aiActionsLimit ?? null,
    },
    {
      label: 'Scribe sessions (proxy for minutes)',
      used: sub?.scribeMinutesUsed ?? scribeMinutes,
      limit: sub?.scribeMinutesLimit ?? null,
    },
    {
      label: 'SMS reminders used',
      used: sub?.smsRemindersUsed ?? 0,
      limit: sub?.smsRemindersLimit ?? null,
    },
    {
      label: 'Storage (MB)',
      used: sub?.storageMbUsed ?? 0,
      limit: sub?.storageMbLimit ?? null,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Plan & usage"
        description={`${org.name} SaaS billing. Manage Checkout and the Stripe portal under Billing. Billing alerts never hard-block clinical record access.`}
        actions={
          <Link
            href="/provider/settings/billing"
            className={buttonVariants({ size: 'sm' })}
          >
            Open billing
          </Link>
        }
      />

      {pastDue ? (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-sm text-amber-950">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <div className="font-semibold">Billing attention needed</div>
            <p className="text-amber-900/90">
              Account is marked past due. Clinical workflows stay available. Contact EyeQ to
              update payment details.
            </p>
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
            <div className="text-2xl font-semibold tracking-tight">{PLAN_COPY[plan].label}</div>
            <p className="text-sm text-muted-foreground">{PLAN_COPY[plan].blurb}</p>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{status.replace(/_/g, ' ')}</Badge>
              <Badge variant="outline">{PLAN_COPY[plan].seats}</Badge>
            </div>
            {sub?.nextInvoiceAt ? (
              <p className="text-xs text-muted-foreground">
                Next invoice date: {formatDate(sub.nextInvoiceAt)}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Invoice schedule not configured yet (manual / pilot billing).
              </p>
            )}
            {sub?.adminAlertNote ? (
              <p className="rounded-lg border border-border/60 bg-muted/30 p-2 text-xs">
                {sub.adminAlertNote}
              </p>
            ) : null}
          </GlassCardContent>
        </GlassCard>

        <GlassCard className="lg:col-span-2">
          <GlassCardHeader>
            <GlassCardTitle>Usage</GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent className="grid gap-3 sm:grid-cols-2">
            {metrics.map((m) => {
              const pct = usagePct(m.used, m.limit);
              return (
                <div
                  key={m.label}
                  className="rounded-xl border border-border/50 bg-white/50 p-3"
                >
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
                      <span className="text-sm font-normal text-muted-foreground">
                        {' '}
                        / {m.limit}
                      </span>
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

      <section>
        <SectionHeader
          title="Available plans"
          description="Informational plan catalog: use Billing settings for Checkout and the Stripe Customer Portal."
        />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {(Object.keys(PLAN_COPY) as SaasPlan[]).map((key) => (
            <div
              key={key}
              className={`rounded-xl border p-4 ${
                key === plan
                  ? 'border-primary/40 bg-primary/5'
                  : 'border-border/60 bg-white/50'
              }`}
            >
              <div className="font-semibold">{PLAN_COPY[key].label}</div>
              <p className="mt-1 text-xs text-muted-foreground">{PLAN_COPY[key].blurb}</p>
              <p className="mt-2 text-[11px] text-muted-foreground">{PLAN_COPY[key].seats}</p>
              {key === plan ? (
                <Badge className="mt-3" variant="secondary">
                  Current
                </Badge>
              ) : null}
            </div>
          ))}
        </div>
      </section>

      {!sub ? (
        <EmptyState
          title="Subscription record not created yet"
          description="EyeQ will create a plan record during pilot onboarding. Clinical access is not blocked."
          action={
            <Link
              href="/provider/onboarding"
              className={buttonVariants({ size: 'sm', variant: 'outline' })}
            >
              Open practice onboarding
            </Link>
          }
        />
      ) : null}
    </div>
  );
}
