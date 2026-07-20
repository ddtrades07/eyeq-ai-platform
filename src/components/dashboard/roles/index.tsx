import Link from 'next/link';
import {
  Activity,
  CalendarDays,
  ClipboardList,
  DollarSign,
  FileText,
  ImageIcon,
  MessageSquare,
  Mic,
  Receipt,
  Shield,
  Sparkles,
  Stethoscope,
  Users,
} from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { DemoPitchTour } from '@/components/demo/demo-pitch-tour';
import { AIInsightCard } from '@/components/dashboard/ai-insight-card';
import { ScheduleCard } from '@/components/dashboard/schedule-card';
import { QueueCard } from '@/components/dashboard/ops-cards';
import { hasPermission } from '@/lib/auth/rbac';
import type { SessionUser } from '@/lib/auth/session';
import type { DashboardStats, AiReviewQueue } from '@/server/queries/dashboard';
import type { AppointmentListItem } from '@/server/queries/appointments';
import { formatFullName } from '@/lib/utils';
import {
  AttentionCard,
  AttentionRow,
  DashboardShell,
  QuickAction,
  StatCard,
  StatGrid,
  timeOfDayGreeting,
} from './shared';

type BaseProps = {
  user: SessionUser;
  organizationId: string;
  stats: DashboardStats;
  aiQueue: AiReviewQueue;
  todays: AppointmentListItem[];
  billingIssues: number;
  showPitchTour?: boolean;
};

function waitingMinutes(startsAt: Date): number {
  return Math.max(0, Math.round((Date.now() - new Date(startsAt).getTime()) / 60000));
}

function queueFromAppointments(todays: AppointmentListItem[]) {
  const inClinic = todays.filter((a) =>
    ['CHECKED_IN', 'IN_PRETEST', 'WITH_DOCTOR', 'IN_OPTICAL'].includes(a.status),
  );
  return inClinic.map((a) => ({
    id: a.id,
    label: formatFullName(a.patient.firstName, a.patient.lastName),
    meta: `${a.type.replace(/_/g, ' ').toLowerCase()}${a.location?.shortName ? ` · ${a.location.shortName}` : ''}`,
    waitingMinutes: waitingMinutes(a.startsAt),
    href: `/provider/patients/${a.patientId}`,
    stage:
      a.status === 'CHECKED_IN'
        ? 'Arrived'
        : a.status === 'IN_PRETEST'
          ? 'With Technician'
          : a.status === 'WITH_DOCTOR'
            ? 'Ready / In Exam'
            : 'Checkout',
  }));
}

function aiInsightItems(aiQueue: AiReviewQueue, stats: DashboardStats) {
  return [
    {
      id: 'scribe',
      title: 'Scribe notes ready for review',
      detail: 'Ambient drafts need provider edit and signature before charting.',
      href: '/provider/ambient-scribe',
      count: aiQueue.notesPendingReview,
    },
    {
      id: 'imaging',
      title: 'Imaging awaiting provider review',
      detail: 'Review status and quality before finalizing interpretation.',
      href: '/provider/imaging',
      count: aiQueue.imagingPendingReview,
    },
    {
      id: 'high-risk',
      title: 'Priority imaging flags',
      detail: 'Elevated review priority based on case metadata — confirm clinically.',
      href: '/provider/imaging',
      count: aiQueue.highRiskImaging,
    },
    {
      id: 'gaps',
      title: 'Care gaps needing action',
      detail: 'Recall and follow-up opportunities identified from chart history.',
      href: '/provider/care-gaps',
      count: stats.unresolvedCareGaps,
    },
  ];
}

