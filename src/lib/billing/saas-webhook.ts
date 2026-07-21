import 'server-only';

import { createHash } from 'crypto';
import type { Prisma, SaasBillingStatus, SaasPlan } from '@prisma/client';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit/log';
import {
  billingGracePeriodDays,
  defaultLimitsForPlan,
  planFromStripePriceId,
  type SaasPlanId,
} from '@/lib/billing/saas-plans';

type StripeObject = {
  id?: string;
  object?: string;
  customer?: string | { id?: string } | null;
  subscription?: string | { id?: string } | null;
  status?: string;
  cancel_at_period_end?: boolean;
  current_period_end?: number;
  metadata?: Record<string, string>;
  client_reference_id?: string;
  mode?: string;
  amount_total?: number;
  lines?: { data?: Array<{ price?: { id?: string } }> };
  items?: { data?: Array<{ price?: { id?: string } }> };
};

export type StripeEventLike = {
  id: string;
  type: string;
  data?: { object?: StripeObject };
};

function customerId(obj: StripeObject | undefined): string | null {
  if (!obj?.customer) return null;
  return typeof obj.customer === 'string' ? obj.customer : obj.customer.id ?? null;
}

function subscriptionId(obj: StripeObject | undefined): string | null {
  if (!obj?.subscription) return null;
  return typeof obj.subscription === 'string' ? obj.subscription : obj.subscription.id ?? null;
}

function priceIdFromSub(obj: StripeObject | undefined): string | null {
  return obj?.items?.data?.[0]?.price?.id ?? obj?.lines?.data?.[0]?.price?.id ?? null;
}

function mapStripeStatus(status: string | undefined): SaasBillingStatus {
  switch (status) {
    case 'active':
      return 'ACTIVE';
    case 'trialing':
      return 'TRIALING';
    case 'past_due':
    case 'unpaid':
      return 'PAST_DUE';
    case 'canceled':
    case 'incomplete_expired':
      return 'CANCELLED';
    default:
      return 'INACTIVE';
  }
}

async function findSubByOrgOrStripe(opts: {
  organizationId?: string | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
}) {
  if (opts.organizationId) {
    const byOrg = await db.orgSubscription.findUnique({
      where: { organizationId: opts.organizationId },
    });
    if (byOrg) return byOrg;
  }
  if (opts.stripeSubscriptionId) {
    const bySub = await db.orgSubscription.findFirst({
      where: { stripeSubscriptionId: opts.stripeSubscriptionId },
    });
    if (bySub) return bySub;
  }
  if (opts.stripeCustomerId) {
    return db.orgSubscription.findFirst({
      where: { stripeCustomerId: opts.stripeCustomerId },
    });
  }
  return null;
}

async function recordBillingEvent(input: {
  stripeEventId: string;
  eventType: string;
  organizationId?: string | null;
  subscriptionId?: string | null;
  payloadHash: string;
  metadata?: Prisma.InputJsonValue;
}) {
  try {
    await db.saasBillingEvent.create({
      data: {
        stripeEventId: input.stripeEventId,
        eventType: input.eventType,
        organizationId: input.organizationId ?? null,
        subscriptionId: input.subscriptionId ?? null,
        payloadHash: input.payloadHash,
        metadata: input.metadata,
        source: 'stripe',
      },
    });
    return { duplicate: false };
  } catch (err) {
    // Unique stripeEventId → already processed
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('Unique') || message.includes('unique')) {
      return { duplicate: true };
    }
    throw err;
  }
}

/**
 * Process SaaS (practice membership) Stripe events.
 * Returns true if handled as SaaS; false if caller should try patient-invoice path.
 */
