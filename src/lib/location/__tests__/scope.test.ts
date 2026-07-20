import { describe, expect, it } from 'vitest';
import { canViewAllLocations, scopedLocationFilter } from '@/lib/location/scope';

describe('location scoping', () => {
  it('grants all-location view only to owner/admin/manager', () => {
    expect(canViewAllLocations('OWNER')).toBe(true);
    expect(canViewAllLocations('ADMIN')).toBe(true);
    expect(canViewAllLocations('MANAGER')).toBe(true);
    expect(canViewAllLocations('OPTOMETRIST')).toBe(false);
    expect(canViewAllLocations('FRONT_DESK')).toBe(false);
    expect(canViewAllLocations('TECHNICIAN')).toBe(false);
    expect(canViewAllLocations('PATIENT')).toBe(false);
  });

  it('fail-closes scoped users with empty access to an impossible location id', () => {
    const filter = scopedLocationFilter({
      locationId: null,
      role: 'FRONT_DESK',
      allowedLocationIds: [],
    });
    expect(filter).toEqual({ locationId: '__no_location_access__' });
  });

  it('scopes staff to allowed location ids when no active location cookie', () => {
    const filter = scopedLocationFilter({
      locationId: null,
      role: 'TECHNICIAN',
      allowedLocationIds: ['loc-a', 'loc-b'],
    });
    expect(filter).toEqual({ locationId: { in: ['loc-a', 'loc-b'] } });
  });

  it('allows unfiltered queries for all-location roles', () => {
    const filter = scopedLocationFilter({
      locationId: null,
      role: 'OWNER',
      allowedLocationIds: [],
    });
    expect(filter).toEqual({});
  });
});