export function OptometristDashboard({
  user,
  stats,
  aiQueue,
  todays,
  showPitchTour,
  organizationId,
}: BaseProps) {
  const aiPending =
    aiQueue.notesPendingReview + aiQueue.imagingPendingReview + aiQueue.scribeProcessing;
  const queue = queueFromAppointments(todays);
  const readyForProvider = todays.filter((a) => a.status === 'IN_PRETEST' || a.status === 'CHECKED_IN');

  return (
    <>
      {showPitchTour ? <DemoPitchTour organizationId={organizationId} /> : null}
      <DashboardShell
        greeting={timeOfDayGreeting(user.firstName)}
        description="Patient care and clinical work for today."
        actions={
          todays[0] ? (
            <Link href={`/provider/patients/${todays[0].patientId}`} className={buttonVariants()}>
              Open next patient
            </Link>
          ) : null
        }
      >
        <StatGrid>
          <StatCard label="Today's patients" value={stats.todaysAppointments} icon={CalendarDays} href="/provider/appointments" />
          <StatCard label="In clinic now" value={stats.inProgress} icon={Activity} accent={stats.inProgress > 0 ? 'warning' : 'default'} href="/provider/patient-flow" />
          <StatCard label="Imaging to review" value={aiQueue.imagingPendingReview} icon={ImageIcon} accent={aiQueue.imagingPendingReview > 0 ? 'warning' : 'default'} href="/provider/imaging" />
          <StatCard label="Messages" value={stats.unreadMessages} icon={MessageSquare} accent={stats.unreadMessages > 0 ? 'warning' : 'default'} href="/provider/messages" />
        </StatGrid>

        <div className="grid gap-4 xl:grid-cols-[1.4fr_1fr]">
          <div className="space-y-4">
            <QueueCard
              title="Patient queue"
              description={`${readyForProvider.length} preparing · ${queue.length} active in clinic`}
              items={queue}
            />
            <ScheduleCard todays={todays} />
          </div>
          <div className="space-y-4">
            <AIInsightCard items={aiInsightItems(aiQueue, stats)} />
            <AttentionCard title="Needs your clinical attention" href="/provider/tasks">
              <AttentionRow label="Notes requiring signature" count={aiQueue.notesPendingReview} href="/provider/ambient-scribe" />
              <AttentionRow label="Imaging awaiting review" count={aiQueue.imagingPendingReview} href="/provider/imaging" />
              <AttentionRow label="High priority imaging" count={aiQueue.highRiskImaging} href="/provider/imaging" />
              <AttentionRow label="Care gap alerts" count={stats.unresolvedCareGaps} href="/provider/care-gaps" />
              <AttentionRow label="AI processing" count={aiQueue.scribeProcessing} href="/provider/ambient-scribe" />
              <AttentionRow label="AI pending total" count={aiPending} href="/provider/tasks" />
            </AttentionCard>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <QuickAction href="/provider/ambient-scribe" label="Start ambient scribe" icon={Mic} />
          <QuickAction href="/provider/imaging" label="Review imaging" icon={ImageIcon} />
          <QuickAction href="/provider/tasks" label="Complete chart" icon={ClipboardList} />
          <QuickAction href="/provider/care-gaps" label="Follow-ups due" icon={Stethoscope} />
        </div>
      </DashboardShell>
    </>
  );
}

export function OwnerDashboard({
  user,
  metrics,
  stats,
  aiQueue,
  showPitchTour,
  organizationId,
}: BaseProps & {
  metrics: Awaited<ReturnType<typeof import('@/server/queries/role-dashboard').getOwnerDashboardMetrics>>;
}) {
  return (
    <>
      {showPitchTour ? <DemoPitchTour organizationId={organizationId} /> : null}
      <DashboardShell
        greeting={timeOfDayGreeting(user.firstName)}
        description="Practice performance and oversight. Clinical signing requires an optometrist role."
      >
        <StatGrid>
          <StatCard label="Revenue today" value={`$${(metrics.revenueTodayCents / 100).toFixed(0)}`} icon={DollarSign} href="/provider/financial-reports" />
          <StatCard label="Revenue this month" value={`$${(metrics.revenueMonthCents / 100).toFixed(0)}`} icon={DollarSign} href="/provider/financial-reports" />
          <StatCard label="Patient volume today" value={stats.todaysAppointments} icon={Users} href="/provider/admin-insights" />
          <StatCard label="Locations active" value={metrics.locationCount} icon={Activity} href="/provider/practice-setup" />
        </StatGrid>

        <div className="grid gap-4 lg:grid-cols-2">
          <AttentionCard title="Operations needing oversight" href="/provider/admin-insights">
            <AttentionRow label="Charts still open" count={metrics.openCharts} href="/provider/appointments" />
            <AttentionRow label="Claims needing attention" count={metrics.claimsAttention} href="/provider/billing" />
            <AttentionRow label="No-shows today" count={metrics.noShowsToday} href="/provider/appointments" />
            <AttentionRow label="Open care gaps" count={stats.unresolvedCareGaps} href="/provider/care-gaps" />
          </AttentionCard>
          <AIInsightCard items={aiInsightItems(aiQueue, stats)} />
        </div>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <QuickAction href="/provider/team" label="Manage team" icon={Users} />
          <QuickAction href="/provider/settings/ai" label="Review AI usage" icon={Sparkles} />
          <QuickAction href="/provider/ehr-integrations" label="Integrations" icon={Shield} />
          <QuickAction href="/provider/audit-logs" label="Audit activity" icon={FileText} />
        </div>
      </DashboardShell>
    </>
  );
}

