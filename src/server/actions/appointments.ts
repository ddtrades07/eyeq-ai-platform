'use server';

import { revalidateAppointmentViews } from '@/lib/revalidate-paths';
import { z } from 'zod';
import { AppointmentStatus } from '@prisma/client';
import { db } from '@/lib/db';
import { action } from '@/lib/server-action';
import { assertPermission, assertSameOrg } from '@/lib/auth/require';
import { audit } from '@/lib/audit/log';
import { syncEncounterForAppointment } from '@/lib/encounters/sync';
import { findProviderConflicts, formatConflictMessage } from '@/lib/scheduling/conflicts';
import {
  appointmentCreateSchema,
  appointmentDeleteSchema,
  appointmentStatusSchema,
  appointmentUpdateSchema,
} from '@/lib/zod/appointment';

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

async function loadAppointmentForUser(id: string, organizationId: string) {
  const appt = await db.appointment.findUnique({ where: { id } });
  if (!appt) throw new Error('Appointment not found');
  if (appt.organizationId !== organizationId) {
    throw new Error('Cross-tenant access denied');
  }
  return appt;
}

export const createAppointment = action({
  schema: appointmentCreateSchema,
  async handler(input) {
    const user = await assertPermission('appointments:create');
    if (!user.organizationId) throw new Error('No organization context');

    const patient = await db.patient.findUnique({ where: { id: input.patientId } });
    if (!patient) throw new Error('Patient not found');
    assertSameOrg(user, patient);

    const endsAt = addMinutes(input.startsAt, input.durationMinutes);
    const conflicts = await findProviderConflicts(db, {
      organizationId: user.organizationId,
      providerId: input.providerId,
      locationId: input.locationId,
      startsAt: input.startsAt,
      endsAt,
    });
    if (conflicts.length > 0) {
      throw new Error(formatConflictMessage(conflicts));
    }

    const appt = await db.appointment.create({
      data: {
        organizationId: user.organizationId,
        locationId: input.locationId ?? null,
        patientId: input.patientId,
        providerId: input.providerId ?? null,
        type: input.type,
        status: AppointmentStatus.SCHEDULED,
        startsAt: input.startsAt,
        endsAt: addMinutes(input.startsAt, input.durationMinutes),
        durationMinutes: input.durationMinutes,
        reason: input.reason ?? null,
        notes: input.notes ?? null,
        dilationNeeded: input.dilationNeeded,
        imagingNeeded: input.imagingNeeded,
      },
    });

    await audit({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'CREATE',
      resourceType: 'Appointment',
      resourceId: appt.id,
    });

    await syncEncounterForAppointment({
      appointmentId: appt.id,
      organizationId: appt.organizationId,
      patientId: appt.patientId,
      locationId: appt.locationId,
      providerId: appt.providerId,
      status: appt.status,
      createdById: user.id,
    });

    revalidateAppointmentViews(input.patientId, user.organizationId);
    return appt;
  },
});

export const updateAppointment = action({
  schema: appointmentUpdateSchema,
  async handler(input) {
    const user = await assertPermission('appointments:update');
    if (!user.organizationId) throw new Error('No organization context');

    const existing = await loadAppointmentForUser(input.id, user.organizationId);

    const startsAt = input.startsAt ?? existing.startsAt;
    const duration = input.durationMinutes ?? existing.durationMinutes;
    const endsAt = addMinutes(startsAt, duration);
    const providerId = input.providerId ?? existing.providerId;
    const locationId = input.locationId ?? existing.locationId;

    const conflicts = await findProviderConflicts(db, {
      organizationId: user.organizationId,
      providerId,
      locationId,
      startsAt,
      endsAt,
      excludeAppointmentId: existing.id,
    });
    if (conflicts.length > 0) {
      throw new Error(formatConflictMessage(conflicts));
    }

    const updated = await db.appointment.update({
      where: { id: input.id },
      data: {
        patientId: input.patientId ?? undefined,
        providerId: input.providerId ?? undefined,
        locationId: input.locationId ?? undefined,
        type: input.type ?? undefined,
        startsAt,
        endsAt: addMinutes(startsAt, duration),
        durationMinutes: duration,
        reason: input.reason ?? undefined,
        notes: input.notes ?? undefined,
        dilationNeeded: input.dilationNeeded ?? undefined,
        imagingNeeded: input.imagingNeeded ?? undefined,
      },
    });

    await audit({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'UPDATE',
      resourceType: 'Appointment',
      resourceId: updated.id,
    });

    revalidateAppointmentViews(updated.patientId, user.organizationId);
    return updated;
  },
});

