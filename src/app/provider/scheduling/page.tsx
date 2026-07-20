import Link from 'next/link';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AppointmentStatusBadge } from '@/components/appointments/status-badge';
import { CopilotContextSetter } from '@/components/copilot/copilot-context-setter';
import { requirePermission } from '@/lib/auth/require';
import { listAppointments } from '@/server/queries/appointments';
import { resolveActiveLocationId } from '@/lib/location/server';
import { formatFullName, formatTime } from '@/lib/utils';
import { hasPermission } from '@/lib/auth/rbac';

export const metadata = { title: 'Scheduling' };

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default async function SchedulingPage({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>;
}) {
  const user = await requirePermission('appointments:read');
  if (!user.organizationId) return null;
  const params = await searchParams;

  const start = startOfWeek(params.week ? new Date(params.week) : new Date());
  const end = addDays(start, 7);
  const prev = isoDate(addDays(start, -7));
  const next = isoDate(addDays(start, 7));
  const today = isoDate(new Date());
  const locationId = await resolveActiveLocationId({
    organizationId: user.organizationId,
    userId: user.id,
    role: user.role,
  });

  const appts = await listAppointments({
    organizationId: user.organizationId,
    locationId,
    from: start,
    to: end,
    take: 200,
  });

  const byDay = new Map<string, typeof appts>();
  for (let i = 0; i < 7; i++) {
    byDay.set(isoDate(addDays(start, i)), []);
  }
  for (const a of appts) {
    const key = isoDate(a.startsAt);
    const bucket = byDay.get(key);
    if (bucket) bucket.push(a);
  }

  const canCreate = hasPermission(user.role, 'appointments:create');

  return (
    <div className="space-y-6">
      <CopilotContextSetter page="scheduling" />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Scheduling</h2>
          <p className="text-sm text-muted-foreground">
            Week of {formatLongDate(start)}, {appts.length} visit
            {appts.length === 1 ? '' : 's'} booked.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/provider/scheduling?week=${prev}`}
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            <ChevronLeft className="h-4 w-4" /> Prev
          </Link>
          <Link
            href="/provider/scheduling"
            className={buttonVariants({ variant: 'ghost', size: 'sm' })}
          >
            This week
          </Link>
          <Link
            href={`/provider/scheduling?week=${next}`}
            className={buttonVariants({ variant: 'outline', size: 'sm' })}
          >
            Next <ChevronRight className="h-4 w-4" />
          </Link>
          {canCreate ? (
            <Link
              href="/provider/appointments?action=new"
              className={buttonVariants({ size: 'sm' })}
            >
              <Plus className="h-4 w-4" /> New
            </Link>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-7">
        {Array.from({ length: 7 }, (_, i) => {
          const day = addDays(start, i);
          const key = isoDate(day);
          const slots = byDay.get(key) ?? [];
          const isToday = key === today;
          return (
            <Card key={key} className={isToday ? 'border-primary/50' : undefined}>
              <CardHeader className="space-y-0 pb-2">
                <CardTitle className="text-sm">
                  <span className="text-xs uppercase tracking-wide text-muted-foreground">
                    {DAYS_OF_WEEK[day.getDay()]}
                  </span>
                  <div className="text-base font-semibold">
                    {day.getDate()}{' '}
                    <span className="text-xs font-normal text-muted-foreground">
                      {day.toLocaleString(undefined, { month: 'short' })}
                    </span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1.5 p-3 pt-0">
                {slots.length === 0 ? (
                  <p className="rounded border border-dashed bg-muted/20 p-2 text-center text-[11px] text-muted-foreground">
                    No visits
                  </p>
                ) : (
                  slots.map((a) => (
                    <Link
                      key={a.id}
                      href={`/provider/patients/${a.patient.id}`}
                      className="block rounded-md border bg-card px-2 py-1.5 text-xs transition-colors hover:border-primary/40"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{formatTime(a.startsAt)}</span>
                        <AppointmentStatusBadge status={a.status} />
                      </div>
                      <div className="truncate text-[11px] text-muted-foreground">
                        {formatFullName(a.patient.firstName, a.patient.lastName)}
                      </div>
                      <div className="truncate text-[10px] text-muted-foreground">
                        {humanize(a.type)}
                        {a.provider?.user
                          ? ` · ${a.provider.user.lastName ?? ''}`
                          : ''}
                        {a.location?.shortName ? ` · ${a.location.shortName}` : ''}
                      </div>
                    </Link>
                  ))
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function startOfWeek(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - x.getDay());
  return x;
}
function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}
function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
function formatLongDate(d: Date): string {
  return d.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}
function humanize(t: string) {
  return t.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}
