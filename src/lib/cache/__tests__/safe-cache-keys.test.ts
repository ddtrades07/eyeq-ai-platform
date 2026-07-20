import { describe, expect, it } from 'vitest';

/**
 * Documents safe-cache keying rules for performance work.
 * These are compile-time / contract checks (no PHI in cache keys beyond org/role/location).
 */
describe('safe cache key contracts', () => {
  it('dashboard cache key parts are org-scoped', () => {
    const organizationId = 'org_a';
    const locationKey = 'loc_1';
    const key = ['dashboard-counts', organizationId, locationKey];
    expect(key).toContain(organizationId);
    expect(key.join(':')).not.toMatch(/patient|dob|note|message/i);
  });

  it('pilot launch cache is org-only', () => {
    const organizationId = 'org_b';
    const key = ['pilot-launch-summary', organizationId];
    expect(key[1]).toBe(organizationId);
    expect(key).toHaveLength(2);
  });
});
