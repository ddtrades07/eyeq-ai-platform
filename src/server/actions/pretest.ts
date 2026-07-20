'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { AppointmentStatus } from '@prisma/client';
import { db } from '@/lib/db';
import { action } from '@/lib/server-action';
import { assertPermission, assertSameOrg } from '@/lib/auth/require';
import { syncEncounterForAppointment } from '@/lib/encounters/sync';
import { createClinicalNote } from '@/server/actions/notes';

const pretestSchema = z.object({
  appointmentId: z.string(),
  patientId: z.string(),
  chiefComplaint: z.string().max(500).optional().nullable(),
  subjective: z.string().max(8000).optional().nullable(),
  objective: z.string().max(8000).optional().nullable(),
});

/** Saves pretest note, advances appointment to IN_PRETEST, syncs encounter. */
export const savePretestIntake = action({
  schema: pretestSchema,
  async handler(input) {
    const user = await assertPermission('notes:write');
    if (!user.organizationId) throw new Error('No organization context');

    const [patient, appointment] = await Promise.all([
      db.patient.findUnique({ where: { id: input.patientId } }),
      db.appointment.findUnique({ where: { id: input.appointmentId } }),
    ]);
    if (!patient) throw new Error('Patient not found');
    if (!appointment) throw new Error('Appointment not found');
    assertSameOrg(user, patient);
    assertSameOrg(user, appointment);
    if (appointment.patientId !== patient.id) {
      throw new Error('Appointment does not belong to this patient');
    }

    const noteResult = await createClinicalNote({
      patientId: input.patientId,
      appointmentId: input.appointmentId,
      type: 'Pretest',
      chiefComplaint: input.chiefComplaint ?? null,
      subjective: input.subjective ?? null,
      objective: input.objective ?? null,
      assessment: null,
      plan: null,
    });
    if (!noteResult.ok) {
      throw new Error(noteResult.error ?? 'Failed to save pretest note');
    }

    const advanceStatuses: AppointmentStatus[] = [
      AppointmentStatus.SCHEDULED,
      AppointmentStatus.CONFIRMED,
      AppointmentStatus.CHECKED_IN,
    ];
    let status = appointment.status;
    if (advanceStatuses.includes(appointment.status)) {
      const updated = await db.appointment.update({
        where: { id: appointment.id },
        data: { status: AppointmentStatus.IN_PRETEST },
      });
      status = updated.status;
    }

    await syncEncounterForAppointment({
      appointmentId: appointment.id,
      organizationId: appointment.organizationId,
      patientId: appointment.patientId,
      locationId: appointment.locationId,
      providerId: appointment.providerId,
      status,
      createdById: user.id,
    });

    revalidatePath('/provider/pre-charting');
    revalidatePath('/provider/appointments');
    revalidatePath(`/provider/patients/${input.patientId}`);
    return { noteId: noteResult.data?.id };
  },
});
