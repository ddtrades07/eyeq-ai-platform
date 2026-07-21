import 'server-only';

import {
  AppointmentStatus,
  CareGapStatus,
  ClinicalNoteStatus,
  PrescriptionStatus,
  type Prisma,
} from '@prisma/client';
import { db } from '@/lib/db';
import { appointmentLocationFilter } from '@/lib/location/scope';
import { evaluatePilotLaunch } from '@/lib/production/pilot-launch';
import { withPerfLog } from '@/lib/perf/log';
import { cachedDashboardCounts, cachedPilotLaunchSummary } from '@/lib/cache/safe-cache';

function dayBounds(d = new Date()) {
  const start = new Date(d);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

export type FlowBucket = {
  id: string;
  label: string;
  count: number;
  href: string;
  tone: 'default' | 'info' | 'warning' | 'success' | 'danger';
};

export type FocusItem = {
  id: string;
  label: string;
  detail: string;
  href: string;
  count?: number;
  /** When true, show even if count is 0 / omitted (status rows). */
  alwaysShow?: boolean;
};

export type CommandCenterData = {
  flow: FlowBucket[];
  providerFocus: FocusItem[];
  aiQueue: FocusItem[];
  patientExperience: FocusItem[];
  practiceHealth: FocusItem[];
  reputation: FocusItem[];
  launch?: {
    statusLabel: string;
    livePhiEnabled: boolean;
    controlledPilotEnabled: boolean;
    items: { id: string; label: string; done: boolean }[];
    href: string;
  };
  nextPatient: {
    id: string;
    patientId: string;
    name: string;
    time: string;
    type: string;
    status: string;
  } | null;
  waitingPatient: {
    id: string;
    patientId: string;
    name: string;
    waitingMinutes: number;
    status: string;
  } | null;
};

function statusCount(
  rows: { status: AppointmentStatus; _count: { _all: number } }[],
  statuses: AppointmentStatus[],
) {
  const set = new Set(statuses);
  return rows.filter((r) => set.has(r.status)).reduce((sum, r) => sum + r._count._all, 0);
}

async function loadCommandCenterUncached(
  organizationId: string,
  locationId: string | null | undefined,
  opts?: { includeLaunch?: boolean },
): Promise<CommandCenterData> {
  const { start, end } = dayBounds();
  const now = new Date();
  const apptLoc = appointmentLocationFilter(locationId);

  const todayWhere: Prisma.AppointmentWhereInput = {
    organizationId,
    startsAt: { gte: start, lt: end },
    ...apptLoc,
  };

  // Critical path: flow + next/waiting + provider focus (parallel, minimal round trips)
  const [
    statusGroups,
    typeGroups,
    runningLate,
    nextAppt,
    waitingAppt,
    unsignedNotes,
    unsignedRx,
    imagingAwaiting,
    urgentGaps,
    unreadStaffMessages,
  ] = await Promise.all([
    db.appointment.groupBy({
      by: ['status'],
      where: todayWhere,
      _count: { _all: true },
    }),
    db.appointment.groupBy({
      by: ['type'],
      where: todayWhere,
      _count: { _all: true },
    }),
    db.appointment.count({
      where: {
        ...todayWhere,
        status: { in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED] },
        startsAt: { lt: now },
      },
    }),
    db.appointment.findFirst({
      where: {
        ...todayWhere,
        status: {
          in: [AppointmentStatus.SCHEDULED, AppointmentStatus.CONFIRMED, AppointmentStatus.CHECKED_IN],
        },
        startsAt: { gte: now },
      },
      orderBy: { startsAt: 'asc' },
      select: {
        id: true,
        patientId: true,
        startsAt: true,
        type: true,
        status: true,
        patient: { select: { firstName: true, lastName: true } },
      },
    }),
    db.appointment.findFirst({
      where: {
        ...todayWhere,
        status: {
          in: [AppointmentStatus.CHECKED_IN, AppointmentStatus.IN_PRETEST],
        },
      },
      orderBy: { startsAt: 'asc' },
      select: {
        id: true,
        patientId: true,
        startsAt: true,
        status: true,
        patient: { select: { firstName: true, lastName: true } },
      },
    }),
    db.clinicalNote.count({
      where: {
        organizationId,
        status: { in: [ClinicalNoteStatus.DRAFT, ClinicalNoteStatus.AWAITING_SIGNOFF] },
      },
    }),
    db.prescription.count({
      where: {
        organizationId,
        status: PrescriptionStatus.DRAFT,
        signedAt: null,
      },
    }),
    db.imagingCase.count({
      where: {
        organizationId,
        archivedAt: null,
        studyStatus: { in: ['AWAITING_PROVIDER_REVIEW', 'ANALYSIS_COMPLETE'] },
      },
    }),
    db.careGap.count({
      where: { organizationId, status: CareGapStatus.OVERDUE },
    }),
    db.message.count({
      where: {
        readStatus: 'UNREAD',
        thread: { organizationId },
      },
    }),
  ]);

  const scheduled = statusCount(statusGroups, [
    AppointmentStatus.SCHEDULED,
    AppointmentStatus.CONFIRMED,
  ]);
  const checkedIn = statusCount(statusGroups, [AppointmentStatus.CHECKED_IN]);
  const inExam = statusCount(statusGroups, [
    AppointmentStatus.IN_PRETEST,
    AppointmentStatus.WITH_DOCTOR,
    AppointmentStatus.IN_OPTICAL,
  ]);
  const readyForProvider = statusCount(statusGroups, [
    AppointmentStatus.CHECKED_IN,
    AppointmentStatus.IN_PRETEST,
  ]);
  const completed = statusCount(statusGroups, [AppointmentStatus.COMPLETED]);
  const noShows = statusCount(statusGroups, [AppointmentStatus.NO_SHOW]);
  const walkIns = typeGroups
    .filter((t) => t.type === 'WALK_IN')
    .reduce((sum, t) => sum + t._count._all, 0);

  // Secondary widgets: fail soft independently
  const secondary = await Promise.allSettled([
    db.appointmentRequest.count({ where: { organizationId, status: 'PENDING' } }),
    db.reminderCampaign.count({
      where: { organizationId, status: { in: ['DRAFT', 'PENDING_APPROVAL'] } },
    }),
    db.patientForm.count({ where: { organizationId, status: 'PENDING' } }),
    db.careGap.count({
      where: {
        organizationId,
        status: { in: [CareGapStatus.DUE, CareGapStatus.OVERDUE, CareGapStatus.CONTACTED] },
      },
    }),
    db.opticalOrder.count({
      where: {
        organizationId,
        status: {
          in: [
            'ORDERED',
            'AT_LAB',
            'IN_PRODUCTION',
            'SHIPPED',
            'RECEIVED',
            'QUALITY_CHECK',
            'READY_FOR_PICKUP',
          ],
        },
      },
    }),
    db.patientInvoice.count({ where: { organizationId, status: 'OPEN' } }),
    db.googleReview.count({
      where: {
        organizationId,
        replyStatus: { in: ['PENDING_REPLY', 'DRAFT'] },
      },
    }),
    db.googleReview.count({
      where: {
        organizationId,
        starRating: { lte: 2 },
        replyStatus: { in: ['PENDING_REPLY', 'DRAFT'] },
      },
    }),
    db.googleReview.count({
      where: { organizationId, replyStatus: 'PENDING_REPLY' },
    }),
    db.googleReview.count({
      where: { organizationId, replyStatus: 'DRAFT' },
    }),
    db.googleBusinessQuestion.count({
      where: { organizationId, replyStatus: 'UNANSWERED' },
    }),
    db.googleBusinessConnection.count({
      where: { organizationId, demoMode: true },
    }),
    db.blockedAiRequest.count({
      where: { organizationId, createdAt: { gte: start } },
    }),
    db.ambientScribeSession.count({
      where: { organizationId, reviewStatus: 'READY_FOR_REVIEW', archivedAt: null },
    }),
    db.clinicalNote.count({
      where: { organizationId, status: ClinicalNoteStatus.DRAFT },
    }),
  ]);

  const settled = (i: number) =>
    secondary[i]?.status === 'fulfilled' ? (secondary[i] as PromiseFulfilledResult<number>).value : 0;

  const appointmentRequests = settled(0);
  const remindersPending = settled(1);
  const openForms = settled(2);
  const openCareGaps = settled(3);
  const opticalInProgress = settled(4);
  const openInvoices = settled(5);
  const reviewsPending = settled(6);
  const reviewsNegative = settled(7);
  const unansweredReviews = settled(8);
  const draftsAwaiting = settled(9);
  const unansweredQuestions = settled(10);
  const demoGbpConnections = settled(11);
  const blockedAi = settled(12);
  const scribeReady = settled(13);
  const prechartNotes = settled(14);

  const flowHref = (status?: string) =>
    status
      ? `/provider/patient-flow?status=${encodeURIComponent(status)}`
      : '/provider/patient-flow';

  const flow: FlowBucket[] = [
    { id: 'scheduled', label: 'Scheduled', count: scheduled, href: flowHref('SCHEDULED'), tone: 'default' },
    { id: 'checked_in', label: 'Checked in', count: checkedIn, href: flowHref('CHECKED_IN'), tone: 'info' },
    { id: 'in_exam', label: 'In exam', count: inExam, href: flowHref('WITH_DOCTOR'), tone: 'info' },
    {
      id: 'ready',
      label: 'Ready for provider',
      count: readyForProvider,
      href: flowHref('CHECKED_IN'),
      tone: 'warning',
    },
    { id: 'completed', label: 'Completed', count: completed, href: flowHref('COMPLETED'), tone: 'success' },
    { id: 'walk_ins', label: 'Walk-ins', count: walkIns, href: '/provider/appointments?type=WALK_IN', tone: 'default' },
    {
      id: 'late',
      label: 'Running late',
      count: runningLate,
      href: '/provider/appointments?late=1',
      tone: 'danger',
    },
  ];

  const providerFocus: FocusItem[] = [
    {
      id: 'unsigned_notes',
      label: 'Unsigned notes',
      detail: 'Draft or awaiting sign-off',
      href: '/provider/tasks',
      count: unsignedNotes,
    },
    {
      id: 'unsigned_rx',
      label: 'Unsigned prescriptions',
      detail: 'Needs provider signature',
      href: '/provider/patients',
      count: unsignedRx,
    },
    {
      id: 'imaging',
      label: 'Imaging awaiting review',
      detail: 'Provider review required',
      href: '/provider/imaging',
      count: imagingAwaiting,
    },
    {
      id: 'urgent_gaps',
      label: 'Urgent care gaps',
      detail: 'Overdue follow-ups',
      href: '/provider/care-gaps',
      count: urgentGaps,
    },
    {
      id: 'messages',
      label: 'Messages needing response',
      detail: 'Unread threads',
      href: '/provider/messages',
      count: unreadStaffMessages,
    },
  ];

  const aiQueue: FocusItem[] = [
    {
      id: 'prechart',
      label: 'Pre-chart / note drafts',
      detail: 'Draft only · provider review required',
      href: '/provider/pre-charting',
      count: prechartNotes,
    },
    {
      id: 'soap',
      label: 'SOAP / scribe drafts',
      detail: 'Draft only · provider review required',
      href: '/provider/ambient-scribe',
      count: scribeReady,
    },
    {
      id: 'imaging_ai',
      label: 'Imaging review support',
      detail: 'Draft only · provider review required',
      href: '/provider/imaging',
      count: imagingAwaiting,
    },
    {
      id: 'blocked',
      label: 'Blocked AI attempts today',
      detail: 'Fail-closed safety events',
      href: '/provider/settings/ai',
      count: blockedAi,
    },
  ];

  const patientExperience: FocusItem[] = [
    {
      id: 'unread',
      label: 'Unread patient messages',
      detail: 'Secure portal threads',
      href: '/provider/messages',
      count: unreadStaffMessages,
    },
    {
      id: 'requests',
      label: 'Appointment requests',
      detail: 'Awaiting staff conversion',
      href: '/provider/appointment-requests',
      count: appointmentRequests,
    },
    {
      id: 'reminders',
      label: 'Reminder drafts',
      detail: 'Preview / approval needed',
      href: '/provider/reminders',
      count: remindersPending,
    },
    {
      id: 'forms',
      label: 'Forms awaiting review',
      detail: 'Submitted patient forms',
      href: '/provider/reminders',
      count: openForms,
    },
  ];

  const practiceHealth: FocusItem[] = [
    {
      id: 'completed_today',
      label: "Today's completed visits",
      detail: 'Finished encounters',
      href: '/provider/appointments',
      count: completed,
    },
    {
      id: 'noshows',
      label: 'No-shows today',
      detail: 'Missed appointments',
      href: '/provider/appointments',
      count: noShows,
    },
    {
      id: 'caregaps',
      label: 'Open care gaps',
      detail: 'Due / overdue / contacted',
      href: '/provider/care-gaps',
      count: openCareGaps,
    },
    {
      id: 'optical',
      label: 'Optical orders in progress',
      detail: 'Lab / dispensary pipeline',
      href: '/provider/optical',
      count: opticalInProgress,
    },
    {
      id: 'invoices',
      label: 'Open invoice drafts',
      detail: 'Unpaid patient balances',
      href: '/provider/billing',
      count: openInvoices,
    },
    {
      id: 'reviews_health',
      label: 'Reviews needing reply',
      detail: 'Approve before publish',
      href: '/provider/reputation',
      count: reviewsPending,
    },
  ];

  const reputation: FocusItem[] = [
    {
      id: 'new_reviews',
      label: 'New reviews needing attention',
      detail: 'Pending or draft reply',
      href: '/provider/reputation',
      count: reviewsPending,
    },
    {
      id: 'needing_reply',
      label: 'Needing reply',
      detail: 'No draft yet',
      href: '/provider/reputation',
      count: unansweredReviews,
    },
    {
      id: 'unanswered_questions',
      label: 'Unanswered Google questions',
      detail: 'Public Q&A inbox',
      href: '/provider/reputation/questions',
      count: unansweredQuestions,
    },
    {
      id: 'negative',
      label: 'Negative review alerts',
      detail: '2 stars or below',
      href: '/provider/reputation',
      count: reviewsNegative,
    },
    {
      id: 'drafts_awaiting',
      label: 'Drafts awaiting approval',
      detail: 'Approve before publish · never auto-post',
      href: '/provider/reputation/drafts',
      count: draftsAwaiting,
    },
    {
      id: 'demo_mode_status',
      label: demoGbpConnections > 0 ? 'Demo mode reputation' : 'Reputation connection',
      detail:
        demoGbpConnections > 0
          ? 'Synthetic data · DEMO_PUBLISHED only'
          : 'Connect Google Business for live publishing',
      href: '/provider/reputation',
      alwaysShow: true,
    },
  ];

  // Launch is merged in getCommandCenterData via a separate short-TTL cache.
  void opts;

  return {
    flow,
    providerFocus,
    aiQueue,
    patientExperience,
    practiceHealth,
    reputation,
    launch: undefined,
    nextPatient: nextAppt
      ? {
          id: nextAppt.id,
          patientId: nextAppt.patientId,
          name: `${nextAppt.patient.firstName} ${nextAppt.patient.lastName}`,
          time: nextAppt.startsAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }),
          type: nextAppt.type.replace(/_/g, ' '),
          status: nextAppt.status,
        }
      : null,
    waitingPatient: waitingAppt
      ? {
          id: waitingAppt.id,
          patientId: waitingAppt.patientId,
          name: `${waitingAppt.patient.firstName} ${waitingAppt.patient.lastName}`,
          waitingMinutes: Math.max(
            0,
            Math.round((Date.now() - waitingAppt.startsAt.getTime()) / 60000),
          ),
          status: waitingAppt.status,
        }
      : null,
  };
}

