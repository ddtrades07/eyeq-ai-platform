import 'server-only';
import { db } from '@/lib/db';
import { AppointmentStatus, CareGapStatus, type Prisma } from '@prisma/client';
import { appointmentLocationFilter } from '@/lib/location/scope';

export type DashboardStats = {
  todaysAppointments: number;
  inProgress: number;
  awaitingProviderReview: number;
  unresolvedCareGaps: number;
  unreadMessages: number;
  totalPatients: number;
};

export async function getDashboardStats(
  organizationId: string,
  locationId?: string | null,
): Promise<DashboardStats> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const apptLoc = appointmentLocationFilter(locationId);
  const imagingWhere: Prisma.ImagingCaseWhereInput = {
    organizationId,
    archivedAt: null,
    studyStatus: {
      in: ['AWAITING_PROVIDER_REVIEW', 'ANALYSIS_COMPLETE', 'ANALYSIS_FAILED', 'ANALYZING', 'READY_FOR_ANALYSIS'],
    },
    ...(locationId ? { OR: [{ locationId }, { appointment: { locationId } }] } : {}),
  };

  const [
    todaysAppointments,
    inProgress,
    awaitingProviderReview,
    unresolvedCareGaps,
    unreadMessages,
    totalPatients,
  ] = await Promise.all([
    db.appointment.count({
      where: { organizationId, startsAt: { gte: start, lt: end }, ...apptLoc },
    }),
    db.appointment.count({
      where: {
        organizationId,
        ...apptLoc,
        status: {
          in: [
            AppointmentStatus.CHECKED_IN,
            AppointmentStatus.IN_PRETEST,
            AppointmentStatus.WITH_DOCTOR,
            AppointmentStatus.IN_OPTICAL,
          ],
        },
      },
    }),
    db.imagingCase.count({ where: imagingWhere }),
    db.careGap.count({
      where: {
        organizationId,
        status: { in: [CareGapStatus.DUE, CareGapStatus.OVERDUE, CareGapStatus.CONTACTED] },
        ...(locationId
          ? {
              patient: {
                appointments: {
                  some: { locationId, startsAt: { gte: start, lt: end } },
                },
              },
            }
          : {}),
      },
    }),
    db.message.count({
      where: {
        readStatus: 'UNREAD',
        thread: { organizationId },
      },
    }),
    db.patient.count({
      where: {
        organizationId,
        archivedAt: null,
        ...(locationId
          ? { appointments: { some: { locationId } } }
          : {}),
      },
    }),
  ]);

  return {
    todaysAppointments,
    inProgress,
    awaitingProviderReview,
    unresolvedCareGaps,
    unreadMessages,
    totalPatients,
  };
}

export type AiReviewQueue = {
  notesPendingReview: number;
  imagingPendingReview: number;
  scribeProcessing: number;
  highRiskImaging: number;
  imagingFollowUps: number;
};

/** Counts of AI outputs waiting on a provider, shown on the dashboard. */
export async function getAiReviewQueue(organizationId: string): Promise<AiReviewQueue> {
  const [
    notesPendingReview,
    imagingPendingReview,
    scribeProcessing,
    highRiskImaging,
    imagingFollowUps,
  ] = await Promise.all([
    db.ambientScribeSession.count({
      where: { organizationId, reviewStatus: 'READY_FOR_REVIEW', archivedAt: null },
    }),
    db.imagingCase.count({
      where: {
        organizationId,
        archivedAt: null,
        studyStatus: { in: ['AWAITING_PROVIDER_REVIEW', 'ANALYSIS_COMPLETE'] },
      },
    }),
    db.ambientScribeSession.count({
      where: {
        organizationId,
        status: { in: ['RECORDING', 'TRANSCRIBING'] },
        archivedAt: null,
      },
    }),
    db.imagingCase.count({
      where: {
        organizationId,
        archivedAt: null,
        signedAt: null,
        aiUrgency: { in: ['same-day', 'urgent-referral'] },
      },
    }),
    db.imagingCase.count({
      where: { organizationId, archivedAt: null, needsFollowUp: true },
    }),
  ]);

  return {
    notesPendingReview,
    imagingPendingReview,
    scribeProcessing,
    highRiskImaging,
    imagingFollowUps,
  };
}
