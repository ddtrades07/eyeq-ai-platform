import Link from 'next/link';
import {
  Activity,
  Camera,
  ClipboardList,
  MessageSquare,
  Mic,
  Receipt,
  Sparkles,
  Stethoscope,
  Workflow,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { db } from '@/lib/db';
import { cn } from '@/lib/utils';

type PitchStop = {
  title: string;
  description: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
};

/**
 * Guided tour card for optometry pitches — surfaces the richest demo stories
 * without implying automated clinical diagnosis.
 */
export async function DemoPitchTour({ organizationId }: { organizationId: string }) {
  const [michael, james, emily, imagingCase, scribeSession, encounter] =
    await Promise.all([
      db.patient.findFirst({
        where: { organizationId, firstName: 'Michael', lastName: 'Thompson' },
        select: { id: true },
      }),
      db.patient.findFirst({
        where: { organizationId, firstName: 'James', lastName: 'Wilson' },
        select: { id: true },
      }),
      db.patient.findFirst({
        where: { organizationId, firstName: 'Emily', lastName: 'Chen' },
        select: { id: true },
      }),
      db.imagingCase.findFirst({
        where: {
          organizationId,
          aiUrgency: 'review-soon',
          status: { in: ['AI_REVIEWED', 'AWAITING_AI'] },
        },
        orderBy: { capturedAt: 'desc' },
        select: { id: true },
      }),
      db.ambientScribeSession.findFirst({
        where: { organizationId, reviewStatus: 'READY_FOR_REVIEW' },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      }),
      db.encounter.findFirst({
        where: { organizationId, status: { in: ['CHECKED_IN', 'IN_PRETEST', 'WITH_PROVIDER'] } },
        orderBy: { updatedAt: 'desc' },
        select: { id: true },
      }),
    ]);

  const stops: PitchStop[] = [
    {
      title: "Today's schedule",
      description: 'Seven visits on the board — glaucoma, diabetic, dry eye, pediatric, and more.',
      href: '/provider/appointments',
      icon: Activity,
    },
    ...(michael
      ? [
          {
            title: 'Michael Thompson · glaucoma timeline',
            description: 'OCT progression series with flagged signals for provider review.',
            href: `/provider/patients/${michael.id}`,
            icon: Stethoscope,
            badge: 'Featured',
          } satisfies PitchStop,
        ]
      : []),
    ...(imagingCase
      ? [
          {
            title: 'Imaging review queue',
            description: 'Sample studies with descriptive AI flags — always provider-verified.',
            href: `/provider/imaging/${imagingCase.id}`,
            icon: Camera,
            badge: 'Sample signals',
          } satisfies PitchStop,
        ]
      : [
          {
            title: 'Imaging workspace',
            description: 'Organize studies and review flagged areas with your team.',
            href: '/provider/imaging',
            icon: Camera,
          } satisfies PitchStop,
        ]),
    ...(james
      ? [
          {
            title: 'James Wilson · diabetic exam in progress',
            description: encounter
              ? 'Checked-in visit with a live exam chart and pretest workflow.'
              : 'Checked-in diabetic visit on today\'s schedule — open from appointments.',
            href: encounter
              ? `/provider/encounters/${encounter.id}/exam`
              : '/provider/appointments',
            icon: ClipboardList,
            badge: 'In clinic',
          } satisfies PitchStop,
        ]
      : []),
    ...(scribeSession
      ? [
          {
            title: 'Ambient scribe draft',
            description: 'Transcript + SOAP draft waiting for provider approval.',
            href: `/provider/ambient-scribe/${scribeSession.id}`,
            icon: Mic,
            badge: 'Review',
          } satisfies PitchStop,
        ]
      : [
          {
            title: 'Ambient scribe',
            description: 'Capture visits with transcription and provider-reviewed drafts.',
            href: '/provider/ambient-scribe',
            icon: Mic,
          } satisfies PitchStop,
        ]),
    ...(emily
      ? [
          {
            title: 'Emily Chen · dry eye story',
            description: 'Four visits, recurring chief complaint, and an unread portal message.',
            href: `/provider/patients/${emily.id}`,
            icon: MessageSquare,
            badge: 'Care continuity',
          } satisfies PitchStop,
        ]
      : []),
    {
      title: 'Recalls & reminders',
      description: 'Templates, campaigns, and delivery logs for patient outreach.',
      href: '/provider/reminders',
      icon: MessageSquare,
    },
    {
      title: 'Billing & inventory',
      description: 'Open statements, claims workflow, and optical stock levels.',
      href: '/provider/billing',
      icon: Receipt,
    },
    {
      title: 'EHR connections',
      description: 'Sandbox RevolutionEHR link — ask us which vendors you need next.',
      href: '/provider/ehr-integrations',
      icon: Workflow,
    },
  ];

  return (
    <Card className="border-amber-200/80 bg-gradient-to-br from-amber-50/90 to-white">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-700" />
          <CardTitle className="text-base">Pitch tour · showcase workflows</CardTitle>
          <Badge variant="outline" className="border-amber-300 text-amber-900">
            Demo data
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          Walk optometrists through real screens with sample patients. AI outputs are illustrative —
          clinical decisions stay with the provider. Reset anytime from the banner above.
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {stops.map((stop) => (
            <Link
              key={stop.href + stop.title}
              href={stop.href}
              className={cn(
                'group flex gap-3 rounded-lg border border-amber-100 bg-white/80 p-3 text-sm transition-colors hover:border-amber-300 hover:bg-white',
              )}
            >
              <stop.icon className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-foreground group-hover:text-primary">
                    {stop.title}
                  </span>
                  {stop.badge ? (
                    <Badge variant="secondary" className="text-[10px]">
                      {stop.badge}
                    </Badge>
                  ) : null}
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">{stop.description}</p>
              </div>
            </Link>
          ))}
        </div>
        <p className="mt-4 text-xs text-muted-foreground">
          Have ideas for your practice?{' '}
          <Link href="/contact" className={buttonVariants({ variant: 'link', size: 'sm' }) + ' h-auto p-0'}>
            Tell us what you&apos;d change
          </Link>
          . Demo mode is built for feedback.
        </p>
      </CardContent>
    </Card>
  );
}
