import type { DemoRoleKey } from '@/lib/demo/accounts';

export type DemoStepStatus = 'ready' | 'demo-only' | 'not-configured' | 'blocked';

export type DemoGuideStep = {
  id: string;
  step: number;
  role: DemoRoleKey | 'patient' | 'all';
  roleLabel: string;
  title: string;
  page: string;
  /** Path or template with `{michaelPatientId}` / `{imagingId}` / `{encounterId}` placeholders */
  href: string;
  /** What the presenter should click */
  action: string;
  /** What the presenter should say */
  talkingPoint: string;
  /** Expected result after the click */
  expectedResult: string;
  status: DemoStepStatus;
  /** Estimated minutes for this step */
  minutes: number;
  /** Legacy field used by floating panel */
  demonstrates?: string;
};

/** Primary Live Demo walkthrough (15 steps). Matches docs/EYEQ_OPTOMETRIST_DEMO_GUIDE.md */
export const DEMO_WALKTHROUGH_STEPS: DemoGuideStep[] = [
  {
    id: 'dashboard',
    step: 1,
    role: 'all',
    roleLabel: 'All staff',
    title: 'Dashboard overview',
    page: 'Dashboard',
    href: '/provider/dashboard',
    action: 'Open the command center and scan today\'s cards, including Reputation.',
    talkingPoint:
      'EyeQ gives the practice a real-time view of today\'s patient flow, provider work, messages, imaging, AI drafts, and reputation tasks.',
    expectedResult: 'Populated dashboard with today\'s flow, unsigned work, review queues, and Reputation card.',
    status: 'ready',
    minutes: 1,
  },
  {
    id: 'schedule-flow',
    step: 2,
    role: 'frontdesk',
    roleLabel: 'Staff',
    title: 'Schedule and patient flow',
    page: 'Schedule',
    href: '/provider/appointments',
    action: 'Open Schedule, then Patient flow. Find today\'s check-ins and walk-in.',
    talkingPoint:
      'Staff can schedule patients, check them in, track status, and move patients through the visit.',
    expectedResult: 'Today\'s board shows scheduled, checked-in, ready-for-provider, and completed visits.',
    status: 'ready',
    minutes: 1,
  },
  {
    id: 'patient-chart',
    step: 3,
    role: 'optometrist',
    roleLabel: 'Provider',
    title: 'Patient chart',
    page: 'Patient chart',
    href: '/provider/patients/{michaelPatientId}',
    action: 'Open Michael Thompson\'s chart from Patients or the walkthrough link.',
    talkingPoint:
      'The chart gives a clean overview of demographics, visits, Rx, imaging, care gaps, messages, and timeline.',
    expectedResult: 'Synthetic patient chart with quick actions and today\'s appointment context.',
    status: 'ready',
    minutes: 1,
  },
  {
    id: 'encounter-soap',
    step: 4,
    role: 'optometrist',
    roleLabel: 'Provider',
    title: 'Encounter and SOAP notes',
    page: 'Encounter / Notes',
    href: '/provider/patient-flow',
    action:
      'From Patient flow or the chart, open today\'s encounter. Show Notes with a draft and a signed SOAP. Do not auto-sign.',
    talkingPoint:
      'Providers document the visit from the appointment. Notes move from draft to review to provider sign-off. Nothing auto-signs.',
    expectedResult: 'Encounter workspace linked to the demo visit. Draft and signed notes visible.',
    status: 'ready',
    minutes: 2,
  },
  {
    id: 'rx',
    step: 5,
    role: 'optometrist',
    roleLabel: 'Provider',
    title: 'Rx workflow',
    page: 'Prescriptions',
    href: '/provider/patients/{michaelPatientId}',
    action: 'Open Prescriptions and Contact lenses tabs. Show glasses and contact lens prescriptions.',
    talkingPoint:
      'Glasses and contact lens prescriptions can be created, reviewed, signed, and displayed in the portal.',
    expectedResult: 'Glasses and CL Rx on the chart; portal shows approved Rx only.',
    status: 'ready',
    minutes: 1,
  },
  {
    id: 'imaging',
    step: 6,
    role: 'optometrist',
    roleLabel: 'Provider',
    title: 'Imaging review',
    page: 'Imaging',
    href: '/provider/imaging',
    action: 'Open Imaging, then Michael\'s OCT study. Show timeline compare and provider sign-off.',
    talkingPoint:
      'Imaging uploads, timeline comparison, and provider sign-off are built into the chart.',
    expectedResult: 'Study opens with review badges. Provider remains responsible for interpretation.',
    status: 'ready',
    minutes: 1,
  },
  {
    id: 'ai-image-analysis',
    step: 7,
    role: 'optometrist',
    roleLabel: 'Provider',
    title: 'AI Image Analysis',
    page: 'Imaging AI',
    href: '/provider/imaging/{imagingId}',
    action: 'Open the AI analysis panel on the OCT study. Point out draft / provider-review labels.',
    talkingPoint:
      'EyeQ AI can draft image-review support signals. It does not diagnose disease. The provider reviews and decides.',
    expectedResult: 'Clear draft / provider-review labels. No diagnosis language.',
    status: 'demo-only',
    minutes: 1,
  },
  {
    id: 'eye-health-library',
    step: 8,
    role: 'optometrist',
    roleLabel: 'Provider',
    title: 'Eye Health Library',
    page: 'Eye Health Library',
    href: '/provider/eye-health-library',
    action: 'Open Eye Health Library. Show practice-approved articles and a patient recommendation.',
    talkingPoint:
      'Practices can share reviewed eye-health education with patients without replacing clinical counseling.',
    expectedResult: 'Approved articles and at least one recommendation for a synthetic patient.',
    status: 'ready',
    minutes: 1,
  },
  {
    id: 'patient-portal',
    step: 9,
    role: 'patient',
    roleLabel: 'Patient',
    title: 'Patient portal',
    page: 'Patient portal',
    href: '/patient/home',
    action: 'Switch to Patient Portal Demo (or open Patient home). Show visits, Rx, and education.',
    talkingPoint:
      'Patients see approved visits, prescriptions, instructions, and education in a mobile-friendly portal.',
    expectedResult: 'Portal shows approved content only. Synthetic patient data.',
    status: 'ready',
    minutes: 1,
  },
  {
    id: 'secure-messages',
    step: 10,
    role: 'all',
    roleLabel: 'Staff + Patient',
    title: 'Secure messages',
    page: 'Messages',
    href: '/provider/messages',
    action: 'Open staff messages, then optionally switch to the patient view of the same thread.',
    talkingPoint:
      'Secure messaging keeps patient questions in one place for the care team.',
    expectedResult: 'Secure thread on staff side; portal shows the patient side of approved messages.',
    status: 'ready',
    minutes: 1,
  },
  {
    id: 'reputation',
    step: 11,
    role: 'owner',
    roleLabel: 'Owner',
    title: 'Google Reviews and Reputation Management',
    page: 'Reputation',
    href: '/provider/reputation',
    action:
      'Open Reputation from the sidebar (Google Reviews). Show a 5-star needing thank-you, a neutral 3-star, a negative escalation, a draft awaiting approval, and a DEMO_PUBLISHED reply. Open Google Questions.',
    talkingPoint:
      'EyeQ helps manage Google reviews and questions with AI or template drafts and approval before publishing. Demo never posts live to Google.',
    expectedResult:
      'Pending replies, one draft awaiting approval, one DEMO_PUBLISHED example, and unanswered questions. Status: Demo-ready, live Google connection required for real publishing.',
    status: 'demo-only',
    minutes: 2,
  },
  {
    id: 'optical-inventory',
    step: 12,
    role: 'optical',
    roleLabel: 'Staff / Optical',
    title: 'Optical and inventory',
    page: 'Optical / Inventory',
    href: '/provider/optical',
    action: 'Open Optical orders, then Inventory. Point out a low-stock item.',
    talkingPoint:
      'Practices can track optical orders, inventory, adjustments, and basic operational activity.',
    expectedResult: 'Order and inventory rows with realistic synthetic stock levels.',
    status: 'ready',
    minutes: 1,
  },
  {
    id: 'billing',
    step: 13,
    role: 'billing',
    roleLabel: 'Owner / Billing',
    title: 'Billing drafts',
    page: 'Billing',
    href: '/provider/billing',
    action: 'Open Billing. Show an invoice draft and claim draft workflow.',
    talkingPoint:
      'EyeQ supports invoices and claim draft workflows but does not yet replace full clearinghouse or RCM.',
    expectedResult: 'Draft invoices and claims. No fake live payer submission success.',
    status: 'demo-only',
    minutes: 1,
  },
  {
    id: 'phi-readiness',
    step: 14,
    role: 'owner',
    roleLabel: 'Owner',
    title: 'PHI readiness and vendor readiness',
    page: 'PHI readiness',
    href: '/provider/settings/phi-readiness',
    action: 'Open PHI readiness, then vendor / integrations settings.',
    talkingPoint:
      'EyeQ is fail-closed for live PHI until MFA, RLS, BAAs, vendors, backups, and readiness checks are complete.',
    expectedResult: 'Clear blocked / not ready states. Demo org cannot enable controlled pilot with live PHI.',
    status: 'ready',
    minutes: 1,
  },
  {
    id: 'audit-support',
    step: 15,
    role: 'owner',
    roleLabel: 'Owner',
    title: 'Audit logs and support',
    page: 'Audit / Support',
    href: '/provider/audit-logs',
    action: 'Open Audit logs, then Support tickets.',
    talkingPoint:
      'Sensitive actions are tracked and support or security issues can be managed internally.',
    expectedResult: 'Audit events visible. At least one open demo support ticket.',
    status: 'ready',
    minutes: 1,
  },
];

