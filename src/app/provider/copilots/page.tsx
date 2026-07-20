import Link from 'next/link';
import {
  BookOpenCheck,
  Bell,
  ClipboardList,
  ImageIcon,
  MessageSquareMore,
  Mic,
  Sparkles,
  Stethoscope,
  Wand2,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { SafetyDisclaimer } from '@/components/safety/safety-disclaimer';
import { CopilotContextSetter } from '@/components/copilot/copilot-context-setter';
import { AskEyeQLauncher } from '@/components/copilot/ask-eyeq-launcher';
import { requirePermission } from '@/lib/auth/require';
import { hasPermission } from '@/lib/auth/rbac';
import { serverEnv } from '@/lib/env';
import type { LucideIcon } from 'lucide-react';
import type { Permission } from '@/lib/auth/rbac';

export const metadata = { title: 'AI Copilots' };

type Copilot = {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  permissions: Permission[];
  launchHref?: string;
  launchLabel?: string;
  benefits: string[];
  guardrails: string[];
  modelHint: string;
  status: 'live' | 'beta' | 'roadmap';
};

const COPILOTS: Copilot[] = [
  {
    id: 'imaging-review',
    name: 'Imaging review support',
    description:
      'Generates plain-language signals for fundus / OCT / VF studies and surfaces them next to the provider sign-off panel. Never auto-diagnoses.',
    icon: ImageIcon,
    permissions: ['imaging:review'],
    launchHref: '/provider/imaging',
    launchLabel: 'Open imaging queue',
    benefits: [
      'Flags candidate findings (e.g. cup-to-disc, NFL changes) for clinician confirmation.',
      'Standardizes language across providers and across visits.',
      'Persists AI rationale for audit + recall planning.',
    ],
    guardrails: [
      'Review-support only, no diagnosis.',
      'All outputs require a clinician to sign before reaching the patient.',
      'Outputs are stored with the model + timestamp for traceability.',
    ],
    modelHint: 'Vision encoder + LLM. Multimodal placeholder in this build.',
    status: 'beta',
  },
  {
    id: 'ambient-scribe',
    name: 'Ambient scribe',
    description:
      'Captures the exam-room conversation and drafts a SOAP note, patient instructions, referral letter and coding suggestions for the provider to review.',
    icon: Mic,
    permissions: ['scribe:use'],
    launchHref: '/provider/ambient-scribe',
    launchLabel: 'Open scribe',
    benefits: [
      'Reduces after-hours documentation.',
      'Pulls templated language from the disease-template library.',
      'Multi-speaker labeling (provider, patient, technician).',
    ],
    guardrails: [
      'Patient consent must be captured before recording.',
      'Audio is local until the provider explicitly saves a transcript.',
      'Draft notes flagged as unsigned until a provider signs.',
    ],
    modelHint: 'On-device VAD → speech-to-text → LLM summarization.',
    status: 'beta',
  },
  {
    id: 'reminder-copy',
    name: 'Reminder copywriter',
    description:
      'Drafts SMS, email and portal reminders in the patient&apos;s preferred language using your tone-of-voice presets.',
    icon: Bell,
    permissions: ['reminders:manage'],
    launchHref: '/provider/reminders',
    launchLabel: 'Open reminders',
    benefits: [
      'Avoids generic, robotic-feeling messages.',
      'Multilingual drafts ready for staff approval.',
      'Pulls visit context (recall reason, last seen) into the template.',
    ],
    guardrails: [
      'No PHI in SMS / email bodies by default.',
      'Staff approval required before any campaign sends.',
      'Patient opt-out honored across all channels.',
    ],
    modelHint: 'Text-only LLM with practice-tone fine-tune slot.',
    status: 'beta',
  },
  {
    id: 'documentation-coach',
    name: 'Documentation coach',
    description:
      'Suggests assessment + plan language from the disease template library while the provider writes the note.',
    icon: BookOpenCheck,
    permissions: ['notes:write'],
    launchHref: '/provider/disease-templates',
    launchLabel: 'Browse templates',
    benefits: [
      'Faster, more complete documentation.',
      'Surface ICD-10 / CPT coding suggestions.',
      'Helps trainees follow practice-preferred phrasing.',
    ],
    guardrails: [
      'Always proposes, never auto-fills a signed note.',
      'Provider attests they reviewed the suggested code.',
      'Audit trail captures accepted vs rejected suggestions.',
    ],
    modelHint: 'RAG over your disease templates + medical coding registry.',
    status: 'roadmap',
  },
  {
    id: 'care-gap-router',
    name: 'Care gap autopilot',
    description:
      'Watches the schedule + patient lists for missed recalls, expired Rx, lapsed diabetic exams, and prepares outreach drafts.',
    icon: ClipboardList,
    permissions: ['caregaps:manage'],
    launchHref: '/provider/care-gaps',
    launchLabel: 'Open care gaps',
    benefits: [
      'Surfaces care gaps before they age out.',
      'Pairs each gap with the right reminder template.',
      'Front desk works a single triaged list.',
    ],
    guardrails: [
      'Staff sees the AI-suggested batch before it sends.',
      'Templates are practice-controlled.',
      'No PHI leaves the chart.',
    ],
    modelHint: 'Rule engine + LLM for outreach drafts.',
    status: 'beta',
  },
  {
    id: 'pretest-prompter',
    name: 'Pretest prompter',
    description:
      'Reads the appointment type and surfaces the right pretest checklist + visit-specific intake questions for the technician.',
    icon: Stethoscope,
    permissions: ['notes:write'],
    launchHref: '/provider/pre-charting',
    launchLabel: 'Open pretest queue',
    benefits: [
      'Cuts hand-off questions to the OD.',
      'Standardizes intake across techs.',
      'Pulls history relevant to the chief complaint.',
    ],
    guardrails: [
      'Tech still authors the entry, copilot only prompts.',
      'OD reviews the pretest note in chart.',
    ],
    modelHint: 'Local rules + LLM intake assist.',
    status: 'roadmap',
  },
  {
    id: 'practice-setup',
    name: 'Practice setup assistant',
    description:
      'Helps a new practice configure locations, branding, EHR mode and starter reminder templates in under five minutes.',
    icon: Wand2,
    permissions: ['org:manage'],
    launchHref: '/provider/practice-setup',
    launchLabel: 'Open practice setup',
    benefits: [
      'Zero-to-running practice in a single sitting.',
      'Imports a starter set of reminders, templates and care pathways.',
      'Asks the right questions for native vs connected EHR.',
    ],
    guardrails: [
      'Owner reviews every default before saving.',
      'No external data calls during setup.',
    ],
    modelHint: 'Interview-style LLM with deterministic seed packs.',
    status: 'roadmap',
  },
];

export default async function CopilotsPage() {
  const user = await requirePermission('ai:use');
  const aiProvider = serverEnv.aiProvider ?? 'mock';

  const visible = COPILOTS.filter((c) =>
    c.permissions.every((p) => hasPermission(user.role, p)),
  );

  return (
    <div className="space-y-6">
      <CopilotContextSetter page="other" />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">AI copilots</h2>
          <p className="text-sm text-muted-foreground">
            EyeQ AI&apos;s copilots assist your team. Providers always make the
            call.
          </p>
        </div>
        <Badge variant={aiProvider === 'mock' ? 'secondary' : 'success'}>
          <Sparkles className="h-3 w-3" /> Provider: {aiProvider}
        </Badge>
      </div>

      {/* Ask EyeQ hero card */}
      <Card className="border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50">
        <CardHeader>
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-lg">
              <MessageSquareMore className="h-6 w-6" />
            </span>
            <div>
              <CardTitle className="text-lg">Ask EyeQ</CardTitle>
              <CardDescription>
                Context-aware AI assistant. Understands the current patient,
                imaging, care gaps, timeline intelligence, and your role.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <AskEyeQLauncher />
          <span className="text-xs text-muted-foreground">
            Available everywhere, dashboard, patient chart, imaging, scheduling, and more.
          </span>
        </CardContent>
      </Card>

      <SafetyDisclaimer />

      <div className="grid gap-4 lg:grid-cols-2">
        {visible.map((c) => {
          const Icon = c.icon;
          return (
            <Card key={c.id}>
              <CardHeader>
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="flex-1">
                    <CardTitle className="text-base">{c.name}</CardTitle>
                    <CardDescription>{c.description}</CardDescription>
                  </div>
                  <Badge
                    variant={
                      c.status === 'live'
                        ? 'success'
                        : c.status === 'beta'
                          ? 'info'
                          : 'secondary'
                    }
                  >
                    {c.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <Section title="What it does" items={c.benefits} />
                <Section title="Guardrails" items={c.guardrails} tone="warn" />
                <div className="text-xs text-muted-foreground">
                  <span className="font-semibold">Model:</span> {c.modelHint}
                </div>
                {c.launchHref ? (
                  <Link
                    href={c.launchHref}
                    className={buttonVariants({ size: 'sm', variant: 'outline' })}
                  >
                    {c.launchLabel ?? 'Open'} →
                  </Link>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Section({
  title,
  items,
  tone = 'default',
}: {
  title: string;
  items: string[];
  tone?: 'default' | 'warn';
}) {
  return (
    <div>
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </div>
      <ul className="space-y-1">
        {items.map((it, i) => (
          <li key={i} className="flex gap-2">
            <span
              className={
                'mt-1 inline-block h-1.5 w-1.5 shrink-0 rounded-full ' +
                (tone === 'warn' ? 'bg-amber-500' : 'bg-primary')
              }
            />
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
