import 'server-only';
import type { AppointmentStatus, EncounterStatus } from '@prisma/client';
import { db } from '@/lib/db';

const APPOINTMENT_TO_ENCOUNTER: Record<AppointmentStatus, EncounterStatus> = {
  SCHEDULED: 'SCHEDULED',
  CONFIRMED: 'SCHEDULED',
  CHECKED_IN: 'CHECKED_IN',
  IN_PRETEST: 'IN_PRETEST',
  WITH_DOCTOR: 'WITH_PROVIDER',
  IN_OPTICAL: 'CHECKOUT',
  COMPLETED: 'COMPLETED',
  NO_SHOW: 'CANCELLED',
  CANCELLED: 'CANCELLED',
};

const STATUS_TIMESTAMPS: Partial<Record<EncounterStatus, keyof {
  checkedInAt: Date;
  pretestStartedAt: Date;
  providerStartedAt: Date;
  documentationStartedAt: Date;
  completedAt: Date;
}>> = {
  CHECKED_IN: 'checkedInAt',
  IN_PRETEST: 'pretestStartedAt',
  WITH_PROVIDER: 'providerStartedAt',
  DOCUMENTATION: 'documentationStartedAt',
  COMPLETED: 'completedAt',
};

/** Creates or updates encounter to match appointment workflow status. */
export async function syncEncounterForAppointment(args: {
  appointmentId: string;
  organizationId: string;
  patientId: string;
  locationId?: string | null;
  providerId?: string | null;
  status: AppointmentStatus;
  createdById?: string;
}): Promise<void> {
  const encounterStatus = APPOINTMENT_TO_ENCOUNTER[args.status];
  const timestampField = STATUS_TIMESTAMPS[encounterStatus];
  const now = new Date();

  const existing = await db.encounter.findUnique({
    where: { appointmentId: args.appointmentId },
  });

  if (!existing) {
    await db.encounter.create({
      data: {
        organizationId: args.organizationId,
        locationId: args.locationId,
        patientId: args.patientId,
        appointmentId: args.appointmentId,
        providerId: args.providerId,
        status: encounterStatus,
        createdById: args.createdById,
        ...(timestampField ? { [timestampField]: now } : {}),
      },
    });
    return;
  }

  await db.encounter.update({
    where: { id: existing.id },
    data: {
      status: encounterStatus,
      ...(timestampField && !existing[timestampField as keyof typeof existing]
        ? { [timestampField]: now }
        : {}),
    },
  });
}