export const setAppointmentStatus = action({
  schema: appointmentStatusSchema,
  async handler(input) {
    const user = await assertPermission('appointments:status');
    if (!user.organizationId) throw new Error('No organization context');

    const existing = await loadAppointmentForUser(input.id, user.organizationId);

    const updated = await db.appointment.update({
      where: { id: existing.id },
      data: {
        status: input.status,
        cancelReason:
          input.status === AppointmentStatus.CANCELLED ? input.cancelReason ?? null : null,
      },
    });

    await audit({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'UPDATE',
      resourceType: 'Appointment',
      resourceId: updated.id,
      metadata: { status: updated.status },
    });

    await syncEncounterForAppointment({
      appointmentId: updated.id,
      organizationId: updated.organizationId,
      patientId: updated.patientId,
      locationId: updated.locationId,
      providerId: updated.providerId,
      status: updated.status,
      createdById: user.id,
    });

    revalidateAppointmentViews(updated.patientId, user.organizationId);
    return updated;
  },
});

export const cancelAppointment = action({
  schema: appointmentDeleteSchema,
  async handler(input) {
    const user = await assertPermission('appointments:delete');
    if (!user.organizationId) throw new Error('No organization context');

    const existing = await loadAppointmentForUser(input.id, user.organizationId);

    const updated = await db.appointment.update({
      where: { id: existing.id },
      data: {
        status: AppointmentStatus.CANCELLED,
        cancelReason: input.reason ?? null,
      },
    });

    await audit({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'DELETE',
      resourceType: 'Appointment',
      resourceId: updated.id,
      metadata: { reason: input.reason },
    });

    await syncEncounterForAppointment({
      appointmentId: updated.id,
      organizationId: updated.organizationId,
      patientId: updated.patientId,
      locationId: updated.locationId,
      providerId: updated.providerId,
      status: updated.status,
      createdById: user.id,
    });

    revalidateAppointmentViews(updated.patientId, user.organizationId);
    return updated;
  },
});

export const rescheduleAppointment = action({
  schema: z.object({
    id: z.string(),
    startsAt: z.coerce.date(),
    durationMinutes: z.coerce.number().int().min(5).max(480).optional(),
  }),
  async handler(input) {
    const user = await assertPermission('appointments:update');
    if (!user.organizationId) throw new Error('No organization context');

    const existing = await loadAppointmentForUser(input.id, user.organizationId);
    const duration = input.durationMinutes ?? existing.durationMinutes;
    const endsAt = addMinutes(input.startsAt, duration);

    const conflicts = await findProviderConflicts(db, {
      organizationId: user.organizationId,
      providerId: existing.providerId,
      locationId: existing.locationId,
      startsAt: input.startsAt,
      endsAt,
      excludeAppointmentId: existing.id,
    });
    if (conflicts.length > 0) {
      throw new Error(formatConflictMessage(conflicts));
    }

    const updated = await db.appointment.update({
      where: { id: existing.id },
      data: {
        startsAt: input.startsAt,
        endsAt: addMinutes(input.startsAt, duration),
        durationMinutes: duration,
        status: AppointmentStatus.SCHEDULED,
        cancelReason: null,
      },
    });

    await audit({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'UPDATE',
      resourceType: 'Appointment',
      resourceId: updated.id,
      metadata: { reason: 'reschedule', startsAt: input.startsAt.toISOString() },
    });

    await syncEncounterForAppointment({
      appointmentId: updated.id,
      organizationId: updated.organizationId,
      patientId: updated.patientId,
      locationId: updated.locationId,
      providerId: updated.providerId,
      status: updated.status,
      createdById: user.id,
    });

    revalidateAppointmentViews(updated.patientId, user.organizationId);
    return updated;
  },
});

/** Create a walk-in visit: lightweight appointment + checked-in encounter. */
export const createWalkInEncounter = action({
  schema: z.object({
    patientId: z.string().min(1),
    locationId: z.string().optional().nullable(),
    providerId: z.string().optional().nullable(),
    reason: z.string().max(500).optional().nullable(),
    durationMinutes: z.number().int().min(15).max(180).default(30),
  }),
  async handler(input) {
    const user = await assertPermission('appointments:create');
    if (!user.organizationId) throw new Error('No organization context');

    const patient = await db.patient.findUnique({ where: { id: input.patientId } });
    if (!patient) throw new Error('Patient not found');
    assertSameOrg(user, patient);

    const startsAt = new Date();
    const endsAt = addMinutes(startsAt, input.durationMinutes);

    const appt = await db.appointment.create({
      data: {
        organizationId: user.organizationId,
        locationId: input.locationId ?? null,
        patientId: input.patientId,
        providerId: input.providerId ?? null,
        type: 'WALK_IN',
        status: AppointmentStatus.CHECKED_IN,
        startsAt,
        endsAt,
        durationMinutes: input.durationMinutes,
        reason: input.reason ?? 'Walk-in',
        source: 'walk-in',
      },
    });

    await syncEncounterForAppointment({
      appointmentId: appt.id,
      organizationId: appt.organizationId,
      patientId: appt.patientId,
      locationId: appt.locationId,
      providerId: appt.providerId,
      status: appt.status,
      createdById: user.id,
    });

    await audit({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'CREATE',
      resourceType: 'Appointment',
      resourceId: appt.id,
      metadata: { source: 'walk-in' },
    });

    revalidateAppointmentViews(appt.patientId, user.organizationId);
    return appt;
  },
});
