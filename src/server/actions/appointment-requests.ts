'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { AppointmentStatus, AppointmentType } from '@prisma/client';
import { db } from '@/lib/db';
import { action } from '@/lib/server-action';
import { assertPermission, assertSameOrg } from '@/lib/auth/require';
import { audit } from '@/lib/audit/log';
import { syncEncounterForAppointment } from '@/lib/encounters/sync';
import { findProviderConflicts, formatConflictMessage } from '@/lib/scheduling/conflicts';

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

export const declineAppointmentRequest = action({
  schema: z.object({
    requestId: z.string().min(1),
    reason: z.string().max(500).optional(),
  }),
  async handler({ requestId, reason }) {
    const user = await assertPermission('appointments:update');
    if (!user.organizationId) throw new Error('No organization context');

    const req = await db.appointmentRequest.findUnique({ where: { id: requestId } });
    if (!req) throw new Error('Request not found');
    assertSameOrg(user, req);
    if (req.status !== 'PENDING' && req.status !== 'APPROVED') {
      throw new Error('Only pending or approved requests can be declined');
    }

    const updated = await db.appointmentRequest.update({
      where: { id: requestId },
      data: {
        status: 'DECLINED',
        declineReason: reason ?? null,
        handledById: user.id,
        handledAt: new Date(),
      },
    });

    await audit({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'UPDATE',
      resourceType: 'AppointmentRequest',
      resourceId: requestId,
      metadata: { action: 'decline' },
    });

    revalidatePath('/provider/appointment-requests');
    return updated;
  },
});

export const convertAppointmentRequest = action({
  schema: z.object({
    requestId: z.string().min(1),
    startsAt: z.coerce.date(),
    durationMinutes: z.coerce.number().int().min(15).max(180).default(45),
    providerId: z.string().optional().nullable(),
    locationId: z.string().optional().nullable(),
  }),
  async handler(input) {
    const user = await assertPermission('appointments:create');
    if (!user.organizationId) throw new Error('No organization context');

    const req = await db.appointmentRequest.findUnique({ where: { id: input.requestId } });
    if (!req) throw new Error('Request not found');
    assertSameOrg(user, req);
    if (req.status === 'CONVERTED' || req.status === 'DECLINED' || req.status === 'CANCELLED') {
      throw new Error('This request can no longer be converted');
    }
    if (!req.patientId) throw new Error('Request has no linked patient');

    const endsAt = addMinutes(input.startsAt, input.durationMinutes);
    const conflicts = await findProviderConflicts(db, {
      organizationId: user.organizationId,
      providerId: input.providerId ?? null,
      locationId: input.locationId ?? req.locationId,
      startsAt: input.startsAt,
      endsAt,
    });
    if (conflicts.length > 0) {
      throw new Error(formatConflictMessage(conflicts));
    }

    const appt = await db.appointment.create({
      data: {
        organizationId: user.organizationId,
        locationId: input.locationId ?? req.locationId ?? null,
        patientId: req.patientId,
        providerId: input.providerId ?? null,
        type: req.preferredType as AppointmentType,
        status: AppointmentStatus.SCHEDULED,
        startsAt: input.startsAt,
        endsAt,
        durationMinutes: input.durationMinutes,
        reason: 'Converted from online request',
        notes: req.notes,
        source: 'online-request',
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

    const updated = await db.appointmentRequest.update({
      where: { id: req.id },
      data: {
        status: 'CONVERTED',
        appointmentId: appt.id,
        handledById: user.id,
        handledAt: new Date(),
      },
    });

    await audit({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'UPDATE',
      resourceType: 'AppointmentRequest',
      resourceId: req.id,
      metadata: { action: 'convert', appointmentId: appt.id },
    });

    revalidatePath('/provider/appointment-requests');
    revalidatePath('/provider/appointments');
    return { request: updated, appointment: appt };
  },
});
