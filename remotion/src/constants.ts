/** EyeQ full-product demo — timed for voiceover + imagery */
export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;

export type SceneDef = {
  id: string;
  fromSec: number;
  toSec: number;
  title: string;
  subtitle?: string;
  /** On-screen caption */
  caption: string;
  /** Spoken narration (read by AI voiceover) */
  voiceover: string;
  /** Screenshot key under assets/screenshots */
  shot?: string;
};

/**
 * Full product tour (~2 minutes). Honest claims only.
 * Highlights the real EyeQ surface: clinical ops, AI assist, portal,
 * optical/billing foundations, reputation, and fail-closed PHI readiness.
 */
export const SCENES: SceneDef[] = [
  {
    id: 'hero',
    fromSec: 0,
    toSec: 8,
    title: 'EyeQ',
    subtitle: 'A modern optometry operating system for private practices.',
    caption: 'One connected platform for clinical care, operations, and patient communication.',
    voiceover:
      'Welcome to EyeQ, a modern optometry operating system for private practices. One connected platform for clinical care, operations, and patient communication.',
    shot: 'hero',
  },
  {
    id: 'platform',
    fromSec: 8,
    toSec: 18,
    title: 'Practice operations in one place',
    caption: 'Dashboard, scheduling, check-in, and staff tasks keep the front office moving.',
    voiceover:
      'Start with practice operations. The dashboard, scheduling board, check-in flow, and staff tasks keep the front office moving from the first arrival of the day.',
    shot: 'dashboard',
  },
  {
    id: 'clinical',
    fromSec: 18,
    toSec: 30,
    title: 'Patient chart and clinical workflow',
    caption: 'History, encounters, SOAP drafts, and provider sign-off in one chart.',
    voiceover:
      'Inside the patient chart, providers review history, run encounters, draft SOAP notes, and sign when ready. Nothing auto-signs. Clinical judgment stays with the provider.',
    shot: 'patient-chart',
  },
  {
    id: 'imaging',
    fromSec: 30,
    toSec: 40,
    title: 'Imaging connected to the chart',
    caption: 'Upload, compare, and provider review stay tied to the patient record.',
    voiceover:
      'Imaging stays connected to the chart. Upload studies, compare views, and complete provider review without leaving the patient record.',
    shot: 'imaging-review',
  },
  {
    id: 'rx-optical',
    fromSec: 40,
    toSec: 50,
    title: 'Prescriptions and optical orders',
    caption: 'Glasses and contact lens Rx with draft, sign-off, and optical order workflow.',
    voiceover:
      'EyeQ supports glasses and contact lens prescriptions with draft and provider sign-off, plus optical order workflows for the dispensary.',
    shot: 'rx-optical',
  },
  {
    id: 'ai',
    fromSec: 50,
    toSec: 62,
    title: 'AI that supports the provider',
    caption: 'Ask EyeQ, pre-charting, SOAP drafts, and message drafts. Always review before clinical use.',
    voiceover:
      'Ask EyeQ, pre-charting help, SOAP drafts, and patient message drafts support the team. Every AI output is a draft and requires provider review before clinical use. EyeQ does not diagnose disease.',
    shot: 'ai-copilot',
  },
  {
    id: 'portal',
    fromSec: 62,
    toSec: 74,
    title: 'Patient portal and reminders',
    caption: 'Visits, Rx, secure messages, and consent-aware reminder previews.',
    voiceover:
      'Patients use the portal for visits, prescriptions, and secure messages. Reminder previews respect communication consent, and SMS or email only send when vendors and BAAs are ready.',
    shot: 'patient-portal',
  },
  {
    id: 'business',
    fromSec: 74,
    toSec: 86,
    title: 'Billing, care gaps, and reputation',
    caption: 'Invoice drafts, care-gap queues, and Google review replies with approve-before-publish.',
    voiceover:
      'On the business side, EyeQ includes invoice drafts, care gap queues, and Google review management. AI can draft a reply, but nothing auto-posts, and demo mode never invents a live publish.',
    shot: 'business',
  },
  {
    id: 'safety',
    fromSec: 86,
    toSec: 100,
    title: 'Built for safe pilots',
    caption: 'MFA, RLS, vendor BAAs, backups, monitoring, audit logs, and fail-closed live PHI.',
    voiceover:
      'EyeQ is built for safe pilots. MFA, row level security verification, vendor BAA status, backup attestation, monitoring, and audit logs gate live PHI. Until those checks pass, production PHI stays fail-closed.',
    shot: 'phi-readiness',
  },
  {
    id: 'cta',
    fromSec: 100,
    toSec: 110,
    title: 'EyeQ',
    subtitle: 'Pilot-ready for modern optometry practices.',
    caption: 'Schedule a demo and see the full workflow with sample practice data.',
    voiceover:
      'EyeQ. Pilot-ready for modern optometry practices. Schedule a demo and see the full workflow with sample practice data.',
    shot: 'cta',
  },
];

export const TOTAL_SECONDS = SCENES[SCENES.length - 1].toSec;
export const TOTAL_FRAMES = TOTAL_SECONDS * FPS;

export function sceneFrames(scene: SceneDef) {
  return {
    from: Math.round(scene.fromSec * FPS),
    duration: Math.round((scene.toSec - scene.fromSec) * FPS),
  };
}
