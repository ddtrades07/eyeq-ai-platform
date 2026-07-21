/**
 * Editable SaaS plan catalog for marketing + entitlement gating.
 * Stripe Price IDs come from env — never hardcode live secrets here.
 * Display prices are informational; Checkout uses Stripe Price objects.
 */

export type SaasPlanId = 'PILOT' | 'PRACTICE' | 'GROWTH' | 'ENTERPRISE';

export type SaasPlanConfig = {
  id: SaasPlanId;
  label: string;
  blurb: string;
  /** Monthly list price in USD for marketing only (null = custom / contact). */
  monthlyPriceUsd: number | null;
  cta: 'checkout' | 'contact' | 'pilot';
  highlighted?: boolean;
  features: string[];
  limits: {
    providerSeats: number | null;
    locations: number | null;
    aiActionsPerMonth: number | null;
    scribeMinutesPerMonth: number | null;
    smsRemindersPerMonth: number | null;
    storageMb: number | null;
  };
};

export const SAAS_PLANS: Record<SaasPlanId, SaasPlanConfig> = {
  PILOT: {
    id: 'PILOT',
    label: 'Pilot',
    blurb: 'Controlled launch for one practice. Limited seats and usage.',
    monthlyPriceUsd: null,
    cta: 'pilot',
    features: [
      'Up to 5 providers and 2 locations',
      'Core charting, scheduling, and portal',
      'AI drafts with required provider review',
      'Guided onboarding and readiness gates',
    ],
    limits: {
      providerSeats: 5,
      locations: 2,
      aiActionsPerMonth: 500,
      scribeMinutesPerMonth: 300,
      smsRemindersPerMonth: 250,
      storageMb: 5_000,
    },
  },
  PRACTICE: {
    id: 'PRACTICE',
    label: 'Practice',
    blurb: 'Single-office production plan with standard AI and messaging usage.',
    monthlyPriceUsd: 399,
    cta: 'checkout',
    highlighted: true,
    features: [
      'Up to 10 providers and 3 locations',
      'Full clinical + optical workflows',
      'Patient portal invites (patients never pay)',
      'Billing drafts and reputation tools',
    ],
    limits: {
      providerSeats: 10,
      locations: 3,
      aiActionsPerMonth: 2_000,
      scribeMinutesPerMonth: 1_200,
      smsRemindersPerMonth: 1_000,
      storageMb: 25_000,
    },
  },
  GROWTH: {
    id: 'GROWTH',
    label: 'Growth',
    blurb: 'Multi-location practices with higher AI and reminder volume.',
    monthlyPriceUsd: 799,
    cta: 'checkout',
    features: [
      'Up to 25 providers and 8 locations',
      'Higher AI and scribe allowances',
      'Priority onboarding support',
      'Usage meters and Billing Portal',
    ],
    limits: {
      providerSeats: 25,
      locations: 8,
      aiActionsPerMonth: 8_000,
      scribeMinutesPerMonth: 5_000,
      smsRemindersPerMonth: 5_000,
      storageMb: 100_000,
    },
  },
  ENTERPRISE: {
    id: 'ENTERPRISE',
    label: 'Enterprise',
    blurb: 'Custom contracts, SSO, and dedicated launch support.',
    monthlyPriceUsd: null,
    cta: 'contact',
    features: [
      'Custom seats, locations, and contracts',
      'SSO and dedicated launch support',
      'Custom BAA and compliance review',
      'Volume pricing negotiated with EyeQ',
    ],
    limits: {
      providerSeats: null,
      locations: null,
      aiActionsPerMonth: null,
      scribeMinutesPerMonth: null,
      smsRemindersPerMonth: null,
      storageMb: null,
    },
  },
};

export const SAAS_PLAN_ORDER: SaasPlanId[] = ['PILOT', 'PRACTICE', 'GROWTH', 'ENTERPRISE'];

export function isSaasPlanId(value: string): value is SaasPlanId {
  return SAAS_PLAN_ORDER.includes(value as SaasPlanId);
}

export function getSaasPlan(id: SaasPlanId): SaasPlanConfig {
  return SAAS_PLANS[id];
}

export function formatPlanPrice(plan: SaasPlanConfig): string {
  if (plan.monthlyPriceUsd == null) {
    return plan.cta === 'pilot' ? 'Contact for pilot' : 'Custom';
  }
  return `$${plan.monthlyPriceUsd}/mo`;
}

/** Map env Stripe price IDs → plan. Empty IDs mean Checkout is not configured for that plan. */
export function stripePriceIdForPlan(plan: SaasPlanId): string | undefined {
  const map: Record<SaasPlanId, string | undefined> = {
    PILOT: process.env.STRIPE_PRICE_PILOT || undefined,
    PRACTICE: process.env.STRIPE_PRICE_PRACTICE || undefined,
    GROWTH: process.env.STRIPE_PRICE_GROWTH || undefined,
    ENTERPRISE: process.env.STRIPE_PRICE_ENTERPRISE || undefined,
  };
  return map[plan];
}

export function planFromStripePriceId(priceId: string | null | undefined): SaasPlanId | null {
  if (!priceId) return null;
  for (const id of SAAS_PLAN_ORDER) {
    if (stripePriceIdForPlan(id) === priceId) return id;
  }
  return null;
}

export function defaultLimitsForPlan(plan: SaasPlanId) {
  const limits = SAAS_PLANS[plan].limits;
  return {
    providerSeatLimit: limits.providerSeats ?? 9999,
    locationSeatLimit: limits.locations ?? 9999,
    aiActionsLimit: limits.aiActionsPerMonth,
    scribeMinutesLimit: limits.scribeMinutesPerMonth,
    smsRemindersLimit: limits.smsRemindersPerMonth,
    storageMbLimit: limits.storageMb,
  };
}

/** Grace period (days) after PAST_DUE before blocking new invites/locations. */
export function billingGracePeriodDays(): number {
  const n = Number(process.env.BILLING_GRACE_PERIOD_DAYS ?? '7');
  return Number.isFinite(n) && n >= 0 ? n : 7;
}
