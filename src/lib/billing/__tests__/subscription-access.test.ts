import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { evaluateSubscriptionAccess } from '@/lib/billing/subscription-access';
import type { Organization, OrgSubscription } from '@prisma/client';

function org(partial: Partial<Organization> = {}): Pick<
  Organization,
  'id' | 'slug' | 'controlledPilotEnabled' | 'livePhiEnabled'
> {
  return {
    id: 'org_1',
    slug: 'acme-eyes',
    controlledPilotEnabled: false,
    livePhiEnabled: false,
    ...partial,
  };
}

function sub(partial: Partial<OrgSubscription> = {}): OrgSubscription {
  return {
    id: 'sub_1',
    organizationId: 'org_1',
    plan: 'PRACTICE',
    billingStatus: 'INACTIVE',
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    stripePriceId: null,
    pendingPlan: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    activatedAt: null,
    gracePeriodEndsAt: null,
    providerSeatLimit: 10,
    locationSeatLimit: 3,
    aiActionsUsed: 0,
    aiActionsLimit: 2000,
    scribeMinutesUsed: 0,
    scribeMinutesLimit: 1200,
    smsRemindersUsed: 0,
    smsRemindersLimit: 1000,
    storageMbUsed: 0,
    storageMbLimit: 25000,
    nextInvoiceAt: null,
    adminAlertNote: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...partial,
  };
}

describe('subscription access gating', () => {
  const prevDemo = process.env.DEMO_MODE;

  beforeEach(() => {
    process.env.DEMO_MODE = 'false';
    process.env.FEATURE_DEMO_MODE = 'false';
  });

  afterEach(() => {
    process.env.DEMO_MODE = prevDemo;
  });

  it('allows demo org without payment', () => {
    const access = evaluateSubscriptionAccess(org({ slug: 'eyeq-demo' }), null, {
      isDemoOrg: true,
    });
    expect(access.productionWorkflowsAllowed).toBe(true);
    expect(access.expansionAllowed).toBe(true);
    expect(access.showBillingWarning).toBe(false);
    expect(access.status).toBe('DEMO');
  });

  it('blocks expansion when inactive', () => {
    const access = evaluateSubscriptionAccess(org(), sub({ billingStatus: 'INACTIVE' }));
    expect(access.expansionAllowed).toBe(false);
    expect(access.showBillingWarning).toBe(true);
  });

  it('allows active subscriptions', () => {
    const access = evaluateSubscriptionAccess(org(), sub({ billingStatus: 'ACTIVE' }));
    expect(access.productionWorkflowsAllowed).toBe(true);
    expect(access.expansionAllowed).toBe(true);
  });

  it('allows approved pilot with MANUAL billing', () => {
    const access = evaluateSubscriptionAccess(
      org({ controlledPilotEnabled: true }),
      sub({ billingStatus: 'MANUAL', plan: 'PILOT' }),
    );
    expect(access.productionWorkflowsAllowed).toBe(true);
    expect(access.expansionAllowed).toBe(true);
  });

  it('keeps clinical access during PAST_DUE grace but can block expansion after', () => {
    const inGrace = evaluateSubscriptionAccess(
      org(),
      sub({
        billingStatus: 'PAST_DUE',
        gracePeriodEndsAt: new Date(Date.now() + 86_400_000),
      }),
    );
    expect(inGrace.productionWorkflowsAllowed).toBe(true);
    expect(inGrace.expansionAllowed).toBe(true);

    const afterGrace = evaluateSubscriptionAccess(
      org(),
      sub({
        billingStatus: 'PAST_DUE',
        gracePeriodEndsAt: new Date(Date.now() - 1000),
      }),
    );
    expect(afterGrace.productionWorkflowsAllowed).toBe(true);
    expect(afterGrace.expansionAllowed).toBe(false);
  });
});
