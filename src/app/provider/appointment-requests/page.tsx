import Link from 'next/link';
import { CalendarClock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { AppointmentRequestActions } from '@/components/appointments/appointment-request-actions';
import { requirePermission } from '@/lib/auth/require';
import { hasPermission } from '@/lib/auth/rbac';
import { db } from '@/lib/db';
import { formatDateTime } from '@/lib/utils';

export const metadata = { title: 'Appointment requests' };

export default async function AppointmentRequestsPage() {
  const user = await requirePermission('appointments:read');
  if (!user.organizationId) return null;

  const canManage = hasPermission(user.role, 'appointments:create');
  const requests = await db.appointmentRequest.findMany({
    where: { organizationId: user.organizationId },
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      patient: { select: { id: true, firstName: true, lastName: true } },
      appointment: { select: { id: true, startsAt: true } },
    },
  });

  const pending = requests.filter((r) => r.status === 'PENDING');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Online appointment requests"
        description="Approve by converting to a scheduled visit, or decline. Portal booking creates a request: not an automatic appointment."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{pending.length}</CardContent>
        </Card>
      </div>

      {requests.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="No online requests yet"
          description="When patients use portal booking, requests appear here for staff review."
        />
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <Card key={r.id}>
              <CardContent className="flex flex-wrap items-start justify-between gap-3 py-4">
                <div className="space-y-1 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">
                      {r.patient
                        ? `${r.patient.firstName} ${r.patient.lastName}`
                        : r.requesterName}
                    </p>
                    <Badge
                      variant={
                        r.status === 'PENDING'
                          ? 'warning'
                          : r.status === 'CONVERTED'
                            ? 'success'
                            : r.status === 'DECLINED'
                              ? 'destructive'
                              : 'outline'
                      }
                    >
                      {r.status}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground">
                    {r.preferredType.replace(/_/g, ' ')}
                    {r.preferredStartsAt
                      ? ` · preferred ${formatDateTime(r.preferredStartsAt)}`
                      : ''}
                  </p>
                  {r.notes ? (
                    <p className="max-w-xl whitespace-pre-wrap text-xs text-muted-foreground">
                      {r.notes}
                    </p>
                  ) : null}
                  {r.appointment ? (
                    <Link
                      href="/provider/appointments"
                      className="text-xs text-primary hover:underline"
                    >
                      Converted appointment · {formatDateTime(r.appointment.startsAt)}
                    </Link>
                  ) : null}
                  {r.patient ? (
                    <Link
                      href={`/provider/patients/${r.patient.id}`}
                      className="block text-xs text-primary hover:underline"
                    >
                      Open patient chart →
                    </Link>
                  ) : null}
                </div>
                {canManage && r.status === 'PENDING' ? (
                  <AppointmentRequestActions
                    requestId={r.id}
                    preferredStartsAt={r.preferredStartsAt?.toISOString() ?? null}
                  />
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
