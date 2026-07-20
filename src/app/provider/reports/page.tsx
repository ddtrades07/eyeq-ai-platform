import Link from 'next/link';
import {
  GlassCard,
  GlassCardContent,
  GlassCardHeader,
  GlassCardTitle,
  SectionHeader,
} from '@/components/ui/glass-card';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { requirePermission } from '@/lib/auth/require';
import { resolveActiveLocationId } from '@/lib/location/server';
import { appointmentLocationFilter } from '@/lib/location/scope';
import { db } from '@/lib/db';
import {
  AppointmentStatus,
  ClinicalNoteStatus,
  CareGapStatus,
} from '@prisma/client';

export const metadata = { title: 'Reports' };
export const dynamic = 'force-dynamic';

function dayBounds(offsetDays = 0) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() + offsetDays);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

function weekBounds() {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  start.setDate(start.getDate() - 6);
  start.setHours(0, 0, 0, 0);
  return { start, end };
}

function monthBounds() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return { start, end };
}

export default async function ReportsPage() {
  const user = await requirePermission('appointments:read');
  if (!user.organizationId) return null;

  const locationId = await resolveActiveLocationId({
    organizationId: user.organizationId,
    userId: user.id,
    role: user.role,
  });
  const loc = appointmentLocationFilter(locationId);
  const today = dayBounds(0);
  const week = weekBounds();
  const month = monthBounds();

  const [
    visitsToday,
    visitsWeek,
    visitsMonth,
    noShowsMonth,
    scheduledMonth,
    unsignedNotes,
    signedNotes,
    imagingAwaiting,
    opticalOpen,
    lowStock,
    unreadMessages,
    reviewsPending,
    aiUsage,
    openTickets,
  ] = await Promise.all([
    db.appointment.count({
      where: {
        organizationId: user.organizationId,
        ...loc,
        startsAt: { gte: today.start, lt: today.end },
        status: AppointmentStatus.COMPLETED,
      },
    }),
    db.appointment.count({
      where: {
        organizationId: user.organizationId,
        ...loc,
        startsAt: { gte: week.start, lte: week.end },
        status: AppointmentStatus.COMPLETED,
      },
    }),
    db.appointment.count({
      where: {
        organizationId: user.organizationId,
        ...loc,
        startsAt: { gte: month.start, lt: month.end },
        status: AppointmentStatus.COMPLETED,
      },
    }),
    db.appointment.count({
      where: {
        organizationId: user.organizationId,
        ...loc,
        startsAt: { gte: month.start, lt: month.end },
        status: AppointmentStatus.NO_SHOW,
      },
    }),
    db.appointment.count({
      where: {
        organizationId: user.organizationId,
        ...loc,
        startsAt: { gte: month.start, lt: month.end },
        status: { not: AppointmentStatus.CANCELLED },
      },
    }),
    db.clinicalNote.count({
      where: {
        organizationId: user.organizationId,
        status: { in: [ClinicalNoteStatus.DRAFT, ClinicalNoteStatus.AWAITING_SIGNOFF] },
      },
    }),
    db.clinicalNote.count({
      where: {
        organizationId: user.organizationId,
        status: ClinicalNoteStatus.SIGNED,
      },
    }),
    db.imagingCase.count({
      where: {
        organizationId: user.organizationId,
        archivedAt: null,
        studyStatus: { in: ['AWAITING_PROVIDER_REVIEW', 'ANALYSIS_COMPLETE'] },
      },
    }),
    db.opticalOrder.count({
      where: {
        organizationId: user.organizationId,
        status: {
          in: ['ORDERED', 'AT_LAB', 'IN_PRODUCTION', 'SHIPPED', 'RECEIVED', 'QUALITY_CHECK', 'READY_FOR_PICKUP'],
        },
      },
    }),
    db.inventoryItem.findMany({
      where: { organizationId: user.organizationId, status: 'ACTIVE', archivedAt: null },
      select: { quantityOnHand: true, reorderAt: true },
    }).then((items) =>
      items.filter((i) => i.reorderAt > 0 && i.quantityOnHand <= i.reorderAt).length,
    ),
    db.message.count({
      where: { readStatus: 'UNREAD', thread: { organizationId: user.organizationId } },
    }),
    db.googleReview.count({
      where: {
        organizationId: user.organizationId,
        replyStatus: { in: ['PENDING_REPLY', 'DRAFT'] },
      },
    }),
    db.aiUsageRecord.count({ where: { organizationId: user.organizationId } }),
    db.supportTicket
      .count({
        where: {
          organizationId: user.organizationId,
          status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING_ON_CUSTOMER'] },
        },
      })
      .catch(() => 0),
  ]);

  const noShowRate =
    scheduledMonth > 0 ? Math.round((noShowsMonth / scheduledMonth) * 1000) / 10 : 0;

  const cards = [
    { label: 'Visits today', value: visitsToday, href: '/provider/appointments' },
    { label: 'Visits this week', value: visitsWeek, href: '/provider/appointments' },
    { label: 'Visits this month', value: visitsMonth, href: '/provider/appointments' },
    { label: 'No-show rate (month)', value: `${noShowRate}%`, href: '/provider/appointments' },
    { label: 'Unsigned notes', value: unsignedNotes, href: '/provider/tasks' },
    { label: 'Signed notes', value: signedNotes, href: '/provider/tasks' },
    { label: 'Imaging awaiting review', value: imagingAwaiting, href: '/provider/imaging' },
    { label: 'Optical orders in progress', value: opticalOpen, href: '/provider/optical' },
    { label: 'Inventory low stock', value: lowStock, href: '/provider/inventory' },
    { label: 'Unread messages', value: unreadMessages, href: '/provider/messages' },
    { label: 'Google reviews needing reply', value: reviewsPending, href: '/provider/reputation' },
    { label: 'AI usage events', value: aiUsage, href: '/provider/settings/ai' },
    { label: 'Open support tickets', value: openTickets, href: '/provider/support' },
  ];

  const openGaps = await db.careGap.count({
    where: {
      organizationId: user.organizationId,
      status: { in: [CareGapStatus.DUE, CareGapStatus.OVERDUE, CareGapStatus.CONTACTED] },
    },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Simple operational counts from live data. Not full RCM analytics."
        actions={
          <Link
            href="/provider/financial-reports"
            className={buttonVariants({ size: 'sm', variant: 'outline' })}
          >
            Financial reports
          </Link>
        }
      />

      <SectionHeader
        title="Operations snapshot"
        description="Click any card to open the related workflow"
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {cards.map((c) => (
          <Link key={c.label} href={c.href} className="group">
            <GlassCard className="transition-all group-hover:-translate-y-0.5 group-hover:shadow-md">
              <GlassCardHeader className="pb-2">
                <GlassCardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {c.label}
                </GlassCardTitle>
              </GlassCardHeader>
              <GlassCardContent>
                <div className="text-2xl font-semibold tabular-nums tracking-tight">{c.value}</div>
              </GlassCardContent>
            </GlassCard>
          </Link>
        ))}
        <Link href="/provider/care-gaps" className="group">
          <GlassCard className="transition-all group-hover:-translate-y-0.5 group-hover:shadow-md">
            <GlassCardHeader className="pb-2">
              <GlassCardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Open care gaps
              </GlassCardTitle>
            </GlassCardHeader>
            <GlassCardContent>
              <div className="text-2xl font-semibold tabular-nums tracking-tight">{openGaps}</div>
            </GlassCardContent>
          </GlassCard>
        </Link>
      </div>

      {visitsMonth === 0 && unsignedNotes === 0 && imagingAwaiting === 0 ? (
        <EmptyState
          title="Not enough activity to report yet"
          description="As appointments, notes, imaging, and messages accumulate, these operational counts fill in."
          action={
            <Link href="/provider/appointments" className={buttonVariants({ size: 'sm' })}>
              Open schedule
            </Link>
          }
        />
      ) : null}

      <p className="text-xs text-muted-foreground">
        Honesty note: EyeQ reports operational activity only. Do not treat these as revenue-cycle
        KPIs or clinical quality measures.
      </p>
      <Badge variant="outline">Location scoped when a location is selected</Badge>
    </div>
  );
}
