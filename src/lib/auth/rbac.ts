import { Role } from '@prisma/client';

/**
 * Permission identifiers used throughout the platform. Keep these short
 * and verb-noun to make role mapping easy to audit.
 */
export const PERMISSIONS = {
  // Staff tasks
  'tasks:read': 'View staff tasks',
  'tasks:manage': 'Create and assign staff tasks',

  // Org administration
  'org:manage': 'Manage organization settings, users, billing',
  'org:read': 'View organization metadata',
  'users:manage': 'Invite, modify, deactivate users',

  // Appointments
  'appointments:read': 'View appointments',
  'appointments:create': 'Create appointments',
  'appointments:update': 'Modify appointments',
  'appointments:delete': 'Cancel appointments',
  'appointments:status': 'Change appointment status (check-in, etc.)',

  // Patients
  'patients:read': 'View patient charts',
  'patients:create': 'Register new patients',
  'patients:update': 'Edit patient demographics',
  'patients:delete': 'Archive patients',

  // Clinical notes
  'notes:read': 'View clinical notes',
  'notes:write': 'Author clinical notes',
  'notes:sign': 'Sign / lock clinical notes',

  // Imaging
  'imaging:read': 'View imaging cases',
  'imaging:upload': 'Upload imaging',
  'imaging:review': 'Add provider review + sign-off',

  // Prescriptions
  'rx:read': 'View prescriptions',
  'rx:write': 'Author / refresh prescriptions',

  // Care gaps
  'caregaps:read': 'View care gaps',
  'caregaps:manage': 'Dismiss / resolve care gaps',

  // Messaging
  'messages:read': 'Read messages',
  'messages:send': 'Send messages',
  'messages:internal': 'Send internal staff notes',

  // Disease documentation templates
  'templates:read': 'Browse disease documentation templates',
  'templates:manage': 'Author / edit org-level documentation templates',

  // EHR integrations
  'ehr:read': 'View EHR integration status',
  'ehr:manage': 'Configure / connect / disconnect EHR integrations',

  // Inventory
  'inventory:read': 'View inventory quantities',
  'inventory:adjust': 'Adjust inventory quantities',
  'inventory:manage': 'Manage items, vendors, costs',

  // Financial reporting
  'finance:read': 'View owner-level financial / operational reports',

  // Patient billing
  'billing:read': 'View invoices, balances, claims, payments',
  'billing:manage': 'Create and update invoices and payments',
  'claims:create': 'Create insurance claims',
  'claims:submit': 'Submit or record claim submission',
  'payments:refund': 'Issue refunds',
  'era:post': 'Post ERA / EOB remittances and adjustments',
  'statements:manage': 'Generate and send patient statements',

  // Patient master record
  'patients:merge': 'Merge and unmerge duplicate patient records',

  // Optical point of sale + lab
  'optical:read': 'View optical orders and quotes',
  'optical:sell': 'Create optical quotes and orders',
  'optical:order': 'Submit optical lab orders',
  'optical:dispense': 'Dispense optical products and collect balances',
  'optical:manage': 'Manage optical labs and settings',

  // Data migration center
  'migration:create': 'Create migration projects',
  'migration:upload': 'Upload migration source files',
  'migration:map': 'Map source fields to EyeQ fields',
  'migration:validate': 'Run migration validation',
  'migration:approve': 'Approve migration reconciliation',
  'migration:execute': 'Execute trial and final migration imports',
  'migration:view_phi': 'View PHI inside staged migration records',
  'migration:delete_files': 'Delete migration source files',

  // Data export
  'export:manage': 'Export practice data',

  // Intake forms
  'forms:manage': 'Assign and manage patient intake forms',

  // Audit logs
  'audit:read': 'View the practice audit log',

  // Ambient scribe
  'scribe:use': 'Use the ambient scribe + generate notes from a session',

  // AI platform
  'ai:use': 'Use EyeQ AI assistant and platform help',
  'ai:clinical': 'Use clinical AI features (chart summaries, scribe notes, drafts)',
  'ai:configure': 'Configure AI providers, routing, and limits',
  'ai:approve': 'Approve AI-generated clinical output',

  // Reminders / communication
  'reminders:read': 'View reminder templates and campaigns',
  'reminders:manage': 'Create or modify templates and campaigns',
  'reminders:approve': 'Approve a campaign for send',

  // Google Business / reputation
  'reputation:read': 'View Google reviews and reply drafts',
  'reputation:manage': 'Draft, edit, and publish Google review replies',

  // i18n
  'i18n:manage': 'Manage translation overrides',

  // Timeline Intelligence
  'intelligence:read': 'View Timeline Intelligence and Clinical Memory insights',
  'intelligence:practice': 'View practice-level intelligence (cracks, no-show, recall leakage)',

  // Patient portal scope
  'portal:self': 'View own portal data only',
} as const;

export type Permission = keyof typeof PERMISSIONS;

/**
 * Master role -> permission grid. Adjust here to change the policy.
 * Always grant least-privilege; deny by default.
 */
