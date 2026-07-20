import { describe, expect, it } from 'vitest';
import { Role } from '@prisma/client';
import { hasPermission, canAccessPatient, canApproveAIOutput } from '@/lib/auth/rbac';

describe('RBAC', () => {
  it('denies front desk clinical AI', () => {
    expect(hasPermission(Role.FRONT_DESK, 'ai:clinical')).toBe(false);
    expect(hasPermission(Role.FRONT_DESK, 'ai:use')).toBe(false);
  });

  it('allows optometrist clinical AI and signing', () => {
    expect(hasPermission(Role.OPTOMETRIST, 'ai:use')).toBe(true);
    expect(hasPermission(Role.OPTOMETRIST, 'ai:clinical')).toBe(true);
    expect(canApproveAIOutput(Role.OPTOMETRIST)).toBe(true);
  });

  it('denies billing staff imaging review', () => {
    expect(hasPermission(Role.BILLING, 'imaging:read')).toBe(false);
    expect(hasPermission(Role.BILLING, 'billing:read')).toBe(true);
  });

  it('enforces tenant patient access', () => {
    expect(
      canAccessPatient(
        { role: Role.OPTOMETRIST, organizationId: 'org-a' },
        { organizationId: 'org-b' },
      ),
    ).toBe(false);
    expect(
      canAccessPatient(
        { role: Role.OPTOMETRIST, organizationId: 'org-a' },
        { organizationId: 'org-a' },
      ),
    ).toBe(true);
  });

  it('patient role cannot access staff charts', () => {
    expect(
      canAccessPatient(
        { role: Role.PATIENT, organizationId: 'org-a' },
        { organizationId: 'org-a' },
      ),
    ).toBe(false);
  });
});
