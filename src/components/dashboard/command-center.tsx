import type { ReactNode } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  CalendarClock,
  ClipboardCheck,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Star,
  Stethoscope,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import {
  GlassCard,
  GlassCardContent,
  GlassCardHeader,
  GlassCardTitle,
  SectionHeader,
} from '@/components/ui/glass-card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { cn } from '@/lib/utils';
import type { CommandCenterData, FlowBucket, FocusItem } from '@/server/queries/command-center';

const toneClass: Record<FlowBucket['tone'], string> = {
  default: 'border-border/60 bg-white/70',
  info: 'border-sky-200/70 bg-sky-50/80',
  warning: 'border-amber-200/70 bg-amber-50/80',
  success: 'border-emerald-200/70 bg-emerald-50/80',
  danger: 'border-rose-200/70 bg-rose-50/80',
};

function FocusList({
  items,
  emptyTitle,
  emptyDescription,
  emptyHref,
  emptyAction,
  aiSafety,
}: {
  items: FocusItem[];
  emptyTitle: string;
  emptyDescription: string;
  emptyHref?: string;
  emptyAction?: string;
  aiSafety?: boolean;
}) {
  const visible = items.filter((i) => i.alwaysShow || (i.count ?? 0) > 0);
  if (!visible.length) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        className="py-8"
        action={
          emptyHref && emptyAction ? (
            <Link href={emptyHref} className={buttonVariants({ size: 'sm', variant: 'outline' })}>
              {emptyAction}
            </Link>
          ) : undefined
        }
      />
    );
  }
  return (
    <ul className="divide-y divide-border/50">
      {visible.map((item) => (
        <li key={item.id}>
          <Link
            href={item.href}
            className="flex items-center justify-between gap-3 px-1 py-3 transition-colors hover:bg-white/40"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-medium text-foreground">{item.label}</span>
                {aiSafety ? (
                  <Badge variant="outline" className="text-[10px]">
                    Draft · review required
                  </Badge>
                ) : null}
              </div>
              <p className="truncate text-xs text-muted-foreground">{item.detail}</p>
            </div>
            <div className="flex items-center gap-2">
              {typeof item.count === 'number' ? (
                <span className="text-sm font-semibold tabular-nums text-foreground">
                  {item.count}
                </span>
              ) : null}
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function CommandCenterDashboard({
  greeting,
  description,
  data,
  showPitchTour,
  pitchSlot,
}: {
  greeting: string;
  description: string;
  data: CommandCenterData;
  showPitchTour?: boolean;
  pitchSlot?: ReactNode;
}) {
  return (
    <div className="space-y-6">
      <PageHeader
        title={greeting}
        description={description}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/provider/patient-flow" className={buttonVariants({ size: 'sm' })}>
              Patient flow
            </Link>
            <Link
              href="/provider/appointments"
              className={buttonVariants({ size: 'sm', variant: 'outline' })}
            >
              Schedule
            </Link>
          </div>
        }
      />

      {showPitchTour && pitchSlot ? pitchSlot : null}

      {/* A. Today's Practice Flow */}
      <section>
        <SectionHeader
          title="Today's practice flow"
          description="Live patient movement across the office"
          action={
            <Link
              href="/provider/patient-flow"
              className="text-xs font-medium text-primary hover:underline"
            >
              Open board
            </Link>
          }
        />
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-7">
          {data.flow.map((bucket) => (
            <Link key={bucket.id} href={bucket.href} className="group">
              <div
                className={cn(
                  'rounded-xl border p-3 shadow-sm transition-all group-hover:-translate-y-0.5 group-hover:shadow-md',
                  toneClass[bucket.tone],
                )}
              >
                <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {bucket.label}
                </div>
                <div className="mt-1 text-2xl font-semibold tabular-nums tracking-tight">
                  {bucket.count}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Provider focus strip */}
      <section className="grid gap-3 lg:grid-cols-2">
        <GlassCard interactive={false}>
          <GlassCardHeader>
            <GlassCardTitle className="flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-primary" /> Next patient
            </GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent>
            {data.nextPatient ? (
              <Link href={`/provider/patients/${data.nextPatient.patientId}`} className="block">
                <div className="text-lg font-semibold tracking-tight">{data.nextPatient.name}</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {data.nextPatient.time} · {data.nextPatient.type}
                </p>
                <Badge variant="secondary" className="mt-2">
                  {data.nextPatient.status.replace(/_/g, ' ')}
                </Badge>
              </Link>
            ) : (
              <EmptyState
                title="No upcoming patients"
                description="The rest of today's schedule is clear or already in progress."
                className="py-6"
              />
            )}
          </GlassCardContent>
        </GlassCard>

        <GlassCard>
          <GlassCardHeader>
            <GlassCardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" /> Currently waiting
            </GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent>
            {data.waitingPatient ? (
              <Link href={`/provider/patients/${data.waitingPatient.patientId}`} className="block">
                <div className="text-lg font-semibold tracking-tight">{data.waitingPatient.name}</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Waiting ~{data.waitingPatient.waitingMinutes} min ·{' '}
                  {data.waitingPatient.status.replace(/_/g, ' ')}
                </p>
              </Link>
            ) : (
              <EmptyState
                title="No one waiting"
                description="Checked-in patients will appear here when ready."
                className="py-6"
              />
            )}
          </GlassCardContent>
        </GlassCard>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        {/* B. Provider Focus */}
        <GlassCard>
          <GlassCardHeader>
            <GlassCardTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4 text-primary" /> Provider focus
            </GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent>
            <FocusList
              items={data.providerFocus}
              emptyTitle="You're caught up"
              emptyDescription="No unsigned notes, imaging, or urgent gaps right now."
              emptyHref="/provider/patients"
              emptyAction="Open patients"
            />
          </GlassCardContent>
        </GlassCard>

        {/* C. AI Work Queue */}
        <GlassCard tone="ai">
          <GlassCardHeader>
            <GlassCardTitle className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-[hsl(var(--lens-violet))]" /> AI work queue
            </GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent className="space-y-2">
            <p className="text-xs text-muted-foreground">
              AI outputs are drafts only and require provider review before clinical use.
            </p>
            <FocusList
              items={data.aiQueue}
              emptyTitle="No AI drafts waiting"
              emptyDescription="Pre-chart, scribe, and imaging assists will appear here when ready."
              emptyHref="/provider/copilots"
              emptyAction="Open AI tools"
              aiSafety
            />
          </GlassCardContent>
        </GlassCard>

        {/* D. Patient Experience */}
        <GlassCard>
          <GlassCardHeader>
            <GlassCardTitle className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" /> Patient experience
            </GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent>
            <FocusList
              items={data.patientExperience}
              emptyTitle="Inbox is clear"
              emptyDescription="Messages, booking requests, and reminder drafts show up here."
              emptyHref="/provider/messages"
              emptyAction="Open messages"
            />
          </GlassCardContent>
        </GlassCard>

        {/* E. Practice Health */}
        <GlassCard>
          <GlassCardHeader>
            <GlassCardTitle className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-primary" /> Practice health
            </GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent>
            <FocusList
              items={data.practiceHealth}
              emptyTitle="No open practice items"
              emptyDescription="Visits, optical, invoices, and care gaps will list here."
              emptyHref="/provider/billing"
              emptyAction="Open billing"
            />
          </GlassCardContent>
        </GlassCard>

        {/* F. Reputation */}
        <GlassCard>
          <GlassCardHeader>
            <GlassCardTitle className="flex items-center gap-2">
              <Star className="h-4 w-4 text-primary" /> Reputation
            </GlassCardTitle>
          </GlassCardHeader>
          <GlassCardContent className="space-y-3">
            <FocusList
              items={data.reputation}
              emptyTitle="No reviews waiting"
              emptyDescription="Connect Google Business or sync reviews to manage replies here. Never auto-posts."
              emptyHref="/provider/reputation"
              emptyAction="Open Reputation Inbox"
            />
            <Link
              href="/provider/reputation"
              className={buttonVariants({ size: 'sm', variant: 'outline' })}
            >
              Open Reputation Inbox
            </Link>
          </GlassCardContent>
        </GlassCard>

        {/* G. Launch readiness (admin) */}
        {data.launch ? (
          <GlassCard>
            <GlassCardHeader>
              <GlassCardTitle className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" /> Launch readiness
              </GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{data.launch.statusLabel}</Badge>
                <Badge variant={data.launch.livePhiEnabled ? 'warning' : 'outline'}>
                  livePhi {data.launch.livePhiEnabled ? 'on' : 'off'}
                </Badge>
                <Badge variant={data.launch.controlledPilotEnabled ? 'success' : 'outline'}>
                  pilot {data.launch.controlledPilotEnabled ? 'on' : 'off'}
                </Badge>
              </div>
              <ul className="space-y-1.5">
                {data.launch.items.map((item) => (
                  <li key={item.id} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{item.label}</span>
                    <Badge variant={item.done ? 'success' : 'outline'}>
                      {item.done ? 'Done' : 'Pending'}
                    </Badge>
                  </li>
                ))}
              </ul>
              <Link
                href={data.launch.href}
                className={buttonVariants({ size: 'sm', variant: 'outline' })}
              >
                Open pilot launch
              </Link>
              <p className="flex items-start gap-1.5 text-[11px] text-muted-foreground">
                <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                Live PHI stays fail-closed until readiness checks and BAAs are complete.
              </p>
            </GlassCardContent>
          </GlassCard>
        ) : null}
      </div>
    </div>
  );
}