export const ROLE_PERMISSIONS: Record<Role, ReadonlySet<Permission>> = {
  OWNER: new Set<Permission>([
    'org:manage', 'org:read', 'users:manage',
    'appointments:read', 'appointments:create', 'appointments:update', 'appointments:delete', 'appointments:status',
    'patients:read', 'patients:create', 'patients:update', 'patients:delete',
    'notes:read',
    'imaging:read',
    'rx:read',
    'caregaps:read', 'caregaps:manage',
    'messages:read', 'messages:send', 'messages:internal',
    'templates:read', 'templates:manage',
    'ehr:read', 'ehr:manage',
    'inventory:read', 'inventory:adjust', 'inventory:manage',
    'finance:read',
    'billing:read', 'billing:manage',
    'claims:create', 'claims:submit', 'payments:refund', 'era:post', 'statements:manage',
    'patients:merge',
    'optical:read', 'optical:sell', 'optical:order', 'optical:dispense', 'optical:manage',
    'migration:create', 'migration:upload', 'migration:map', 'migration:validate',
    'migration:approve', 'migration:execute', 'migration:view_phi', 'migration:delete_files',
    'export:manage',
    'forms:manage',
    'audit:read',
    'ai:use', 'ai:configure',
    'reminders:read', 'reminders:manage', 'reminders:approve',
    'reputation:read', 'reputation:manage',
    'i18n:manage',
    'intelligence:read', 'intelligence:practice',
    'tasks:read', 'tasks:manage',
  ]),
  ADMIN: new Set<Permission>([
    'org:manage', 'org:read', 'users:manage',
    'appointments:read', 'appointments:create', 'appointments:update', 'appointments:delete', 'appointments:status',
    'patients:read', 'patients:create', 'patients:update', 'patients:delete',
    'notes:read',
    'imaging:read',
    'rx:read',
    'caregaps:read', 'caregaps:manage',
    'messages:read', 'messages:send', 'messages:internal',
    'templates:read', 'templates:manage',
    'ehr:read', 'ehr:manage',
    'inventory:read', 'inventory:adjust', 'inventory:manage',
    'finance:read',
    'billing:read', 'billing:manage',
    'claims:create', 'claims:submit', 'payments:refund', 'era:post', 'statements:manage',
    'patients:merge',
    'optical:read', 'optical:sell', 'optical:order', 'optical:dispense', 'optical:manage',
    'migration:create', 'migration:upload', 'migration:map', 'migration:validate',
    'migration:approve', 'migration:execute', 'migration:view_phi', 'migration:delete_files',
    'export:manage',
    'forms:manage',
    'audit:read',
    'ai:use', 'ai:configure',
    'reminders:read', 'reminders:manage', 'reminders:approve',
    'reputation:read', 'reputation:manage',
    'i18n:manage',
    'intelligence:read', 'intelligence:practice',
    'tasks:read', 'tasks:manage',
  ]),
  MANAGER: new Set<Permission>([
    'org:read',
    'appointments:read', 'appointments:create', 'appointments:update', 'appointments:status',
    'patients:read', 'patients:create', 'patients:update',
    'notes:read',
    'imaging:read',
    'rx:read',
    'caregaps:read', 'caregaps:manage',
    'messages:read', 'messages:send', 'messages:internal',
    'templates:read',
    'inventory:read', 'inventory:adjust',
    'billing:read',
    'optical:read', 'optical:sell', 'optical:dispense',
    'statements:manage',
    'reminders:read', 'reminders:manage',
    'reputation:read', 'reputation:manage',
    'ai:use',
    'intelligence:read', 'intelligence:practice',
    'tasks:read', 'tasks:manage',
  ]),
  OPTOMETRIST: new Set<Permission>([
    'org:read',
    'appointments:read', 'appointments:update', 'appointments:status',
    'patients:read', 'patients:update',
    'notes:read', 'notes:write', 'notes:sign',
    'imaging:read', 'imaging:review',
    'rx:read', 'rx:write',
    'caregaps:read', 'caregaps:manage',
    'messages:read', 'messages:send', 'messages:internal',
    'templates:read', 'templates:manage',
    'inventory:read',
    'optical:read',
    'scribe:use',
    'ai:use', 'ai:clinical', 'ai:approve',
    'reminders:read',
    'intelligence:read',
    'tasks:read', 'tasks:manage',
  ]),
  MD: new Set<Permission>([
    'org:read',
    'appointments:read', 'appointments:update', 'appointments:status',
    'patients:read', 'patients:update',
    'notes:read', 'notes:write', 'notes:sign',
    'imaging:read', 'imaging:review',
    'rx:read', 'rx:write',
    'caregaps:read', 'caregaps:manage',
    'messages:read', 'messages:send', 'messages:internal',
    'templates:read',
    'inventory:read',
    'scribe:use',
    'ai:use', 'ai:clinical', 'ai:approve',
    'reminders:read',
    'intelligence:read',
  ]),
  RESIDENT: new Set<Permission>([
    'org:read',
    'appointments:read',
    'patients:read', 'patients:update',
    'notes:read', 'notes:write',
    'imaging:read',
    'rx:read',
    'caregaps:read',
    'messages:read', 'messages:send', 'messages:internal',
    'templates:read',
    'scribe:use',
    'ai:use', 'ai:clinical',
    'intelligence:read',
    'tasks:read', 'tasks:manage',
  ]),
  TECHNICIAN: new Set<Permission>([
    'org:read',
    'appointments:read', 'appointments:status',
    'patients:read', 'patients:update',
    'notes:read', 'notes:write',
    'imaging:read', 'imaging:upload',
    'rx:read',
    'caregaps:read',
    'messages:read', 'messages:internal',
    'templates:read',
    'inventory:read', 'inventory:adjust',
    'intelligence:read',
    'ai:use',
    'tasks:read', 'tasks:manage',
  ]),
  FRONT_DESK: new Set<Permission>([
    'org:read',
    'appointments:read', 'appointments:create', 'appointments:update', 'appointments:status',
    'patients:read', 'patients:create', 'patients:update',
    'caregaps:read', 'caregaps:manage',
    'messages:read', 'messages:send',
    'forms:manage',
    'billing:read', 'billing:manage',
    'statements:manage',
    'optical:read',
    'reminders:read', 'reminders:manage',
    'intelligence:read',
    'tasks:read', 'tasks:manage',
  ]),
  OPTICAL: new Set<Permission>([
    'org:read',
    'appointments:read', 'appointments:status',
    'patients:read',
    'rx:read',
    'caregaps:read',
    'messages:read', 'messages:send',
    'inventory:read', 'inventory:adjust', 'inventory:manage',
    'billing:read', 'billing:manage',
    'optical:read', 'optical:sell', 'optical:order', 'optical:dispense', 'optical:manage',
    'tasks:read', 'tasks:manage',
  ]),
  SCRIBE: new Set<Permission>([
    'org:read',
    'appointments:read',
    'patients:read',
    'notes:read', 'notes:write',
    'imaging:read',
    'messages:read', 'messages:internal',
    'templates:read',
    'scribe:use',
    'ai:use', 'ai:clinical',
  ]),
  BILLING: new Set<Permission>([
    'org:read',
    'appointments:read',
    'patients:read',
    'billing:read', 'billing:manage',
    'claims:create', 'claims:submit', 'payments:refund', 'era:post', 'statements:manage',
    'messages:read', 'messages:send',
    'tasks:read', 'tasks:manage',
  ]),
  PATIENT: new Set<Permission>([
    'portal:self',
    'ai:use',
  ]),
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.has(permission) ?? false;
}

