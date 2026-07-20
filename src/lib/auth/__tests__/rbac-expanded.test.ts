import { describe, expect, it } from 'vitest';
import { hasPermission } from '@/lib/auth/rbac';
import { Role } from '@prisma/client';

describe('expanded RBAC permissions', () => {
  it('grants billing staff claim submission without org manage', () => {
    expect(hasPermission(Role.BILLING, 'claims:submit')).toBe(true);
    expect(hasPermission(Role.BILLING, 'era:post')).toBe(true);
    expect(hasPermission(Role.BILLING, 'org:manage')).toBe(false);
  });

  it('grants optical staff POS permissions', () => {
    expect(hasPermission(Role.OPTICAL, 'optical:sell')).toBe(true);
    expect(hasPermission(Role.OPTICAL, 'optical:dispense')).toBe(true);
    expect(hasPermission(Role.OPTICAL, 'notes:sign')).toBe(false);
  });

  it('grants owner migration and export permissions', () => {
    expect(hasPermission(Role.OWNER, 'migration:execute')).toBe(true);
    expect(hasPermission(Role.OWNER, 'export:manage')).toBe(true);
    expect(hasPermission(Role.OWNER, 'patients:merge')).toBe(true);
  });

  it('denies front desk from migration execute', () => {
    expect(hasPermission(Role.FRONT_DESK, 'migration:execute')).toBe(false);
    expect(hasPermission(Role.FRONT_DESK, 'statements:manage')).toBe(true);
  });
});
