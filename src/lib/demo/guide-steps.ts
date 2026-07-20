import type { DemoRoleKey } from '@/lib/demo/accounts';

export type DemoGuideStep = {
  id: string;
  step: number;
  role: DemoRoleKey | 'patient';
  roleLabel: string;
  title: string;
  page: string;
  /** Path or template with `{michaelPatientId}` placeholder */
  href: string;
  action: string;
  demonstrates: string;
};

export const DEMO_GUIDE_STEPS: DemoGuideStep[] = [
  {
    id: 'owner-overview',
    step: 1,
    role: 'owner',
    roleLabel: 'Practice Owner',
    title: 'Practice performance snapshot',
    page: 'Dashboard',
    href: '/provider/dashboard',
    action: 'Review revenue, volume, and location overview cards.',
    demonstrates: 'How an owner sees business health without opening clinical charts.',
  },
  {
    id: 'front-desk-checkin',
    step: 2,
    role: 'frontdesk',
    roleLabel: 'Front Desk',
    title: 'Check in Michael Thompson',
    page: 'Schedule / patient flow',
    href: '/provider/appointments',
    action: 'Find Michael Thompson on today\'s schedule and check him in.',
    demonstrates: 'Front desk patient flow for the featured glaucoma follow-up visit.',
  },
  {
    id: 'technician-pretest',
    step: 3,
    role: 'technician',
    roleLabel: 'Technician',
    title: 'Complete pretesting',
    page: 'Pretesting',
    href: '/provider/pre-charting',
    action: 'Open the pretest queue and enter visual acuity, IOP, and autorefractor values.',
    demonstrates: 'Technician prep work before the provider exam.',
  },
  {
    id: 'technician-imaging',
    step: 4,
    role: 'technician',
    roleLabel: 'Technician',
    title: 'Upload OCT imaging',
    page: 'Imaging',
    href: '/provider/imaging',
    action: 'Open Michael Thompson\'s OCT study or upload a demo scan.',
    demonstrates: 'Imaging capture and handoff to provider review.',
  },
  {
    id: 'optometrist-chart',
    step: 5,
    role: 'optometrist',
    roleLabel: 'Optometrist',
    title: 'Open Michael\'s chart',
    page: 'Patient chart',
    href: '/provider/patients/{michaelPatientId}',
    action: 'Review history, medications, and today\'s encounter.',
    demonstrates: 'Unified charting for a glaucoma suspect follow-up.',
  },
  {
    id: 'optometrist-imaging',
    step: 6,
    role: 'optometrist',
    roleLabel: 'Optometrist',
    title: 'Review OCT and compare priors',
    page: 'Imaging viewer',
    href: '/provider/imaging',
    action: 'Open the latest OCT RNFL OD study and use Compare With Prior Scan.',
    demonstrates: 'Side-by-side progression review with provider interpretation.',
  },
  {
    id: 'optometrist-sign',
    step: 7,
    role: 'optometrist',
    roleLabel: 'Optometrist',
    title: 'Document and sign the encounter',
    page: 'Encounters',
    href: '/provider/encounters',
    action: 'Complete assessment and plan, then sign the chart.',
    demonstrates: 'Provider sign-off and release readiness for billing and portal.',
  },
  {
    id: 'billing-claim',
    step: 8,
    role: 'billing',
    roleLabel: 'Billing',
    title: 'Review Michael\'s claim',
    page: 'Billing',
    href: '/provider/billing',
    action: 'Validate the draft claim and record a demo external submission.',
    demonstrates: 'Revenue cycle workflow with demo clearinghouse labeling.',
  },
  {
    id: 'billing-payment',
    step: 9,
    role: 'billing',
    roleLabel: 'Billing',
    title: 'Post a demo payment',
    page: 'Billing',
    href: '/provider/billing',
    action: 'Record a staff payment against an open patient balance.',
    demonstrates: 'Payment posting without contacting a real processor.',
  },
  {
    id: 'billing-statement',
    step: 10,
    role: 'billing',
    roleLabel: 'Billing',
    title: 'Generate a demo statement',
    page: 'Statements',
    href: '/provider/billing/statements',
    action: 'Generate statements from open balances.',
    demonstrates: 'Patient statement batching for collections follow-up.',
  },
  {
    id: 'patient-summary',
    step: 11,
    role: 'patient',
    roleLabel: 'Patient',
    title: 'View approved visit summary',
    page: 'Patient portal',
    href: '/patient/visits',
    action: 'Switch to the patient role and open the visit summary.',
    demonstrates: 'What patients see after the provider releases approved content.',
  },
  {
    id: 'patient-pay',
    step: 12,
    role: 'patient',
    roleLabel: 'Patient',
    title: 'Pay demo balance',
    page: 'Billing',
    href: '/patient/billing',
    action: 'Use Pay balance to record a demo portal payment.',
    demonstrates: 'Simple patient billing without charging a real card.',
  },
];

export function resolveGuideHref(
  href: string,
  michaelPatientId: string | null,
): string {
  if (href.includes('{michaelPatientId}')) {
    return michaelPatientId
      ? href.replace('{michaelPatientId}', michaelPatientId)
      : '/provider/patients';
  }
  return href;
}
