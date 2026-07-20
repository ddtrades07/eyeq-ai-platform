import {
  Activity,
  CalendarDays,
  ClipboardCheck,
  ImageIcon,
  MessageSquare,
  Users,
  XCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { StatCard } from '@/components/dashboard/stat-card';
import { requireStaffUser, requirePermission } from '@/lib/auth/require';
import { db } from '@/lib/db';
import { formatPercent } from '@/lib/utils';

export const metadata = { title: 'Admin insights' };

export default async function AdminInsightsPage() {
  const user = await requireStaffUser();
  await requirePermission('finance:read');
  if (!user.organizationId) return null;

  const orgId = user.organizationId;
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(endOfWeek.getDate() + 7);
  const lastWeekStart = new Date(startOfWeek);
  lastWeekStart.setDate(startOfWeek.getDate() - 7);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const [
    apptsThisWeek,
    apptsLastWeek,
    monthApptsByStatus,
    apptsByLocation,
    apptsByType,
    pendingImaging,
    signedImagingThisMonth,
    openCareGaps,
    unreadMessages,
    locations,
  ] = await Promise.all([
    db.appointment.count({
      where: {
        organizationId: orgId,
        startsAt: { gte: startOfWeek, lt: endOfWeek },
      },
    }),
    db.appointment.count({
      where: {
        organizationId: orgId,
        startsAt: { gte: lastWeekStart, lt: startOfWeek },
      },
    }),
    db.appointment.groupBy({
      by: ['status'],
      where: {
        organizationId: orgId,
        startsAt: { gte: startOfMonth, lt: endOfMonth },
      },
      _count: { _all: true },
    }),
    db.appointment.groupBy({
      by: ['locationId'],
      where: {
        organizationId: orgId,
        startsAt: { gte: startOfMonth, lt: endOfMonth },
      },
      _count: { _all: true },
    }),
    db.appointment.groupBy({
      by: ['type'],
      where: {
        organizationId: orgId,
        startsAt: { gte: startOfMonth, lt: endOfMonth },
      },
      _count: { _all: true },
    }),
    db.imagingCase.count({
      where: { organizationId: orgId, status: { not: 'PROVIDER_SIGNED' } },
    }),
    db.imagingCase.count({
      where: {
        organizationId: orgId,
        status: 'PROVIDER_SIGNED',
        signedAt: { gte: startOfMonth, lt: endOfMonth },
      },
    }),
    db.careGap.count({
      where: {
        organizationId: orgId,
        status: { notIn: ['BOOKED', 'DISMISSED'] },
      },
    }),
    db.message.count({
      where: { readStatus: 'UNREAD', thread: { organizationId: orgId } },
    }),
    db.location.findMany({
      where: { organizationId: orgId, active: true },
      select: { id: true, shortName: true, name: true },
    }),
  ]);

  const monthTotal = monthApptsByStatus.reduce((s, r) => s + r._count._all, 0);
  const completed = monthApptsByStatus.find((r) => r.status === 'COMPLETED')?._count._all ?? 0;
  const noShows = monthApptsByStatus.find((r) => r.status === 'NO_SHOW')?._count._all ?? 0;
  const cancelled = monthApptsByStatus.find((r) => r.status === 'CANCELLED')?._count._all ?? 0;
  const completionRate = monthTotal ? completed / monthTotal : 0;
  const noShowRate = monthTotal ? noShows / monthTotal : 0;
  const cancelRate = monthTotal ? cancelled / monthTotal : 0;

  const weekChange = apptsLastWeek
    ? ((apptsThisWeek - apptsLastWeek) / apptsLastWeek) * 100
    : null;

  const locationMap = new Map(locations.map((l) => [l.id, l]));
  const topLocations = [...apptsByLocation]
    .sort((a, b) => b._count._all - a._count._all)
    .slice(0, 6);
  const topTypes = [...apptsByType]
    .sort((a, b) => b._count._all - a._count._all)
    .slice(0, 6);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Admin insights</h2>
        <p className="text-sm text-muted-foreground">
          Operational pulse for the practice. Owners and admins only.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Appts this week"
          value={apptsThisWeek}
          icon={CalendarDays}
          hint={
            weekChange === null
              ? 'No baseline last week'
              : `${weekChange >= 0 ? '+' : ''}${weekChange.toFixed(1)}% vs last week`
          }
        />
        <StatCard
          label="Completion rate (month)"
          value={formatPercent(completionRate)}
          icon={ClipboardCheck}
          accent="success"
        />
        <StatCard
          label="No-show rate (month)"
          value={formatPercent(noShowRate)}
          icon={XCircle}
          accent={noShowRate > 0.1 ? 'destructive' : 'warning'}
        />
        <StatCard
          label="Cancellation rate (month)"
          value={formatPercent(cancelRate)}
          icon={Activity}
        />
        <StatCard
          label="Imaging awaiting review"
          value={pendingImaging}
          icon={ImageIcon}
          href="/provider/imaging"
        />
        <StatCard
          label="Imaging signed (month)"
          value={signedImagingThisMonth}
          icon={ImageIcon}
          accent="success"
        />
        <StatCard
          label="Open care gaps"
          value={openCareGaps}
          icon={Users}
          accent="warning"
          href="/provider/care-gaps"
        />
        <StatCard
          label="Unread messages"
          value={unreadMessages}
          icon={MessageSquare}
          href="/provider/messages"
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top locations this month</CardTitle>
          </CardHeader>
          <CardContent>
            {topLocations.length === 0 ? (
              <p className="text-sm text-muted-foreground">No appointments this month.</p>
            ) : (
              <ul className="space-y-3 text-sm">
                {topLocations.map((row) => {
                  const loc = row.locationId ? locationMap.get(row.locationId) : null;
                  const pct = monthTotal ? row._count._all / monthTotal : 0;
                  return (
                    <li key={row.locationId ?? 'none'} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span>{loc?.name ?? 'Unassigned'}</span>
                        <span className="text-xs text-muted-foreground">
                          {row._count._all} · {formatPercent(pct)}
                        </span>
                      </div>
                      <Progress value={pct * 100} />
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top visit types this month</CardTitle>
          </CardHeader>
          <CardContent>
            {topTypes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No appointments this month.</p>
            ) : (
              <ul className="space-y-3 text-sm">
                {topTypes.map((row) => {
                  const pct = monthTotal ? row._count._all / monthTotal : 0;
                  return (
                    <li key={row.type} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span>{humanize(row.type)}</span>
                        <span className="text-xs text-muted-foreground">
                          {row._count._all} · {formatPercent(pct)}
                        </span>
                      </div>
                      <Progress value={pct * 100} />
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Month-to-date status mix</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 text-xs">
            {monthApptsByStatus.length === 0 ? (
              <span className="text-muted-foreground">No data.</span>
            ) : (
              monthApptsByStatus.map((row) => (
                <Badge key={row.status} variant="outline">
                  {row.status.replace('_', ' ')}: {row._count._all}
                </Badge>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function humanize(t: string) {
  return t.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}
