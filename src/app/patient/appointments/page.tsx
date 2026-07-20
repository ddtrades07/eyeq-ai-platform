import { CalendarDays } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { AppointmentStatusBadge } from '@/components/appointments/status-badge';
import { requirePortalPatient } from '@/lib/auth/portal';
import { db } from '@/lib/db';
import { formatDateTime } from '@/lib/utils';

export const metadata = { title: 'Appointments' };

export default async function PortalAppointments() {
  const session = await requirePortalPatient();
  const appointments = await db.appointment.findMany({
    where: { patientId: session.patientId },
    orderBy: { startsAt: 'desc' },
    take: 50,
  });

  const upcoming = appointments.filter(
    (a) => a.startsAt >= new Date() && a.status !== 'CANCELLED' && a.status !== 'COMPLETED',
  );
  const past = appointments.filter((a) => !upcoming.includes(a));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Appointments</h2>
        <p className="text-sm text-muted-foreground">
          Upcoming visits and past activity.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle>Upcoming</CardTitle></CardHeader>
        <CardContent className="p-0">
          {upcoming.length === 0 ? (
            <div className="p-6">
              <EmptyState icon={CalendarDays} title="No upcoming appointments" />
            </div>
          ) : (
            <ul className="divide-y">
              {upcoming.map((a) => (
                <li key={a.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <div className="text-sm font-medium">{humanize(a.type)}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDateTime(a.startsAt)}
                    </div>
                  </div>
                  <AppointmentStatusBadge status={a.status} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>History</CardTitle></CardHeader>
        <CardContent className="p-0">
          {past.length === 0 ? (
            <div className="p-6">
              <EmptyState icon={CalendarDays} title="No past visits yet" />
            </div>
          ) : (
            <ul className="divide-y">
              {past.map((a) => (
                <li key={a.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <div className="text-sm font-medium">{humanize(a.type)}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatDateTime(a.startsAt)}
                    </div>
                  </div>
                  <Badge variant={a.status === 'COMPLETED' ? 'success' : 'outline'}>
                    {a.status.replace('_', ' ')}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function humanize(t: string) {
  return t.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}
