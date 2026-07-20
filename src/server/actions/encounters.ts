'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { EncounterStatus } from '@prisma/client';
import { db } from '@/lib/db';
import { action } from '@/lib/server-action';
import { assertPermission, assertSameOrg } from '@/lib/auth/require';
import { audit } from '@/lib/audit/log';

const appointmentToEncounter: Partial<Record<string, EncounterStatus>> = {
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

export const getOrCreateEncounter = action({
  schema: z.object({ appointmentId: z.string().min(1) }),
  async handler({ appointmentId }) {
    const user = await assertPermission('appointments:read');
    const appt = await db.appointment.findUnique({
      where: { id: appointmentId },
    });
    if (!appt) throw new Error('Appointment not found');
    assertSameOrg(user, appt);

    const existingEncounter = await db.encounter.findUnique({
      where: { appointmentId: appt.id },
    });
    if (existingEncounter) return existingEncounter;

    const encounter = await db.encounter.create({
      data: {
        organizationId: appt.organizationId,
        locationId: appt.locationId,
        patientId: appt.patientId,
        appointmentId: appt.id,
        providerId: appt.providerId,
        status: appointmentToEncounter[appt.status] ?? 'SCHEDULED',
        createdById: user.id,
      },
    });

    await audit({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'CREATE',
      resourceType: 'Encounter',
      resourceId: encounter.id,
      metadata: { appointmentId },
    });

    revalidatePath('/provider/appointments');
    revalidatePath(`/provider/patients/${appt.patientId}`);
    return encounter;
  },
});

export const advanceEncounterStatus = action({
  schema: z.object({
    encounterId: z.string().min(1),
    status: z.nativeEnum(EncounterStatus),
  }),
  async handler({ encounterId, status }) {
    const user = await assertPermission('appointments:status');
    const encounter = await db.encounter.findUnique({ where: { id: encounterId } });
    if (!encounter) throw new Error('Encounter not found');
    assertSameOrg(user, encounter);

    const timestamps: Record<string, Date> = {};
    if (status === 'CHECKED_IN') timestamps.checkedInAt = new Date();
    if (status === 'IN_PRETEST') timestamps.pretestStartedAt = new Date();
    if (status === 'WITH_PROVIDER') timestamps.providerStartedAt = new Date();
    if (status === 'DOCUMENTATION') timestamps.documentationStartedAt = new Date();
    if (status === 'COMPLETED') timestamps.completedAt = new Date();

    const updated = await db.encounter.update({
      where: { id: encounterId },
      data: { status, ...timestamps },
    });

    await audit({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'UPDATE',
      resourceType: 'Encounter',
      resourceId: encounterId,
      metadata: { status },
    });

    revalidatePath('/provider/appointments');
    return updated;
  },
});
