import Link from 'next/link';
import { CalendarDays, ClipboardCheck, Stethoscope } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { AppointmentStatusBadge } from '@/components/appointments/status-badge';
import { PretestDialog } from '@/components/pre-charting/pretest-dialog';
import { requirePermission } from '@/lib/auth/require';
import { db } from '@/lib/db';
import { formatDateTime, formatFullName, formatTime, calculateAge } from '@/lib/utils';

export const metadata = { title: 'Pre-charting' };

export default async function PreChartingPage() {
  const user = await requirePermission('notes:read');
  if (!user.organizationId) return null;

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const appts = await db.appointment.findMany({
    where: {
      organizationId: user.organizationId,
      startsAt: { gte: start, lt: end },
      status: { not: 'CANCELLED' },
    },
    include: {
      patient: {
        select: { id: true, firstName: true, lastName: true, dateOfBirth: true },
      },
      provider: {
        select: {
          user: { select: { firstName: true, lastName: true } },
          credentials: true,
        },
      },
      location: { select: { shortName: true } },
      clinicalNotes: {
        where: { type: 'Pretest' },
        select: { id: true, status: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
    orderBy: { startsAt: 'asc' },
  });

  const totalDone = appts.filter((a) => a.clinicalNotes.length > 0).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Pre-charting</h2>
          <p className="text-sm text-muted-foreground">
            Capture VA, IOP, history, allergies and meds before the patient is
            handed to the optometrist.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-md border bg-card px-3 py-1.5 text-sm">
          <ClipboardCheck className="h-4 w-4 text-emerald-600" />
          <span>
            {totalDone} / {appts.length} pretest{appts.length === 1 ? '' : 's'} captured today
          </span>
        </div>
      </div>

      {appts.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No appointments today"
          description="Pretest cards appear here automatically when patients are scheduled."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {appts.map((a) => {
            const done = a.clinicalNotes[0];
            const patientName = formatFullName(a.patient.firstName, a.patient.lastName);
            return (
              <Card key={a.id} className={done ? 'border-emerald-200' : undefined}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">
                    <Link
                      href={`/provider/patients/${a.patient.id}`}
                      className="hover:underline"
                    >
                      {patientName}
                    </Link>
                  </CardTitle>
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="font-medium">{formatTime(a.startsAt)}</span>
                    <span className="text-muted-foreground">
                      {humanize(a.type)} · {calculateAge(a.patient.dateOfBirth)} y/o
                    </span>
                    <AppointmentStatusBadge status={a.status} />
                    {done ? (
                      <Badge variant="success">
                        <ClipboardCheck className="h-3 w-3" /> Pretest done
                      </Badge>
                    ) : null}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="text-xs text-muted-foreground">
                    Provider:{' '}
                    {a.provider?.user
                      ? formatFullName(a.provider.user.firstName, a.provider.user.lastName)
                      : 'Unassigned'}
                    {a.location?.shortName ? ` · ${a.location.shortName}` : ''}
                  </div>
                  {a.reason ? (
                    <p className="rounded bg-muted/40 p-2 text-xs">{a.reason}</p>
                  ) : null}
                  {done ? (
                    <p className="text-xs text-muted-foreground">
                      Captured {formatDateTime(done.createdAt)}
                    </p>
                  ) : null}
                  <div className="flex items-center gap-2 pt-1">
                    <PretestDialog
                      appointmentId={a.id}
                      patientId={a.patient.id}
                      patientName={patientName}
                    />
                    <Link
                      href={`/provider/patients/${a.patient.id}`}
                      className="inline-flex h-9 items-center rounded-md border bg-background px-3 text-xs hover:bg-accent"
                    >
                      <Stethoscope className="mr-1 h-3 w-3" /> Open chart
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function humanize(t: string) {
  return t.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}
