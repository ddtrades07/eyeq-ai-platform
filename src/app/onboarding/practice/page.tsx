import Link from 'next/link';
import { PageHeader } from '@/components/ui/page-header';
import { buttonVariants } from '@/components/ui/button';
import { requirePermission } from '@/lib/auth/require';
import { db } from '@/lib/db';
import { isSaasPlanId, type SaasPlanId } from '@/lib/billing/saas-plans';
import { getOrganizationSubscriptionAccess } from '@/lib/billing/subscription-access';
import { PlanCheckoutCards } from '@/components/billing/plan-checkout-cards';
import { Badge } from '@/components/ui/badge';

export const metadata = { title: 'Practice onboarding' };

export default async function OnboardingPracticePage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string; checkout?: string }>;
}) {
  const user = await requirePermission('org:manage');
  if (!user.organizationId) return null;

  const sp = await searchParams;
  const plan: SaasPlanId =
    sp.plan && isSaasPlanId(sp.plan) ? sp.plan : 'PRACTICE';
  const { access, sub } = await getOrganizationSubscriptionAccess(user.organizationId);
  const org = await db.organization.findUniqueOrThrow({
    where: { id: user.organizationId },
    select: { name: true },
  });

  const active =
    access.status === 'ACTIVE' ||
    access.status === 'TRIALING' ||
    access.status === 'DEMO' ||
    (access.status === 'MANUAL' && access.productionWorkflowsAllowed);

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <PageHeader
        title="Activate your practice"
        description={`${org.name} — pay for the organization subscription, then invite your team and patients. Patients never pay.`}
      />

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">Status</span>
        <Badge variant={active ? 'secondary' : 'warning'}>
          {String(access.status).replace(/_/g, ' ')}
        </Badge>
        {sub?.plan ? <Badge variant="outline">{sub.plan}</Badge> : null}
      </div>

      {!active ? (
        <PlanCheckoutCards
          initialPlan={plan}
          checkoutSuccess={sp.checkout === 'success'}
        />
      ) : (
        <div className="space-y-4 rounded-xl border bg-card p-6">
          <p className="text-sm text-muted-foreground">
            Membership is active. Continue onboarding:
          </p>
          <ol className="list-decimal space-y-2 pl-5 text-sm">
            <li>
              <Link href="/onboarding/team" className="text-primary hover:underline">
                Invite your team
              </Link>
            </li>
            <li>
              <Link href="/onboarding/locations" className="text-primary hover:underline">
                Confirm locations
              </Link>
            </li>
            <li>
              <Link href="/onboarding/patients" className="text-primary hover:underline">
                Invite patients to the portal
              </Link>
            </li>
            <li>
              <Link href="/provider/settings/phi-readiness" className="text-primary hover:underline">
                Complete PHI readiness before live data
              </Link>
            </li>
          </ol>
          <Link href="/provider/dashboard" className={buttonVariants()}>
            Go to dashboard
          </Link>
        </div>
      )}
    </div>
  );
}
