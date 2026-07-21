import 'server-only';

import { serverEnv, publicEnv } from '@/lib/env';
import {
  type SaasPlanId,
  stripePriceIdForPlan,
} from '@/lib/billing/saas-plans';

type StripeForm = Record<string, string | number | undefined | null>;

function stripeConfigured(): string {
  const key = serverEnv.stripeSecretKey;
  if (!key) throw new Error('Stripe is not configured (STRIPE_SECRET_KEY)');
  return key;
}

async function stripePost(
  path: string,
  form: StripeForm,
  idempotencyKey?: string,
): Promise<Record<string, unknown>> {
  const key = stripeConfigured();
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(form)) {
    if (v === undefined || v === null || v === '') continue;
    body.set(k, String(v));
  }

  const headers: Record<string, string> = {
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  };
  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey;
  }

  const res = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: 'POST',
    headers,
    body: body.toString(),
  });

  const data = (await res.json()) as Record<string, unknown> & {
    error?: { message?: string };
  };
  if (!res.ok) {
    throw new Error(data.error?.message ?? `Stripe ${path} failed (${res.status})`);
  }
  return data;
}

/**
 * Create a Stripe Customer for the practice org.
 * Metadata: organizationId only — never PHI, patient names, or clinical notes.
 */
export async function createStripeCustomer(input: {
  organizationId: string;
  organizationName: string;
  email: string;
  idempotencyKey: string;
}): Promise<{ customerId: string }> {
  const data = await stripePost(
    'customers',
    {
      email: input.email,
      name: input.organizationName,
      'metadata[organizationId]': input.organizationId,
      'metadata[product]': 'eyeq_saas',
    },
    input.idempotencyKey,
  );
  return { customerId: String(data.id) };
}

/**
 * Subscription Checkout Session. Activation happens only via signed webhooks.
 * Do NOT pass payment_method_types (Stripe dynamic payment methods).
 */
export async function createSubscriptionCheckoutSession(input: {
  organizationId: string;
  customerId: string;
  plan: SaasPlanId;
  successUrl?: string;
  cancelUrl?: string;
  idempotencyKey: string;
}): Promise<{ url: string; sessionId: string }> {
  const priceId = stripePriceIdForPlan(input.plan);
  if (!priceId) {
    throw new Error(
      `Stripe Price ID not configured for plan ${input.plan}. Set STRIPE_PRICE_${input.plan} in the environment.`,
    );
  }

  const appUrl = publicEnv.appUrl.replace(/\/$/, '');
  const data = await stripePost(
    'checkout/sessions',
    {
      mode: 'subscription',
      customer: input.customerId,
      success_url:
        input.successUrl ??
        `${appUrl}/onboarding/practice?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: input.cancelUrl ?? `${appUrl}/pricing?checkout=cancelled`,
      client_reference_id: input.organizationId,
      'line_items[0][price]': priceId,
      'line_items[0][quantity]': 1,
      'subscription_data[metadata][organizationId]': input.organizationId,
      'subscription_data[metadata][plan]': input.plan,
      'subscription_data[metadata][product]': 'eyeq_saas',
      'metadata[organizationId]': input.organizationId,
      'metadata[plan]': input.plan,
      'metadata[product]': 'eyeq_saas',
      // Product description stays non-PHI (org SaaS only).
      'metadata[description]': 'EyeQ practice membership',
    },
    input.idempotencyKey,
  );

  const url = data.url;
  if (typeof url !== 'string' || !url) {
    throw new Error('Stripe Checkout did not return a URL');
  }
  return { url, sessionId: String(data.id) };
}

export async function createBillingPortalSession(input: {
  customerId: string;
  returnUrl?: string;
}): Promise<{ url: string }> {
  const appUrl = publicEnv.appUrl.replace(/\/$/, '');
  const data = await stripePost('billing_portal/sessions', {
    customer: input.customerId,
    return_url: input.returnUrl ?? `${appUrl}/provider/settings/billing`,
  });
  const url = data.url;
  if (typeof url !== 'string' || !url) {
    throw new Error('Stripe Billing Portal did not return a URL');
  }
  return { url };
}

export function isStripeSaasReady(): boolean {
  return Boolean(serverEnv.stripeSecretKey);
}
