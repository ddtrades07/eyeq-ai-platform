import { describe, expect, it } from 'vitest';
import { canAccessPatient, hasPermission } from '@/lib/auth/rbac';
import { Role } from '@prisma/client';
import { scopedLocationFilter, canViewAllLocations } from '@/lib/location/scope';

describe('tenant isolation', () => {
  it('blocks cross-org patient access via canAccessPatient', () => {
    expect(
      canAccessPatient(
        { role: Role.OPTOMETRIST, organizationId: 'org-a' },
        { organizationId: 'org-b' },
      ),
    ).toBe(false);
  });

  it('same-org access is allowed for staff', () => {
    expect(
      canAccessPatient(
        { role: Role.OPTOMETRIST, organizationId: 'org-a' },
        { organizationId: 'org-a' },
      ),
    ).toBe(true);
  });

  it('patient role cannot use staff clinical write permissions', () => {
    expect(hasPermission(Role.PATIENT, 'notes:write')).toBe(false);
    expect(hasPermission(Role.PATIENT, 'rx:write')).toBe(false);
    expect(hasPermission(Role.PATIENT, 'appointments:create')).toBe(false);
  });

  it('staff without location access cannot see all locations', () => {
    expect(canViewAllLocations(Role.FRONT_DESK)).toBe(false);
    const filter = scopedLocationFilter({
      locationId: null,
      role: Role.FRONT_DESK,
      allowedLocationIds: [],
    });
    expect(filter).toEqual({ locationId: '__no_location_access__' });
  });

  it('scoped staff limited to allowed locations', () => {
    const filter = scopedLocationFilter({
      locationId: null,
      role: Role.TECHNICIAN,
      allowedLocationIds: ['loc-1'],
    });
    expect(filter).toEqual({ locationId: { in: ['loc-1'] } });
  });
});