export function TechnicianDashboard({
  user,
  metrics,
  todays,
  showPitchTour,
  organizationId,
}: BaseProps & {
  metrics: Awaited<ReturnType<typeof import('@/server/queries/role-dashboard').getTechnicianDashboardMetrics>>;
}) {
  return (
    <>
      {showPitchTour ? <DemoPitchTour organizationId={organizationId} /> : null}
      <DashboardShell
        greeting={timeOfDayGreeting(user.firstName)}
        description="Patient preparation, pretesting, and imaging support."
      >
        <StatGrid>
          <StatCard label="Assigned today" value={todays.length} icon={CalendarDays} href="/provider/appointments" />
          <StatCard label="Waiting for pretest" value={metrics.waitingPretest} icon={Activity} accent={metrics.waitingPretest > 0 ? 'warning' : 'default'} href="/provider/appointments" />
          <StatCard label="Pretests in progress" value={metrics.inPretest} icon={Stethoscope} href="/provider/pre-charting" />
          <StatCard label="Your open tasks" value={metrics.openTasks} icon={ClipboardList} href="/provider/tasks" />
        </StatGrid>

        <div className="grid gap-4 lg:grid-cols-2">
          <QueueCard title="Technician queue" items={queueFromAppointments(todays)} />
          <div className="grid gap-2 content-start sm:grid-cols-2 lg:grid-cols-1">
            <QuickAction href="/provider/pre-charting" label="Start pretest" icon={Stethoscope} />
            <QuickAction href="/provider/imaging" label="Upload imaging" icon={ImageIcon} />
            <QuickAction href="/provider/appointments" label="Mark ready for provider" icon={Activity} />
          </div>
        </div>

        <ScheduleCard todays={todays} />
      </DashboardShell>
    </>
  );
}

export function FrontDeskDashboard({
  user,
  metrics,
  stats,
  todays,
  billingIssues,
  showPitchTour,
  organizationId,
}: BaseProps & {
  metrics: Awaited<ReturnType<typeof import('@/server/queries/role-dashboard').getFrontDeskDashboardMetrics>>;
}) {
  return (
    <>
      {showPitchTour ? <DemoPitchTour organizationId={organizationId} /> : null}
      <DashboardShell
        greeting={timeOfDayGreeting(user.firstName)}
        description="Scheduling, check-in, and front office patient flow."
        actions={
          hasPermission(user.role, 'appointments:create') ? (
            <Link href="/provider/appointments?action=new" className={buttonVariants()}>
              Book appointment
            </Link>
          ) : null
        }
      >
        <StatGrid>
          <StatCard label="Today's appointments" value={stats.todaysAppointments} icon={CalendarDays} href="/provider/appointments" />
          <StatCard label="Arriving soon" value={metrics.arrivingSoon} icon={Activity} href="/provider/appointments" />
          <StatCard label="Checked in" value={metrics.checkedIn} icon={Users} href="/provider/patient-flow" />
          <StatCard label="Pending forms" value={metrics.pendingForms} icon={FileText} accent={metrics.pendingForms > 0 ? 'warning' : 'default'} href="/provider/reminders" />
        </StatGrid>

        <div className="grid gap-4 lg:grid-cols-2">
          <AttentionCard title="Front desk queue" href="/provider/patient-flow">
            <AttentionRow label="No-shows today" count={metrics.noShows} href="/provider/appointments" />
            <AttentionRow label="Administrative messages" count={stats.unreadMessages} href="/provider/messages" />
            <AttentionRow label="Outstanding balances" count={billingIssues} href="/provider/billing" />
          </AttentionCard>
          <QueueCard title="Patients in clinic" items={queueFromAppointments(todays)} />
        </div>

        <ScheduleCard todays={todays} />
      </DashboardShell>
    </>
  );
}

