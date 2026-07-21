import { describe, expect, it } from 'vitest';
import {
  SAAS_PLAN_ORDER,
  SAAS_PLANS,
  billingGracePeriodDays,
  defaultLimitsForPlan,
  formatPlanPrice,
  isSaasPlanId,
  planFromStripePriceId,
} from '@/lib/billing/saas-plans';

describe('saas plan config', () => {
  it('exposes four editable plans', () => {
    expect(SAAS_PLAN_ORDER).toEqual(['PILOT', 'PRACTICE', 'GROWTH', 'ENTERPRISE']);
    for (const id of SAAS_PLAN_ORDER) {
      expect(SAAS_PLANS[id].id).toBe(id);
      expect(SAAS_PLANS[id].features.length).toBeGreaterThan(0);
    }
  });

  it('keeps Practice as self-serve checkout and patients never appear as payers', () => {
    expect(SAAS_PLANS.PRACTICE.cta).toBe('checkout');
    expect(SAAS_PLANS.GROWTH.cta).toBe('checkout');
    expect(SAAS_PLANS.ENTERPRISE.cta).toBe('contact');
    expect(formatPlanPrice(SAAS_PLANS.PRACTICE)).toContain('/mo');
    expect(formatPlanPrice(SAAS_PLANS.PILOT)).toMatch(/pilot|Contact/i);
  });

  it('validates plan ids and maps price ids', () => {
    expect(isSaasPlanId('PRACTICE')).toBe(true);
    expect(isSaasPlanId('hobby')).toBe(false);
    process.env.STRIPE_PRICE_PRACTICE = 'price_test_practice';
    expect(planFromStripePriceId('price_test_practice')).toBe('PRACTICE');
    expect(planFromStripePriceId('price_unknown')).toBeNull();
  });

  it('returns default seat limits', () => {
    expect(defaultLimitsForPlan('PRACTICE').providerSeatLimit).toBe(10);
    expect(defaultLimitsForPlan('GROWTH').locationSeatLimit).toBe(8);
    expect(billingGracePeriodDays()).toBeGreaterThanOrEqual(0);
  });
});
