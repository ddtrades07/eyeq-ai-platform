import { describe, expect, it } from 'vitest';
import { defaultLimitsForPlan } from '@/lib/billing/saas-plans';

describe('seat and location limits from plan config', () => {
  it('enforces practice vs growth caps', () => {
    const practice = defaultLimitsForPlan('PRACTICE');
    const growth = defaultLimitsForPlan('GROWTH');
    expect(practice.providerSeatLimit).toBeLessThan(growth.providerSeatLimit);
    expect(practice.locationSeatLimit).toBeLessThan(growth.locationSeatLimit);
  });

  it('uses large sentinel limits for enterprise custom', () => {
    const enterprise = defaultLimitsForPlan('ENTERPRISE');
    expect(enterprise.providerSeatLimit).toBe(9999);
    expect(enterprise.locationSeatLimit).toBe(9999);
  });
});
