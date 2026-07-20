import type { Role } from '@prisma/client';

/** Server-side demo role keys. Never expose passwords to the client. */
export type DemoRoleKey =
  | 'owner'
  | 'optometrist'
  | 'technician'
  | 'frontdesk'
  | 'billing'
  | 'optical'
  | 'admin'
  | 'patient';

export const DEMO_PASSWORD = 'EyeQDemo!2026';

export type DemoRoleAccount = {
  key: DemoRoleKey;
  email: string;
  role: Role;
  firstName: string;
  lastName: string;
  title: string;
  description: string;
  workflows: string[];
  /** Post-login landing route */
  redirect: string;
};

export const DEMO_ROLE_ACCOUNTS: DemoRoleAccount[] = [
  {
    key: 'owner',
    email: 'owner.demo@eyeq.local',
    role: 'OWNER',
    firstName: 'Arjun',
    lastName: 'Patel',
    title: 'Practice Owner',
    description: 'Practice performance, team oversight, integrations, and security.',
    workflows: [
      'Review practice performance',
      'Compare locations',
      'Check outstanding claims',
      'Manage team permissions',
    ],
    redirect: '/provider/dashboard',
  },
  {
    key: 'optometrist',
    email: 'optometrist.demo@eyeq.local',
    role: 'OPTOMETRIST',
    firstName: 'Maya',
    lastName: 'Shah',
    title: 'Optometrist',
    description: 'Patient care, imaging review, charting, and prescriptions.',
    workflows: [
      "Open Michael Thompson's chart",
      'Review OCT and fundus imaging',
      'Complete assessment and plan',
      'Sign the encounter',
    ],
    redirect: '/provider/dashboard',
  },
  {
    key: 'technician',
    email: 'technician.demo@eyeq.local',
    role: 'TECHNICIAN',
    firstName: 'Nina',
    lastName: 'Patel',
    title: 'Technician',
    description: 'Pretesting, imaging upload, and patient preparation.',
    workflows: [
      'Open the patient queue',
      'Enter pretest measurements',
      'Upload OCT and fundus imaging',
      'Mark patient ready for provider',
    ],
    redirect: '/provider/dashboard',
  },
  {
    key: 'frontdesk',
    email: 'frontdesk.demo@eyeq.local',
    role: 'FRONT_DESK',
    firstName: 'Priya',
    lastName: 'Mehta',
    title: 'Front Desk',
    description: 'Scheduling, check-in, forms, and patient flow.',
    workflows: [
      'Check in Michael Thompson',
      'Verify insurance status',
      'Send an intake reminder',
      'Collect a demo copay',
    ],
    redirect: '/provider/dashboard',
  },
  {
    key: 'billing',
    email: 'billing.demo@eyeq.local',
    role: 'BILLING',
    firstName: 'Olivia',
    lastName: 'Chen',
    title: 'Billing Specialist',
    description: 'Claims, balances, payments, and revenue cycle tasks.',
    workflows: [
      "Review Michael Thompson's claim",
      'Validate charges',
      'Post a demo payment',
      'Generate a demo statement',
    ],
    redirect: '/provider/dashboard',
  },
  {
    key: 'optical',
    email: 'optical.demo@eyeq.local',
    role: 'OPTICAL',
    firstName: 'Marcus',
    lastName: 'Lee',
    title: 'Optical Staff',
    description: 'Optical orders, dispensing, lab orders, and frame inventory.',
    workflows: [
      'Create a glasses quote',
      'Link the prescription and frame',
      'Create a lab order',
      'Dispense a completed order',
    ],
    redirect: '/provider/dashboard',
  },
  {
    key: 'admin',
    email: 'admin.demo@eyeq.local',
    role: 'ADMIN',
    firstName: 'Sarah',
    lastName: 'Williams',
    title: 'Practice Administrator',
    description: 'Team setup, roles, workflows, integrations, and audit review.',
    workflows: [
      'Review role permissions',
      'Check integration status',
      'Open the data migration center',
      'Review audit activity',
    ],
    redirect: '/provider/dashboard',
  },
  {
    key: 'patient',
    email: 'patient.demo@eyeq.local',
    role: 'PATIENT',
    firstName: 'Michael',
    lastName: 'Thompson',
    title: 'Patient',
    description: 'Appointments, forms, messages, prescriptions, and billing.',
    workflows: [
      'View the next appointment',
      'Read the approved visit summary',
      'View the approved prescription',
      'Pay a demo balance',
    ],
    redirect: '/patient/home',
  },
];

/** Legacy owner login used by older demo links. */
export const DEMO_LEGACY_OWNER_EMAIL = 'demo@eyeqai.app';

export function getDemoAccount(key: DemoRoleKey): DemoRoleAccount {
  const account = DEMO_ROLE_ACCOUNTS.find((a) => a.key === key);
  if (!account) throw new Error(`Unknown demo role: ${key}`);
  return account;
}

export function isDemoStaffRole(role: Role): boolean {
  return role !== 'PATIENT';
}