/** Floating panel steps (role-journey) kept for in-app coach marks */
export const DEMO_GUIDE_STEPS: DemoGuideStep[] = DEMO_WALKTHROUGH_STEPS.map((s) => ({
  ...s,
  demonstrates: s.talkingPoint,
}));

export type DemoPrimaryEntry = {
  key: DemoRoleKey;
  buttonLabel: string;
  title: string;
  description: string;
  estimatedMinutes: number;
};

export const DEMO_PRIMARY_ENTRIES: DemoPrimaryEntry[] = [
  {
    key: 'owner',
    buttonLabel: 'Start Owner Demo',
    title: 'Owner demo',
    description:
      'Business overview, Google Reviews, readiness, staff, support, and launch controls.',
    estimatedMinutes: 12,
  },
  {
    key: 'optometrist',
    buttonLabel: 'Start Provider Demo',
    title: 'Provider demo',
    description: 'Charting, imaging, AI drafts, Eye Health Library, prescriptions, and messages.',
    estimatedMinutes: 10,
  },
  {
    key: 'frontdesk',
    buttonLabel: 'Start Staff Demo',
    title: 'Staff demo',
    description: 'Scheduling, check-in, patient flow, reminders, and messages.',
    estimatedMinutes: 8,
  },
  {
    key: 'patient',
    buttonLabel: 'Start Patient Portal Demo',
    title: 'Patient portal demo',
    description: 'Portal home, visits, Rx, messages, forms, and education.',
    estimatedMinutes: 5,
  },
];