export async function processSaasStripeEvent(
  event: StripeEventLike,
  rawBody: string,
): Promise<{ handled: boolean; duplicate?: boolean }> {
  const obj = event.data?.object;
  const product = obj?.metadata?.product;
  const orgFromMeta = obj?.metadata?.organizationId ?? obj?.client_reference_id;
  const isSaas =
    product === 'eyeq_saas' ||
    Boolean(orgFromMeta && event.type.startsWith('customer.subscription')) ||
    Boolean(orgFromMeta && event.type.startsWith('invoice.')) ||
    (event.type === 'checkout.session.completed' && obj?.mode === 'subscription');

  if (!isSaas && event.type === 'checkout.session.completed' && obj?.metadata?.invoiceId) {
    return { handled: false };
  }
  if (!isSaas && !orgFromMeta && event.type === 'checkout.session.completed') {
    return { handled: false };
  }
  if (!isSaas) {
    // Still try to match by Stripe customer for subscription lifecycle events
    const cus = customerId(obj);
    if (!cus && !event.type.startsWith('customer.subscription') && !event.type.startsWith('invoice.')) {
      return { handled: false };
    }
  }

  const payloadHash = createHash('sha256').update(rawBody).digest('hex');

  // Idempotency: SaasBillingEvent.stripeEventId unique
  const prior = await db.saasBillingEvent.findUnique({
    where: { stripeEventId: event.id },
  });
  if (prior) {
    return { handled: true, duplicate: true };
  }

  if (event.type === 'checkout.session.completed' && obj?.mode === 'subscription') {
    const organizationId = orgFromMeta;
    if (!organizationId) {
      await recordBillingEvent({
        stripeEventId: event.id,
        eventType: event.type,
        payloadHash,
        metadata: { note: 'missing_organizationId' },
      });
      return { handled: true };
    }

    const plan = (obj.metadata?.plan as SaasPlanId | undefined) ?? 'PRACTICE';
    const limits = defaultLimitsForPlan(plan);
    const cus = customerId(obj);
    const stripeSubId = subscriptionId(obj);

    const sub = await db.orgSubscription.upsert({
      where: { organizationId },
      create: {
        organizationId,
        plan: plan as SaasPlan,
        pendingPlan: plan as SaasPlan,
        billingStatus: 'INACTIVE',
        stripeCustomerId: cus,
        stripeSubscriptionId: stripeSubId,
        ...limits,
      },
      update: {
        pendingPlan: plan as SaasPlan,
        stripeCustomerId: cus ?? undefined,
        stripeSubscriptionId: stripeSubId ?? undefined,
      },
    });

    // Activation waits for subscription.updated/created or invoice.payment_succeeded.
    // If session is paid, activate immediately as a convenience: still webhook-verified.
    await db.orgSubscription.update({
      where: { id: sub.id },
      data: {
        plan: plan as SaasPlan,
        billingStatus: 'ACTIVE',
        activatedAt: new Date(),
        pendingPlan: null,
        stripePriceId: stripePriceIdForPlanSafe(plan),
        ...limits,
      },
    });

    await recordBillingEvent({
      stripeEventId: event.id,
      eventType: event.type,
      organizationId,
      subscriptionId: sub.id,
      payloadHash,
      metadata: { plan, sessionId: obj.id, product: 'eyeq_saas' },
    });

    await audit({
      organizationId,
      action: 'UPDATE',
      resourceType: 'OrgSubscription',
      resourceId: sub.id,
      metadata: { event: 'saas_checkout_completed', plan, stripeEventId: event.id },
    });

    return { handled: true };
  }

  if (
    event.type === 'customer.subscription.created' ||
    event.type === 'customer.subscription.updated' ||
    event.type === 'customer.subscription.deleted'
  ) {
    const organizationId = obj?.metadata?.organizationId ?? null;
    const cus = customerId(obj);
    const stripeSubId = obj?.id ?? null;
    const priceId = priceIdFromSub(obj);
    const plan =
      (obj?.metadata?.plan as SaasPlanId | undefined) ??
      planFromStripePriceId(priceId) ??
      null;
    const status =
      event.type === 'customer.subscription.deleted'
        ? ('CANCELLED' as SaasBillingStatus)
        : mapStripeStatus(obj?.status);

    const existing = await findSubByOrgOrStripe({
      organizationId,
      stripeCustomerId: cus,
      stripeSubscriptionId: stripeSubId,
    });

    if (!existing) {
      await recordBillingEvent({
        stripeEventId: event.id,
        eventType: event.type,
        organizationId,
        payloadHash,
        metadata: { note: 'subscription_row_missing', stripeSubId },
      });
      return { handled: true };
    }

    const limits = plan ? defaultLimitsForPlan(plan) : {};
    const periodEnd = obj?.current_period_end
      ? new Date(obj.current_period_end * 1000)
      : undefined;

    const updated = await db.orgSubscription.update({
      where: { id: existing.id },
      data: {
        billingStatus: status,
        stripeCustomerId: cus ?? existing.stripeCustomerId,
        stripeSubscriptionId: stripeSubId ?? existing.stripeSubscriptionId,
        stripePriceId: priceId ?? existing.stripePriceId,
        cancelAtPeriodEnd: Boolean(obj?.cancel_at_period_end),
        currentPeriodEnd: periodEnd,
        nextInvoiceAt: periodEnd,
        ...(plan ? { plan: plan as SaasPlan, ...limits } : {}),
        ...(status === 'ACTIVE' || status === 'TRIALING'
          ? { activatedAt: existing.activatedAt ?? new Date(), pendingPlan: null, gracePeriodEndsAt: null }
          : {}),
        ...(status === 'PAST_DUE' && !existing.gracePeriodEndsAt
          ? {
              gracePeriodEndsAt: new Date(
                Date.now() + billingGracePeriodDays() * 24 * 60 * 60 * 1000,
              ),
            }
          : {}),
      },
    });

    await recordBillingEvent({
      stripeEventId: event.id,
      eventType: event.type,
      organizationId: updated.organizationId,
      subscriptionId: updated.id,
      payloadHash,
      metadata: { status, plan, stripeSubId },
    });

    await audit({
      organizationId: updated.organizationId,
      action: 'UPDATE',
      resourceType: 'OrgSubscription',
      resourceId: updated.id,
      metadata: { event: event.type, status, stripeEventId: event.id },
    });

    return { handled: true };
  }

  if (event.type === 'invoice.payment_succeeded' || event.type === 'invoice.payment_failed') {
    const cus = customerId(obj);
    const stripeSubId = subscriptionId(obj);
    const existing = await findSubByOrgOrStripe({
      stripeCustomerId: cus,
      stripeSubscriptionId: stripeSubId,
    });

    if (!existing) {
      await recordBillingEvent({
        stripeEventId: event.id,
        eventType: event.type,
        payloadHash,
        metadata: { note: 'invoice_org_not_found', cus, stripeSubId },
      });
      return { handled: true };
    }

    if (event.type === 'invoice.payment_succeeded') {
      await db.orgSubscription.update({
        where: { id: existing.id },
        data: {
          billingStatus: existing.billingStatus === 'CANCELLED' ? 'CANCELLED' : 'ACTIVE',
          gracePeriodEndsAt: null,
          adminAlertNote: null,
          activatedAt: existing.activatedAt ?? new Date(),
        },
      });
    } else {
      await db.orgSubscription.update({
        where: { id: existing.id },
        data: {
          billingStatus: 'PAST_DUE',
          gracePeriodEndsAt:
            existing.gracePeriodEndsAt ??
            new Date(Date.now() + billingGracePeriodDays() * 24 * 60 * 60 * 1000),
          adminAlertNote: 'Invoice payment failed: update payment method in Billing Portal',
        },
      });
    }

    await recordBillingEvent({
      stripeEventId: event.id,
      eventType: event.type,
      organizationId: existing.organizationId,
      subscriptionId: existing.id,
      payloadHash,
      metadata: { invoiceId: obj?.id },
    });

    await audit({
      organizationId: existing.organizationId,
      action: 'UPDATE',
      resourceType: 'OrgSubscription',
      resourceId: existing.id,
      metadata: { event: event.type, stripeEventId: event.id },
    });

    return { handled: true };
  }

  // Unknown SaaS-ish event: record and acknowledge
  if (isSaas) {
    await recordBillingEvent({
      stripeEventId: event.id,
      eventType: event.type,
      organizationId: orgFromMeta,
      payloadHash,
      metadata: { note: 'ignored_saas_event' },
    });
    return { handled: true };
  }

  return { handled: false };
}

function stripePriceIdForPlanSafe(plan: SaasPlanId): string | null {
  const map: Record<SaasPlanId, string | undefined> = {
    PILOT: process.env.STRIPE_PRICE_PILOT || undefined,
    PRACTICE: process.env.STRIPE_PRICE_PRACTICE || undefined,
    GROWTH: process.env.STRIPE_PRICE_GROWTH || undefined,
    ENTERPRISE: process.env.STRIPE_PRICE_ENTERPRISE || undefined,
  };
  return map[plan] ?? null;
}
