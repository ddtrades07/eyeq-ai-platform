import 'server-only';
import { db } from '@/lib/db';
import { AppointmentStatus, CareGapStatus, ImagingStudyStatus } from '@prisma/client';
import { appointmentLocationFilter } from '@/lib/location/scope';

export type DashboardAttention = {
  unreviewedImaging: number;
  unsignedNotes: number;
  openCareGaps: number;
  unreadMessages: number;
  imagingAwaitingSignOff: number;
};

export async function getDashboardAttention(
  organizationId: string,
  locationId?: string | null,
): Promise<DashboardAttention> {
  const apptLoc = appointmentLocationFilter(locationId);
  const imagingWhere = {
    organizationId,
    archivedAt: null,
    studyStatus: {
      in: [
        ImagingStudyStatus.AWAITING_PROVIDER_REVIEW,
        ImagingStudyStatus.ANALYSIS_COMPLETE,
        ImagingStudyStatus.ANALYSIS_FAILED,
      ],
    },
    ...(locationId ? { locationId } : {}),
  };

  const [unreviewedImaging, unsignedNotes, openCareGaps, unreadMessages, imagingAwaitingSignOff] =
    await Promise.all([
      db.imagingCase.count({ where: imagingWhere }),
      db.clinicalNote.count({
        where: {
          organizationId,
          status: { in: ['DRAFT', 'AWAITING_SIGNOFF'] },
        },
      }),
      db.careGap.count({
        where: {
          organizationId,
          status: { in: [CareGapStatus.DUE, CareGapStatus.OVERDUE, CareGapStatus.CONTACTED] },
        },
      }),
      db.message.count({
        where: { readStatus: 'UNREAD', thread: { organizationId } },
      }),
      db.imagingCase.count({
        where: {
          ...imagingWhere,
          signedAt: null,
        },
      }),
    ]);

  return {
    unreviewedImaging,
    unsignedNotes,
    openCareGaps,
    unreadMessages,
    imagingAwaitingSignOff,
  };
}

export async function getWorkflowHealth(organizationId: string, locationId?: string | null) {
  const apptLoc = appointmentLocationFilter(locationId);
  const start = new Date();
  start.setHours(0, 0, 0, 0);

  const [inProgress, noShowToday, imagingPending] = await Promise.all([
    db.appointment.count({
      where: {
        organizationId,
        ...apptLoc,
        startsAt: { gte: start },
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
    db.appointment.count({
      where: {
        organizationId,
        ...apptLoc,
        startsAt: { gte: start },
        status: AppointmentStatus.NO_SHOW,
      },
    }),
    db.imagingCase.count({
      where: {
        organizationId,
        archivedAt: null,
        studyStatus: ImagingStudyStatus.AWAITING_PROVIDER_REVIEW,
        ...(locationId ? { locationId } : {}),
      },
    }),
  ]);

  return { inProgress, noShowToday, imagingPending };
}
