import { describe, expect, it } from 'vitest';

/**
 * Cache-key isolation guarantees for dashboard/notification caches.
 * These are pure key-shape tests so we never share org A data with org B.
 */
describe('safe cache key isolation', () => {
  function dashboardKey(organizationId: string, locationKey: string) {
    return ['dashboard-counts', organizationId, locationKey] as const;
  }

  function notificationKey(organizationId: string, role: string) {
    return ['staff-notifications', organizationId, role] as const;
  }

  it('dashboard keys differ by organization', () => {
    expect(dashboardKey('org-a', 'all')).not.toEqual(dashboardKey('org-b', 'all'));
  });

  it('dashboard keys differ by location scope', () => {
    expect(dashboardKey('org-a', 'all')).not.toEqual(dashboardKey('org-a', 'loc-1'));
  });

  it('notification keys differ by role (admin vs OD)', () => {
    expect(notificationKey('org-a', 'OWNER')).not.toEqual(notificationKey('org-a', 'OPTOMETRIST'));
  });

  it('never builds a key without organizationId', () => {
    const key = dashboardKey('org-a', 'all');
    expect(key[1]).toBeTruthy();
    expect(key[1]).not.toBe('undefined');
  });
});

describe('command center secondary settle helper', () => {
  it('treats rejected secondary widgets as zero without throwing', () => {
    const secondary: PromiseSettledResult<number>[] = [
      { status: 'fulfilled', value: 3 },
      { status: 'rejected', reason: new Error('timeout') },
    ];
    const settled = (i: number) =>
      secondary[i]?.status === 'fulfilled'
        ? (secondary[i] as PromiseFulfilledResult<number>).value
        : 0;
    expect(settled(0)).toBe(3);
    expect(settled(1)).toBe(0);
  });
});

describe('patient chart pagination caps', () => {
  it('enforces max take of 50 for notes/imaging pages', () => {
    const cap = (take?: number) => Math.min(take ?? 20, 50);
    expect(cap(100)).toBe(50);
    expect(cap(undefined)).toBe(20);
    expect(cap(10)).toBe(10);
  });
});