export function BillingDashboard({
  user,
  metrics,
  showPitchTour,
  organizationId,
}: BaseProps & {
  metrics: Awaited<ReturnType<typeof import('@/server/queries/role-dashboard').getBillingDashboardMetrics>>;
}) {
  return (
    <>
      {showPitchTour ? <DemoPitchTour organizationId={organizationId} /> : null}
      <DashboardShell
        greeting={timeOfDayGreeting(user.firstName)}
        description="Claims, payments, and revenue cycle work."
      >
        <StatGrid>
          <StatCard label="Draft claims" value={metrics.draftClaims} icon={Receipt} href="/provider/billing" />
          <StatCard label="Submitted claims" value={metrics.submittedClaims} icon={Receipt} href="/provider/billing" />
          <StatCard label="Rejected claims" value={metrics.rejectedClaims} icon={Receipt} accent={metrics.rejectedClaims > 0 ? 'warning' : 'default'} href="/provider/billing" />
          <StatCard label="Overdue balances" value={metrics.overdueInvoices} icon={DollarSign} accent={metrics.overdueInvoices > 0 ? 'warning' : 'default'} href="/provider/billing" />
        </StatGrid>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <QuickAction href="/provider/billing" label="Open claims" icon={Receipt} />
          <QuickAction href="/provider/billing" label="Review balances" icon={DollarSign} />
          <QuickAction href="/provider/messages" label="Request clarification" icon={MessageSquare} />
        </div>
      </DashboardShell>
    </>
  );
}

export function AdminDashboard({
  user,
  metrics,
  showPitchTour,
  organizationId,
}: BaseProps & {
  metrics: Awaited<ReturnType<typeof import('@/server/queries/role-dashboard').getAdminDashboardMetrics>>;
}) {
  return (
    <>
      {showPitchTour ? <DemoPitchTour organizationId={organizationId} /> : null}
      <DashboardShell
        greeting={timeOfDayGreeting(user.firstName)}
        description="Practice configuration, team setup, and operational alerts."
      >
        <StatGrid>
          <StatCard label="Active staff" value={metrics.staffCount} icon={Users} href="/provider/team" />
          <StatCard label="Integrations" value={metrics.integrations} icon={Shield} href="/provider/ehr-integrations" />
          <StatCard label="Audit events (7d)" value={metrics.openAuditIssues} icon={FileText} href="/provider/audit-logs" />
          <StatCard label="Background jobs" value={metrics.pendingJobs} icon={Activity} accent={metrics.pendingJobs > 0 ? 'warning' : 'default'} href="/provider/settings" />
        </StatGrid>

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <QuickAction href="/provider/team" label="Manage team" icon={Users} />
          <QuickAction href="/provider/workflow-builder" label="Update workflow" icon={ClipboardList} />
          <QuickAction href="/provider/ehr-integrations" label="Integration status" icon={Shield} />
          <QuickAction href="/provider/audit-logs" label="Review audit log" icon={FileText} />
        </div>
      </DashboardShell>
    </>
  );
}

export function ManagerDashboard(props: BaseProps) {
  return (
    <FrontDeskDashboard
      {...props}
      metrics={{
        arrivingSoon: 0,
        checkedIn: props.stats.inProgress,
        noShows: 0,
        pendingForms: 0,
      }}
    />
  );
}

type OpticalMetrics = {
  activeOrders: number;
  readyForPickup: number;
  labInProgress: number;
  lowStock: number;
  salesTodayCents: number;
};

export function OpticalDashboard(props: BaseProps & { metrics: OpticalMetrics }) {
  const { metrics } = props;
  return (
    <DashboardShell
      greeting={timeOfDayGreeting(props.user.firstName)}
      description="Optical orders, lab orders, and product pickup."
    >
      <StatGrid>
        <StatCard label="Orders in progress" value={metrics.activeOrders} icon={Receipt} href="/provider/optical" />
        <StatCard label="Ready for pickup" value={metrics.readyForPickup} icon={CalendarDays} href="/provider/optical" />
        <StatCard label="At the lab" value={metrics.labInProgress} icon={ClipboardList} href="/provider/optical" />
        <StatCard label="Low stock" value={metrics.lowStock} icon={Users} href="/provider/inventory" />
      </StatGrid>
      <div className="grid gap-2 sm:grid-cols-2">
        <QuickAction href="/provider/optical" label="Open optical orders" icon={Receipt} />
        <QuickAction href="/provider/inventory" label="Manage inventory" icon={ClipboardList} />
      </div>
      <ScheduleCard todays={props.todays} />
    </DashboardShell>
  );
}

export function ScribeDashboard(props: BaseProps) {
  return <OptometristDashboard {...props} />;
}