export function hasAnyPermission(role: Role, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

export const STAFF_ROLES: ReadonlySet<Role> = new Set<Role>([
  Role.OWNER,
  Role.ADMIN,
  Role.MANAGER,
  Role.OPTOMETRIST,
  Role.MD,
  Role.RESIDENT,
  Role.TECHNICIAN,
  Role.FRONT_DESK,
  Role.OPTICAL,
  Role.SCRIBE,
  Role.BILLING,
]);

export function isStaffRole(role: Role): boolean {
  return STAFF_ROLES.has(role);
}

export function isPatientRole(role: Role): boolean {
  return role === Role.PATIENT;
}

// ── Named access helpers ─────────────────────────────────────────
// Readable wrappers used by pages and actions so intent is explicit.

/** Staff can open charts for patients in their own practice. */
export function canAccessPatient(
  user: { role: Role; organizationId: string | null },
  patient: { organizationId: string },
): boolean {
  if (user.role === Role.PATIENT) return false;
  if (!hasPermission(user.role, 'patients:read')) return false;
  return user.organizationId === patient.organizationId;
}

export function canEditClinicalNote(role: Role): boolean {
  return hasPermission(role, 'notes:write');
}

/** Approving clinical AI output requires signing authority. */
export function canApproveAIOutput(role: Role): boolean {
  return hasPermission(role, 'notes:sign') || hasPermission(role, 'imaging:review');
}

export function canViewBilling(role: Role): boolean {
  return hasPermission(role, 'billing:read');
}

export function canManageTeam(role: Role): boolean {
  return hasPermission(role, 'users:manage');
}

export function canAccessAuditLogs(role: Role): boolean {
  return hasPermission(role, 'audit:read');
}

export function canMergePatients(role: Role): boolean {
  return hasPermission(role, 'patients:merge');
}

export function canManageMigration(role: Role): boolean {
  return hasAnyPermission(role, ['migration:create', 'migration:execute']);
}

export function canSellOptical(role: Role): boolean {
  return hasPermission(role, 'optical:sell');
}

export const ROLE_LABELS: Record<Role, string> = {
  OWNER: 'Owner',
  ADMIN: 'Admin',
  MANAGER: 'Practice Manager',
  OPTOMETRIST: 'Optometrist',
  MD: 'Physician',
  RESIDENT: 'Resident',
  TECHNICIAN: 'Technician',
  FRONT_DESK: 'Front Desk',
  OPTICAL: 'Optical Staff',
  SCRIBE: 'Scribe',
  BILLING: 'Billing',
  PATIENT: 'Patient',
};
