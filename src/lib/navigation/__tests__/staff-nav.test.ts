import { describe, expect, it } from 'vitest';
import { Role } from '@prisma/client';
import {
  getDashboardPersona,
  getStaffMobileNavItems,
  getStaffNavSections,
} from '@/lib/navigation/staff-nav';
import { hasPermission } from '@/lib/auth/rbac';

describe('staff navigation', () => {
  it('shows different sidebars per role', () => {
    const owner = getStaffNavSections(Role.OWNER).flatMap((s) => s.items.map((i) => i.href));
    const od = getStaffNavSections(Role.OPTOMETRIST).flatMap((s) => s.items.map((i) => i.href));
    const billing = getStaffNavSections(Role.BILLING).flatMap((s) => s.items.map((i) => i.href));

    expect(owner).toContain('/provider/admin-insights');
    expect(owner).toContain('/provider/dashboard');
    expect(owner).not.toContain('/provider/ambient-scribe');
    expect(od).toContain('/provider/ambient-scribe');
    expect(od).toContain('/provider/patients');
    expect(od).not.toContain('/provider/admin-insights');
    expect(billing).toContain('/provider/billing');
    expect(billing).not.toContain('/provider/imaging');
  });

  it('maps roles to dashboard personas', () => {
    expect(getDashboardPersona(Role.OWNER)).toBe('owner');
    expect(getDashboardPersona(Role.OPTOMETRIST)).toBe('optometrist');
    expect(getDashboardPersona(Role.BILLING)).toBe('billing');
  });

  it('does not expose mobile links the role cannot access', () => {
    const billingLinks = getStaffMobileNavItems(Role.BILLING);
    for (const link of billingLinks) {
      const section = getStaffNavSections(Role.BILLING)
        .flatMap((s) => s.items)
        .find((i) => i.href === link.href);
      expect(section).toBeTruthy();
    }
  });

  it('keeps primary IA paths for clinical roles', () => {
    const od = getStaffNavSections(Role.OPTOMETRIST).flatMap((s) => s.items.map((i) => i.href));
    expect(od).toContain('/provider/patient-flow');
    expect(od).toContain('/provider/copilots');
  });

  it('shows Reputation section for Owner with Google Reviews sublinks', () => {
    const owner = getStaffNavSections(Role.OWNER);
    const reputation = owner.find((s) => s.label === 'nav.section.reputation');
    expect(reputation).toBeTruthy();
    const hrefs = reputation!.items.map((i) => i.href);
    expect(hrefs).toContain('/provider/reputation');
    expect(hrefs).toContain('/provider/reputation/questions');
    expect(hrefs).toContain('/provider/reputation/drafts');
    expect(hrefs).toContain('/provider/reputation/analytics');
  });

  it('hides Reputation section from Optometrist without reputation:read', () => {
    const od = getStaffNavSections(Role.OPTOMETRIST);
    expect(od.some((s) => s.label === 'nav.section.reputation')).toBe(false);
    expect(hasPermission(Role.OPTOMETRIST, 'reputation:read')).toBe(false);
  });

  it('includes Reputation in Owner mobile nav priority', () => {
    const mobile = getStaffMobileNavItems(Role.OWNER).map((i) => i.href);
    expect(mobile).toContain('/provider/reputation');
  });
});

describe('owner clinical isolation', () => {
  it('owner cannot sign charts or review imaging', () => {
    expect(hasPermission(Role.OWNER, 'notes:sign')).toBe(false);
    expect(hasPermission(Role.OWNER, 'imaging:review')).toBe(false);
    expect(hasPermission(Role.OWNER, 'scribe:use')).toBe(false);
  });

  it('optometrist retains clinical permissions', () => {
    expect(hasPermission(Role.OPTOMETRIST, 'notes:sign')).toBe(true);
    expect(hasPermission(Role.OPTOMETRIST, 'imaging:review')).toBe(true);
  });
});
