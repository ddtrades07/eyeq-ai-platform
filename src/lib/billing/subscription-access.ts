import 'server-only';

import type { Organization, OrgSubscription, SaasBillingStatus } from '@prisma/client';
import { db } from '@/lib/db';
import { resolveDemoModeEnabled, serverEnv } from '@/lib/env';
import { billingGracePeriodDays } from '@/lib/billing/saas-plans';

export type SubscriptionAccess = {
  /** Org may use production workflows (not just read historical records). */
  productionWorkflowsAllowed: boolean;
  /** May invite staff / add locations. */
  expansionAllowed: boolean;
  /** Show billing warning banner. */
  showBillingWarning: boolean;
  reason: string;
  status: SaasBillingStatus | 'MISSING' | 'DEMO';
  inGracePeriod: boolean;
};

type OrgSlice = Pick<
  Organization,
  'id' | 'slug' | 'controlledPilotEnabled' | 'livePhiEnabled'
>;

/**
 * Membership gating:
 * - Demo org / DEMO_MODE: free, no payment
 * - Approved pilot (MANUAL + controlledPilotEnabled) or ACTIVE/TRIALING: allowed
 * - PAST_DUE within grace: warn, still allow clinical access; block expansion after grace
 * - INACTIVE/CANCELLED: warn; block production expansion; do not wipe clinical records
 */
export function evaluateSubscriptionAccess(
  org: OrgSlice,
  sub: OrgSubscription | null,
  opts?: { isDemoOrg?: boolean },
): SubscriptionAccess {
  if (opts?.isDemoOrg || (resolveDemoModeEnabled() && org.slug === 'eyeq-demo')) {
    return {
      productionWorkflowsAllowed: true,
      expansionAllowed: true,
      showBillingWarning: false,
      reason: 'Demo organization: payment not required',
      status: 'DEMO',
      inGracePeriod: false,
    };
  }

  if (!sub) {
    return {
      productionWorkflowsAllowed: false,
      expansionAllowed: false,
      showBillingWarning: true,
      reason: 'No subscription: select a plan to activate the practice',
      status: 'MISSING',
      inGracePeriod: false,
    };
  }

  const status = sub.billingStatus;

  if (status === 'ACTIVE' || status === 'TRIALING') {
    return {
      productionWorkflowsAllowed: true,
      expansionAllowed: true,
      showBillingWarning: false,
      reason: 'Subscription active',
      status,
      inGracePeriod: false,
    };
  }

  // Approved pilot / manual billing without Stripe Checkout.
  if (status === 'MANUAL' && org.controlledPilotEnabled) {
    return {
      productionWorkflowsAllowed: true,
      expansionAllowed: true,
      showBillingWarning: false,
      reason: 'Approved pilot / manual billing',
      status,
      inGracePeriod: false,
    };
  }

  if (status === 'PAST_DUE') {
    const graceEnd =
      sub.gracePeriodEndsAt ??
      new Date(Date.now() + billingGracePeriodDays() * 24 * 60 * 60 * 1000);
    const inGrace = Date.now() < graceEnd.getTime();
    return {
      productionWorkflowsAllowed: true,
      expansionAllowed: inGrace,
      showBillingWarning: true,
      reason: inGrace
        ? 'Payment past due: update billing during grace period'
        : 'Payment past due: new invites and locations are paused',
      status,
      inGracePeriod: inGrace,
    };
  }

  // INACTIVE, CANCELLED, MANUAL without pilot approval
  return {
    productionWorkflowsAllowed: false,
    expansionAllowed: false,
    showBillingWarning: true,
    reason:
      status === 'CANCELLED'
        ? 'Subscription cancelled: renew to expand the practice'
        : 'Subscription inactive: complete Checkout or request a pilot',
    status,
    inGracePeriod: false,
  };
}

export async function getOrganizationSubscriptionAccess(organizationId: string) {
  const org = await db.organization.findUniqueOrThrow({
    where: { id: organizationId },
    select: {
      id: true,
      slug: true,
      controlledPilotEnabled: true,
      livePhiEnabled: true,
      subscription: true,
    },
  });
  const isDemoOrg = org.slug === (process.env.DEMO_ORG_SLUG ?? 'eyeq-demo');
  return {
    org,
    sub: org.subscription,
    access: evaluateSubscriptionAccess(org, org.subscription, { isDemoOrg }),
  };
}

export async function assertExpansionAllowed(organizationId: string): Promise<void> {
  const { access } = await getOrganizationSubscriptionAccess(organizationId);
  if (!access.expansionAllowed) {
    throw new Error(
      `${access.reason}. Update billing under Settings → Billing, or contact EyeQ.`,
    );
  }
}

/** Soft check used by UI banners: never throws. */
export async function getBillingWarning(organizationId: string) {
  const { access, sub } = await getOrganizationSubscriptionAccess(organizationId);
  if (!access.showBillingWarning) return null;
  return {
    message: access.reason,
    status: access.status,
    plan: sub?.plan ?? null,
    nextInvoiceAt: sub?.nextInvoiceAt ?? null,
  };
}

export function isStripeSaasConfigured(): boolean {
  return Boolean(serverEnv.stripeSecretKey);
}
