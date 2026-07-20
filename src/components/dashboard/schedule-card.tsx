import Link from 'next/link';
import { CalendarDays, ExternalLink } from 'lucide-react';
import {
  GlassCard,
  GlassCardContent,
  GlassCardHeader,
  GlassCardTitle,
} from '@/components/ui/glass-card';
import { EmptyState } from '@/components/ui/empty-state';
import { buttonVariants } from '@/components/ui/button';
import {
  StatusChip,
  appointmentStatusTone,
  formatAppointmentStatusLabel,
} from '@/components/ui/status-chip';
import type { AppointmentListItem } from '@/server/queries/appointments';
import { cn, formatFullName, formatTime } from '@/lib/utils';

export function ScheduleRow({ appt }: { appt: AppointmentListItem }) {
  const patientName = formatFullName(appt.patient.firstName, appt.patient.lastName);
  const providerName = appt.provider?.user
    ? formatFullName(appt.provider.user.firstName, appt.provider.user.lastName)
    : null;

  return (
    <li className="grid gap-2 border-b border-border/60 px-3 py-3 last:border-b-0 sm:grid-cols-[5.5rem_1fr_auto] sm:items-center sm:gap-3">
      <div className="text-sm font-semibold tabular-nums text-lens-navy dark:text-foreground">
        {formatTime(appt.startsAt)}
      </div>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/provider/patients/${appt.patientId}`}
            className="truncate text-sm font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {patientName}
          </Link>
          <StatusChip tone={appointmentStatusTone(appt.status)}>
            {formatAppointmentStatusLabel(appt.status)}
          </StatusChip>
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">
          {appt.type.replace(/_/g, ' ').toLowerCase()}
          {providerName ? ` · ${providerName}` : ''}
          {appt.location?.shortName ? ` · ${appt.location.shortName}` : ''}
          {appt.encounter?.status ? ` · Encounter ${appt.encounter.status.replace(/_/g, ' ').toLowerCase()}` : ''}
        </p>
      </div>
      <Link
        href={`/provider/patients/${appt.patientId}`}
        className={cn(
          buttonVariants({ variant: 'outline', size: 'sm' }),
          'h-8 shrink-0 bg-white/50 dark:bg-white/5',
        )}
        aria-label={`Open chart for ${patientName}`}
      >
        <ExternalLink className="mr-1 h-3.5 w-3.5" />
        Chart
      </Link>
    </li>
  );
}

export function ScheduleCard({ todays }: { todays: AppointmentListItem[] }) {
  return (
    <GlassCard tone="strong">
      <GlassCardHeader className="flex flex-row items-center justify-between space-y-0">
        <GlassCardTitle>Today&apos;s schedule</GlassCardTitle>
        <Link
          href="/provider/appointments"
          className={buttonVariants({ variant: 'ghost', size: 'sm' })}
        >
          Full schedule
        </Link>
      </GlassCardHeader>
      <GlassCardContent>
        {todays.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="No appointments today"
            description="Your schedule is clear for today."
          />
        ) : (
          <ul className="overflow-hidden rounded-xl border border-border/70 bg-white/70 dark:bg-white/[0.04]">
            {todays.map((appt) => (
              <ScheduleRow key={appt.id} appt={appt} />
            ))}
          </ul>
        )}
      </GlassCardContent>
    </GlassCard>
  );
}