export const DEMO_FEATURE_CARDS = [
  { title: 'Schedule and patient flow', detail: 'Check-in through complete' },
  { title: 'Patient chart and SOAP', detail: 'Draft to signed notes' },
  { title: 'Imaging + AI review support', detail: 'Provider review required' },
  { title: 'Eye Health Library', detail: 'Practice-approved education' },
  { title: 'Google Reviews', detail: 'Draft replies · DEMO_PUBLISHED only' },
  { title: 'Patient portal', detail: 'Visits, Rx, messages' },
  { title: 'Optical and inventory', detail: 'Orders and low-stock alerts' },
  { title: 'Billing drafts', detail: 'Not a full RCM replacement' },
] as const;

export function resolveGuideHref(
  href: string,
  ctx: {
    michaelPatientId?: string | null;
    imagingId?: string | null;
    encounterId?: string | null;
  },
): string {
  let out = href;
  if (out.includes('{michaelPatientId}')) {
    out = ctx.michaelPatientId
      ? out.replaceAll('{michaelPatientId}', ctx.michaelPatientId)
      : '/provider/patients';
  }
  if (out.includes('{imagingId}')) {
    out = ctx.imagingId
      ? out.replaceAll('{imagingId}', ctx.imagingId)
      : '/provider/imaging';
  }
  if (out.includes('{encounterId}')) {
    out = ctx.encounterId
      ? out.replaceAll('{encounterId}', ctx.encounterId)
      : '/provider/patient-flow';
  }
  return out;
}

/** Back-compat helper used by older callers that only pass Michael's id */
export function resolveGuideHrefLegacy(
  href: string,
  michaelPatientId: string | null,
): string {
  return resolveGuideHref(href, { michaelPatientId });
}
