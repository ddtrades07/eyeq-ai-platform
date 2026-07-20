import Link from 'next/link';
import { CalendarDays } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CopilotContextSetter } from '@/components/copilot/copilot-context-setter';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AppointmentStatusBadge } from '@/components/appointments/status-badge';
import { EncounterStatusBadge } from '@/components/encounters/encounter-status-badge';
import { AppointmentRowActions } from '@/components/appointments/row-actions';
import { NewAppointmentDialog } from '@/components/appointments/new-appointment-dialog';
import { WalkInDialog } from '@/components/appointments/walk-in-dialog';
import { requirePermission } from '@/lib/auth/require';
import { listAppointments } from '@/server/queries/appointments';
import { resolveActiveLocationId } from '@/lib/location/server';
import { db } from '@/lib/db';
import { formatDateTime, formatFullName } from '@/lib/utils';
import { hasPermission } from '@/lib/auth/rbac';

export const metadata = { title: 'Appointments' };

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; from?: string; to?: string }>;
}) {
  const user = await requirePermission('appointments:read');
  if (!user.organizationId) return null;
  const params = await searchParams;

  const from = params.from ? new Date(params.from) : startOfWeek();
  const to = params.to ? new Date(params.to) : endOfWeek(from);
  const locationId = await resolveActiveLocationId({
    organizationId: user.organizationId,
    userId: user.id,
    role: user.role,
  });

  const canCreate = hasPermission(user.role, 'appointments:create');
  const canChangeStatus = hasPermission(user.role, 'appointments:status');
  const canCancel = hasPermission(user.role, 'appointments:delete');

  const [appointments, patients, providers, locations] = await Promise.all([
    listAppointments({
      organizationId: user.organizationId,
      locationId,
      from,
      to,
      take: 120,
    }),
    canCreate
      ? db.patient.findMany({
          where: { organizationId: user.organizationId, archivedAt: null },
          select: { id: true, firstName: true, lastName: true },
          orderBy: { lastName: 'asc' },
          take: 80,
        })
      : Promise.resolve([] as { id: string; firstName: string; lastName: string }[]),
    canCreate
      ? db.provider.findMany({
          where: { organizationId: user.organizationId },
          select: {
            id: true,
            credentials: true,
            user: { select: { firstName: true, lastName: true } },
          },
        })
      : Promise.resolve(
          [] as {
            id: string;
            credentials: string | null;
            user: { firstName: string | null; lastName: string | null };
          }[],
        ),
    canCreate
      ? db.location.findMany({
          where: { organizationId: user.organizationId, active: true },
          select: { id: true, shortName: true, name: true },
        })
      : Promise.resolve([] as { id: string; shortName: string; name: string }[]),
  ]);

  return (
    <div className="space-y-6">
      <CopilotContextSetter page="appointments" />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Appointments</h2>
          <p className="text-sm text-muted-foreground">
            {appointments.length} visit{appointments.length === 1 ? '' : 's'} between{' '}
            {formatDateTime(from)} and {formatDateTime(to)}.
          </p>
        </div>
        {canCreate ? (
          <div className="flex flex-wrap gap-2">
            <WalkInDialog patients={patients} />
            <NewAppointmentDialog
              patients={patients}
              providers={providers}
              locations={locations}
              defaultOpen={params.action === 'new'}
            />
            <Button asChild variant="outline" size="sm">
              <Link href="/provider/appointment-requests">Online requests</Link>
            </Button>
          </div>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Schedule</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {appointments.length === 0 ? (
            <div className="p-6">
              <EmptyState
                icon={CalendarDays}
                title="No appointments in this range"
                description="Use the new-appointment button to schedule a visit, or widen your date range."
              />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Patient</TableHead>
                  <TableHead>When</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Encounter</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appointments.map((appt) => (
                  <TableRow key={appt.id}>
                    <TableCell className="font-medium">
                      <Link href={`/provider/patients/${appt.patient.id}`} className="hover:underline">
                        {formatFullName(appt.patient.firstName, appt.patient.lastName)}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDateTime(appt.startsAt)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {humanize(appt.type)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {appt.provider
                        ? formatFullName(
                            appt.provider.user?.firstName,
                            appt.provider.user?.lastName,
                          )
                        : '-'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {appt.location?.shortName ?? '-'}
                    </TableCell>
                    <TableCell>
                      <AppointmentStatusBadge status={appt.status} />
                    </TableCell>
                    <TableCell>
                      {appt.encounter ? (
                        <Link
                          href={`/provider/encounters/${appt.encounter.id}/exam`}
                          className="inline-block hover:opacity-80"
                        >
                          <EncounterStatusBadge status={appt.encounter.status} />
                        </Link>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <AppointmentRowActions
                        appointmentId={appt.id}
                        canChangeStatus={canChangeStatus}
                        canCancel={canCancel}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function startOfWeek(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  const dow = d.getDay();
  d.setDate(d.getDate() - dow);
  return d;
}
function endOfWeek(start: Date): Date {
  const d = new Date(start);
  d.setDate(d.getDate() + 7);
  return d;
}
function humanize(t: string) {
  return t
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
}