/** Premium command-center metrics: short-lived cache, org+location scoped (counts only). */
export async function getCommandCenterData(
  organizationId: string,
  locationId: string | null | undefined,
  opts?: { includeLaunch?: boolean },
): Promise<CommandCenterData> {
  return withPerfLog(
    {
      route: 'query.command-center',
      organizationId,
      meta: { locationId: locationId ?? 'all', includeLaunch: Boolean(opts?.includeLaunch) },
    },
    async () => {
      // Always cache critical + secondary counts (no PHI). Launch merges separately for admins.
      const base = await cachedDashboardCounts(organizationId, locationId ?? 'all', () =>
        loadCommandCenterUncached(organizationId, locationId, { includeLaunch: false }),
      );

      if (!opts?.includeLaunch) return base;

      try {
        const pilot = await cachedPilotLaunchSummary(organizationId, () =>
          evaluatePilotLaunch(organizationId),
        );
        return {
          ...base,
          launch: {
            statusLabel:
              pilot.status === 'controlled_pilot_ready'
                ? 'Controlled pilot ready'
                : pilot.status === 'live_production_ready'
                  ? 'Live production ready'
                  : pilot.status === 'internal_demo_only'
                    ? 'Internal demo only'
                    : 'Not ready',
            livePhiEnabled: pilot.livePhiEnabled,
            controlledPilotEnabled: pilot.controlledPilotEnabled,
            items: pilot.items.slice(0, 8).map((i) => ({
              id: i.id,
              label: i.label,
              done: i.done,
            })),
            href: '/provider/settings/pilot-launch',
          },
        };
      } catch {
        return base;
      }
    },
  );
}
