import Link from 'next/link';
import {
  Building2,
  CalendarDays,
  CheckCircle2,
  Circle,
  MapPin,
  ShieldCheck,
  Star,
  Upload,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import {
  GlassCard,
  GlassCardContent,
  GlassCardHeader,
  GlassCardTitle,
} from '@/components/ui/glass-card';
import { PageHeader } from '@/components/ui/page-header';
import { requirePermission } from '@/lib/auth/require';
import { db } from '@/lib/db';
import { buildReadinessSnapshot, evaluateOnboardingReadiness } from '@/lib/onboarding/readiness';
import { evaluatePilotLaunch } from '@/lib/production/pilot-launch';
import { evaluatePhiReadiness } from '@/lib/production/phi-readiness';
import { DEMO_ORG_SLUG } from '@/lib/demo/constants';

export const metadata = { title: 'Practice onboarding' };

type Step = {
  id: string;
  title: string;
  detail: string;
  href: string;
  done: boolean;
  blocker?: boolean;
};

export default async function PracticeOnboardingPage() {
  const user = await requirePermission('org:manage');
  if (!user.organizationId) return null;

  const [
    org,
    locations,
    providerCount,
    patientCount,
    providerWithNpiCount,
    staffCount,
    owners,
    googleConn,
    reminderTemplates,
    sub,
  ] = await Promise.all([
    db.organization.findUniqueOrThrow({ where: { id: user.organizationId } }),
    db.location.findMany({
      where: { organizationId: user.organizationId },
      orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }],
    }),
    db.provider.count({ where: { organizationId: user.organizationId } }),
    db.patient.count({
      where: { organizationId: user.organizationId, archivedAt: null },
    }),
    db.provider.count({
      where: { organizationId: user.organizationId, npi: { not: null } },
    }),
    db.user.count({
      where: { organizationId: user.organizationId, isActive: true, role: { not: 'PATIENT' } },
    }),
    db.user.count({
      where: { organizationId: user.organizationId, role: 'OWNER', isActive: true },
    }),
    db.googleBusinessConnection.count({ where: { organizationId: user.organizationId } }),
    db.reminderTemplate.count({ where: { organizationId: user.organizationId } }),
    db.orgSubscription.findUnique({ where: { organizationId: user.organizationId } }),
  ]);

  const snapshot = buildReadinessSnapshot({
    locationCount: locations.length,
    providerCount,
    providerWithNpiCount,
    staffCount,
    patientCount,
    hasPrimaryLocation: locations.some((l) => l.isPrimary),
  });
  const readiness = evaluateOnboardingReadiness(snapshot);
  const [pilot, phi] = await Promise.all([
    evaluatePilotLaunch(user.organizationId),
    evaluatePhiReadiness(user.organizationId),
  ]);

  const isDemo = org.slug === DEMO_ORG_SLUG;

  const steps: Step[] = [
    {
      id: 'practice',
      title: 'Create / confirm practice',
      detail: org.name,
      href: '/provider/practice-setup',
      done: Boolean(org.name),
    },
    {
      id: 'locations',
      title: 'Add locations',
      detail: `${locations.length} location${locations.length === 1 ? '' : 's'}`,
      href: '/provider/practice-setup',
      done: locations.length > 0,
      blocker: true,
    },
    {
      id: 'owner',
      title: 'Invite owner',
      detail: owners > 0 ? 'Owner present' : 'No owner user yet',
      href: '/provider/team',
      done: owners > 0,
      blocker: true,
    },
    {
      id: 'staff',
      title: 'Add staff',
      detail: `${staffCount} staff account${staffCount === 1 ? '' : 's'}`,
      href: '/provider/team',
      done: staffCount > 1,
    },
    {
      id: 'providers',
      title: 'Add providers',
      detail: `${providerCount} provider${providerCount === 1 ? '' : 's'}`,
      href: '/provider/team',
      done: providerCount > 0,
      blocker: true,
    },
    {
      id: 'roles',
      title: 'Assign roles & location access',
      detail: 'Confirm roles and location scopes in Team / staff onboarding',
      href: '/provider/settings/staff-onboarding',
      done: staffCount > 0,
    },
    {
      id: 'schedules',
      title: 'Configure schedules',
      detail: 'Open schedule and create provider availability',
      href: '/provider/appointments',
      done: false,
    },
    {
      id: 'portal',
      title: 'Configure patient portal',
      detail: 'Portal routes are live; confirm branding and preferences',
      href: '/provider/practice-setup',
      done: Boolean(org.primaryColor) || patientCount > 0,
    },
    {
      id: 'reminders',
      title: 'Configure reminders',
      detail:
        reminderTemplates > 0
          ? `${reminderTemplates} template${reminderTemplates === 1 ? '' : 's'}`
          : 'No reminder templates yet',
      href: '/provider/reminders',
      done: reminderTemplates > 0,
    },
    {
      id: 'reviews',
      title: 'Configure Google reviews',
      detail: googleConn > 0 ? 'Connection present' : 'Not connected',
      href: '/provider/reputation',
      done: googleConn > 0,
    },
    {
      id: 'import',
      title: 'Import patients',
      detail: `${patientCount} patient${patientCount === 1 ? '' : 's'}`,
      href: '/provider/migration',
      done: patientCount > 0,
    },
    {
      id: 'checklist',
      title: 'Review launch checklist',
      detail: `${phi.canEnableLivePhi ? 'PHI ready' : 'PHI blockers remain'} · ${pilot.status.replace(/_/g, ' ')}`,
      href: '/provider/settings/pilot-launch',
      done: phi.canEnableLivePhi || pilot.status === 'controlled_pilot_ready',
      blocker: true,
    },
    {
      id: 'pilot',
      title: 'Approve pilot mode',
      detail: isDemo
        ? 'Demo org cannot enable controlled pilot'
        : org.controlledPilotEnabled
          ? 'Controlled pilot enabled'
          : 'Pilot not enabled',
      href: '/provider/settings/pilot-launch',
      done: org.controlledPilotEnabled,
      blocker: !isDemo,
    },
  ];

  // schedules step: mark done if any future appointment exists
  const upcoming = await db.appointment.count({
    where: {
      organizationId: user.organizationId,
      startsAt: { gte: new Date() },
    },
  });
  const scheduleStep = steps.find((s) => s.id === 'schedules');
  if (scheduleStep) scheduleStep.done = upcoming > 0;

  const doneCount = steps.filter((s) => s.done).length;
  const pct = Math.round((doneCount / steps.length) * 100);
  const blockers = steps.filter((s) => s.blocker && !s.done);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Practice onboarding"
        description="Guided launch path for a new EyeQ office. Live PHI stays fail-closed until readiness checks pass."
        actions={
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{pct}% complete</Badge>
            <Badge variant={blockers.length ? 'warning' : 'success'}>
              {blockers.length ? `${blockers.length} blocker${blockers.length === 1 ? '' : 's'}` : 'No blockers'}
            </Badge>
          </div>
        }
      />

      <GlassCard>
        <GlassCardHeader>
          <GlassCardTitle>Progress</GlassCardTitle>
        </GlassCardHeader>
        <GlassCardContent>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span>
              {doneCount} of {steps.length} steps
            </span>
            <span className="tabular-nums text-muted-foreground">{pct}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
          </div>
          {!sub ? (
            <p className="mt-3 text-xs text-muted-foreground">
              SaaS plan record not created yet —{' '}
              <Link href="/provider/settings/subscription" className="underline">
                view plan & usage
              </Link>
              .
            </p>
          ) : null}
        </GlassCardContent>
      </GlassCard>

      <div className="grid gap-3">
        {steps.map((step, idx) => (
          <Link
            key={step.id}
            href={step.href}
            className="group rounded-xl border border-border/60 bg-white/60 p-4 transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                {step.done ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-muted-foreground">
                    Step {idx + 1}
                  </span>
                  {step.blocker && !step.done ? (
                    <Badge variant="warning" className="text-[10px]">
                      Blocker
                    </Badge>
                  ) : null}
                </div>
                <div className="text-sm font-semibold tracking-tight">{step.title}</div>
                <p className="text-xs text-muted-foreground">{step.detail}</p>
              </div>
              <StepIcon id={step.id} />
            </div>
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/provider/settings/pilot-launch"
          className={buttonVariants({ size: 'sm' })}
        >
          Open pilot launch
        </Link>
        <Link
          href="/provider/settings/staff-onboarding"
          className={buttonVariants({ size: 'sm', variant: 'outline' })}
        >
          Staff onboarding
        </Link>
        <Link
          href="/provider/settings/phi-readiness"
          className={buttonVariants({ size: 'sm', variant: 'outline' })}
        >
          PHI readiness
        </Link>
      </div>

      <p className="text-xs text-muted-foreground">
        Readiness snapshot: {readiness.completedCount}/{readiness.items.length} setup items ·{' '}
        {readiness.blockingCount} blocking.
      </p>
    </div>
  );
}

function StepIcon({ id }: { id: string }) {
  const cls = 'h-4 w-4 text-muted-foreground opacity-70 group-hover:opacity-100';
  switch (id) {
    case 'locations':
      return <MapPin className={cls} />;
    case 'staff':
    case 'owner':
    case 'providers':
    case 'roles':
      return <Users className={cls} />;
    case 'schedules':
      return <CalendarDays className={cls} />;
    case 'reviews':
      return <Star className={cls} />;
    case 'import':
      return <Upload className={cls} />;
    case 'checklist':
    case 'pilot':
      return <ShieldCheck className={cls} />;
    default:
      return <Building2 className={cls} />;
  }
}
