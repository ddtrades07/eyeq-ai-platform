'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/lib/db';
import { action } from '@/lib/server-action';
import { assertPermission } from '@/lib/auth/require';
import { audit } from '@/lib/audit/log';
import {
  defaultLimitsForPlan,
  isSaasPlanId,
  type SaasPlanId,
} from '@/lib/billing/saas-plans';
import {
  createBillingPortalSession,
  createStripeCustomer,
  createSubscriptionCheckoutSession,
  isStripeSaasReady,
} from '@/lib/billing/stripe-saas';

const startCheckoutSchema = z.object({
  plan: z.string().refine(isSaasPlanId, 'Invalid plan'),
});

export const startPracticeCheckout = action({
  schema: startCheckoutSchema,
  async handler(input) {
    const user = await assertPermission('org:manage');
    if (!user.organizationId) throw new Error('No organization context');
    if (!isStripeSaasReady()) {
      throw new Error('Stripe is not configured. Contact EyeQ or set STRIPE_SECRET_KEY.');
    }

    const plan = input.plan as SaasPlanId;
    if (plan === 'ENTERPRISE' || plan === 'PILOT') {
      throw new Error('This plan requires contacting EyeQ — use /contact instead of Checkout.');
    }

    const org = await db.organization.findUniqueOrThrow({
      where: { id: user.organizationId },
    });

    let sub = await db.orgSubscription.findUnique({
      where: { organizationId: org.id },
    });

    const limits = defaultLimitsForPlan(plan);

    if (!sub) {
      sub = await db.orgSubscription.create({
        data: {
          organizationId: org.id,
          plan,
          pendingPlan: plan,
          billingStatus: 'INACTIVE',
          ...limits,
        },
      });
    } else {
      sub = await db.orgSubscription.update({
        where: { id: sub.id },
        data: { pendingPlan: plan, ...limits },
      });
    }

    let customerId = sub.stripeCustomerId;
    if (!customerId) {
      const created = await createStripeCustomer({
        organizationId: org.id,
        organizationName: org.name,
        email: user.email,
        idempotencyKey: `eyeq-cus-${org.id}`,
      });
      customerId = created.customerId;
      await db.orgSubscription.update({
        where: { id: sub.id },
        data: { stripeCustomerId: customerId },
      });
    }

    const session = await createSubscriptionCheckoutSession({
      organizationId: org.id,
      customerId,
      plan,
      idempotencyKey: `eyeq-checkout-${org.id}-${plan}-${Date.now()}`,
    });

    await audit({
      organizationId: org.id,
      userId: user.id,
      action: 'UPDATE',
      resourceType: 'OrgSubscription',
      resourceId: sub.id,
      metadata: {
        event: 'checkout_session_created',
        plan,
        sessionId: session.sessionId,
        // Never include PHI
      },
    });

    return { url: session.url };
  },
});

export const openBillingPortal = action({
  schema: z.object({}),
  async handler() {
    const user = await assertPermission('org:manage');
    if (!user.organizationId) throw new Error('No organization context');
    if (!isStripeSaasReady()) {
      throw new Error('Stripe is not configured.');
    }

    const sub = await db.orgSubscription.findUnique({
      where: { organizationId: user.organizationId },
    });
    if (!sub?.stripeCustomerId) {
      throw new Error('No Stripe customer yet. Start Checkout from Pricing first.');
    }

    const portal = await createBillingPortalSession({
      customerId: sub.stripeCustomerId,
    });

    await audit({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'READ',
      resourceType: 'OrgSubscription',
      resourceId: sub.id,
      metadata: { event: 'billing_portal_opened' },
    });

    return { url: portal.url };
  },
});

const ensureSubSchema = z.object({
  plan: z.string().refine(isSaasPlanId).optional(),
});

/** Ensure OrgSubscription row exists after practice signup (inactive until webhook). */
export const ensureOrgSubscriptionRecord = action({
  schema: ensureSubSchema,
  async handler(input) {
    const user = await assertPermission('org:manage');
    if (!user.organizationId) throw new Error('No organization context');

    const plan = (input.plan as SaasPlanId | undefined) ?? 'PRACTICE';
    const limits = defaultLimitsForPlan(plan);

    const sub = await db.orgSubscription.upsert({
      where: { organizationId: user.organizationId },
      create: {
        organizationId: user.organizationId,
        plan,
        pendingPlan: plan,
        billingStatus: 'INACTIVE',
        ...limits,
      },
      update: {},
    });

    revalidatePath('/provider/settings/billing');
    revalidatePath('/provider/settings/subscription');
    return { subscriptionId: sub.id, status: sub.billingStatus };
  },
});
