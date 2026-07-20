import { AppointmentStatus, type PrismaClient } from '@prisma/client';

const ACTIVE_STATUSES: AppointmentStatus[] = [
  AppointmentStatus.SCHEDULED,
  AppointmentStatus.CONFIRMED,
  AppointmentStatus.CHECKED_IN,
  AppointmentStatus.IN_PRETEST,
  AppointmentStatus.WITH_DOCTOR,
  AppointmentStatus.IN_OPTICAL,
];

export type ScheduleConflict = {
  appointmentId: string;
  startsAt: Date;
  endsAt: Date;
  patientId: string;
  type: string;
};

export type ConflictCheckInput = {
  organizationId: string;
  providerId?: string | null;
  locationId?: string | null;
  startsAt: Date;
  endsAt: Date;
  excludeAppointmentId?: string;
};

/**
 * Two intervals overlap when startA < endB && startB < endA.
 */
export function intervalsOverlap(
  startA: Date,
  endA: Date,
  startB: Date,
  endB: Date,
): boolean {
  return startA < endB && startB < endA;
}

export function formatConflictMessage(conflicts: ScheduleConflict[]): string {
  if (conflicts.length === 0) return '';
  const first = conflicts[0];
  const time = first.startsAt.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  });
  if (conflicts.length === 1) {
    return `Scheduling conflict at ${time}. Another appointment is already booked for this provider.`;
  }
  return `Scheduling conflict: ${conflicts.length} overlapping appointments found for this provider.`;
}

export async function findProviderConflicts(
  db: Pick<PrismaClient, 'appointment'>,
  input: ConflictCheckInput,
): Promise<ScheduleConflict[]> {
  if (!input.providerId) return [];

  const candidates = await db.appointment.findMany({
    where: {
      organizationId: input.organizationId,
      providerId: input.providerId,
      status: { in: ACTIVE_STATUSES },
      ...(input.excludeAppointmentId ? { id: { not: input.excludeAppointmentId } } : {}),
      startsAt: { lt: input.endsAt },
      endsAt: { gt: input.startsAt },
    },
    select: {
      id: true,
      startsAt: true,
      endsAt: true,
      patientId: true,
      type: true,
    },
  });

  return candidates
    .filter((c) =>
      intervalsOverlap(input.startsAt, input.endsAt, c.startsAt, c.endsAt),
    )
    .map((c) => ({
      appointmentId: c.id,
      startsAt: c.startsAt,
      endsAt: c.endsAt,
      patientId: c.patientId,
      type: c.type,
    }));
}
