import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  ImageIcon,
  MessageSquare,
  Settings,
  Boxes,
  LineChart,
  Sparkles,
  Shield,
  Receipt,
  UserCheck,
  Star,
  LifeBuoy,
  Building2,
  Wand2,
} from 'lucide-react';
import type { Role } from '@prisma/client';
import { hasAnyPermission, type Permission } from '@/lib/auth/rbac';
import type { DictionaryKey } from '@/lib/i18n/dictionaries';

export type StaffNavItem = {
  href: string;
  label: DictionaryKey;
  icon: LucideIcon;
  permissions: Permission[];
};

export type StaffNavSection = {
  label: DictionaryKey;
  items: StaffNavItem[];
};

/**
 * Canonical staff sidebar — one clean product IA.
 * Items are filtered by role permissions (no persona duplication).
 */
const PRIMARY_NAV: StaffNavItem[] = [
  {
    href: '/provider/dashboard',
    label: 'nav.dashboard',
    icon: LayoutDashboard,
    permissions: ['org:read'],
  },
  {
    href: '/provider/appointments',
    label: 'nav.schedule',
    icon: CalendarDays,
    permissions: ['appointments:read'],
  },
  {
    href: '/provider/patients',
    label: 'nav.patients',
    icon: Users,
    permissions: ['patients:read'],
  },
  {
    href: '/provider/patient-flow',
    label: 'nav.encounters',
    icon: UserCheck,
    permissions: ['appointments:read'],
  },
  {
    href: '/provider/imaging',
    label: 'nav.imaging',
    icon: ImageIcon,
    permissions: ['imaging:read'],
  },
  {
    href: '/provider/messages',
    label: 'nav.messages',
    icon: MessageSquare,
    permissions: ['messages:read'],
  },
  {
    href: '/provider/optical',
    label: 'nav.optical',
    icon: Boxes,
    permissions: ['optical:read'],
  },
  {
    href: '/provider/inventory',
    label: 'nav.inventory',
    icon: Boxes,
    permissions: ['inventory:read'],
  },
  {
    href: '/provider/billing',
    label: 'nav.billing',
    icon: Receipt,
    permissions: ['billing:read'],
  },
  {
    href: '/provider/copilots',
    label: 'nav.ai',
    icon: Sparkles,
    permissions: ['ai:use', 'scribe:use', 'ai:configure'],
  },
  {
    href: '/provider/reputation',
    label: 'nav.reputation',
    icon: Star,
    permissions: ['reputation:read'],
  },
  {
    href: '/provider/reports',
    label: 'nav.reports',
    icon: LineChart,
    permissions: ['finance:read', 'intelligence:practice', 'appointments:read'],
  },
];

const ADMIN_NAV: StaffNavItem[] = [
  {
    href: '/provider/admin-insights',
    label: 'nav.practiceOverview',
    icon: LineChart,
    permissions: ['finance:read'],
  },
  {
    href: '/provider/team',
    label: 'nav.team',
    icon: Users,
    permissions: ['users:manage'],
  },
  {
    href: '/provider/practice-setup',
    label: 'nav.locations',
    icon: Wand2,
    permissions: ['org:manage'],
  },
  {
    href: '/provider/onboarding',
    label: 'nav.practiceOnboarding',
    icon: Building2,
    permissions: ['org:manage'],
  },
  {
    href: '/provider/support',
    label: 'nav.support',
    icon: LifeBuoy,
    permissions: ['org:read'],
  },
  {
    href: '/provider/settings/subscription',
    label: 'nav.subscription',
    icon: Receipt,
    permissions: ['org:manage'],
  },
  {
    href: '/provider/audit-logs',
    label: 'nav.auditLogs',
    icon: Shield,
    permissions: ['audit:read'],
  },
];

const SETTINGS_NAV: StaffNavItem[] = [
  {
    href: '/provider/settings',
    label: 'nav.settings',
    icon: Settings,
    permissions: ['org:read'],
  },
];

/** Clinical extras for OD / scribe roles (still permission-gated). */
const CLINICAL_EXTRAS: StaffNavItem[] = [
  {
    href: '/provider/ambient-scribe',
    label: 'nav.ambientScribe',
    icon: Sparkles,
    permissions: ['scribe:use'],
  },
];

function filterItems(role: Role, items: StaffNavItem[]): StaffNavItem[] {
  return items.filter((item) => hasAnyPermission(role, item.permissions));
}

/** Returns sidebar sections visible for the given staff role. */
export function getStaffNavSections(role: Role): StaffNavSection[] {
  const primary = filterItems(role, PRIMARY_NAV);
  const clinical = filterItems(role, CLINICAL_EXTRAS);
  const admin = filterItems(role, ADMIN_NAV);
  const settings = filterItems(role, SETTINGS_NAV);

  const sections: StaffNavSection[] = [];
  if (primary.length) {
    sections.push({ label: 'nav.section.workspace', items: primary });
  }
  if (clinical.length) {
    sections.push({ label: 'nav.section.clinical', items: clinical });
  }
  if (admin.length) {
    sections.push({ label: 'nav.section.admin', items: admin });
  }
  if (settings.length) {
    sections.push({ label: 'nav.section.configuration', items: settings });
  }
  return sections;
}

/** Flat mobile nav links for staff (deduped by href). */
export function getStaffMobileNavItems(role: Role): { href: string; label: DictionaryKey }[] {
  const seen = new Set<string>();
  const out: { href: string; label: DictionaryKey }[] = [];
  for (const section of getStaffNavSections(role)) {
    for (const item of section.items) {
      if (seen.has(item.href)) continue;
      seen.add(item.href);
      out.push({ href: item.href, label: item.label });
    }
  }
  return out.slice(0, 8);
}

export type DashboardPersona =
  | 'owner'
  | 'admin'
  | 'optometrist'
  | 'technician'
  | 'frontdesk'
  | 'billing'
  | 'manager'
  | 'optical'
  | 'scribe';

export function getDashboardPersona(role: Role): DashboardPersona {
  switch (role) {
    case 'OWNER':
      return 'owner';
    case 'ADMIN':
      return 'admin';
    case 'MANAGER':
      return 'manager';
    case 'OPTOMETRIST':
    case 'MD':
    case 'RESIDENT':
      return 'optometrist';
    case 'TECHNICIAN':
      return 'technician';
    case 'FRONT_DESK':
      return 'frontdesk';
    case 'BILLING':
      return 'billing';
    case 'OPTICAL':
      return 'optical';
    case 'SCRIBE':
      return 'scribe';
    default:
      return 'optometrist';
  }
}
