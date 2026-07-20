'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { MessageChannel, MessageDirection } from '@prisma/client';
import { db } from '@/lib/db';
import { action } from '@/lib/server-action';
import { AuthError } from '@/lib/auth/require';
import { getCurrentUser } from '@/lib/auth/session';
import { audit } from '@/lib/audit/log';

/**
 * Patient-scoped guard for portal server actions. Patients can only
 * act on their own records; this resolves the caller's Patient row
 * and refuses everything else.
 */
async function assertPortalPatient() {
  const user = await getCurrentUser();
  if (!user) throw new AuthError('Not authenticated', 401);
  if (user.role !== 'PATIENT') throw new AuthError('Patient account required', 403);
  if (!user.organizationId) throw new AuthError('No practice linked to this account', 403);

  const patient = await db.patient.findFirst({
    where: { userId: user.id, organizationId: user.organizationId },
    select: { id: true, organizationId: true },
  });
  if (!patient) throw new AuthError('Patient record not found', 403);
  return { user, patientId: patient.id, organizationId: patient.organizationId };
}

// ── Appointment requests ─────────────────────────────────────────

const requestAppointmentSchema = z.object({
  visitType: z.enum([
    'COMPREHENSIVE_EYE_EXAM',
    'CONTACT_LENS_EXAM',
    'MEDICAL_OFFICE_VISIT',
    'DRY_EYE_FOLLOWUP',
    'GLAUCOMA_FOLLOWUP',
    'PEDIATRIC',
  ]),
  preferredDate: z.string().min(1).max(40),
  preferredTime: z.enum(['morning', 'afternoon', 'no_preference']),
  note: z.string().max(1000).optional(),
});

/**
 * Creates a scheduling request the front desk can approve, decline, or
 * convert into a real appointment. Also posts a message for visibility.
 */
export const requestAppointment = action({
  schema: requestAppointmentSchema,
  async handler(input) {
    const { user, patientId, organizationId } = await assertPortalPatient();

    const patient = await db.patient.findUnique({
      where: { id: patientId },
      select: { firstName: true, lastName: true, email: true, phone: true },
    });

    const visitLabel = input.visitType.replace(/_/g, ' ').toLowerCase();
    const timeLabel =
      input.preferredTime === 'no_preference'
        ? 'any time'
        : `the ${input.preferredTime}`;
    const lines = [
      `Appointment request: ${visitLabel}.`,
      `Preferred date: ${input.preferredDate}, ${timeLabel}.`,
    ];
    if (input.note?.trim()) lines.push(`Note from patient: ${input.note.trim()}`);

    const preferredStartsAt = (() => {
      const d = new Date(`${input.preferredDate}T09:00:00`);
      if (input.preferredTime === 'afternoon') d.setHours(14, 0, 0, 0);
      return Number.isNaN(d.getTime()) ? null : d;
    })();

    const request = await db.appointmentRequest.create({
      data: {
        organizationId,
        patientId,
        preferredType: input.visitType,
        preferredStartsAt,
        requesterName:
          [patient?.firstName, patient?.lastName].filter(Boolean).join(' ') ||
          user.email,
        requesterEmail: patient?.email ?? user.email,
        requesterPhone: patient?.phone ?? null,
        notes: lines.join('\n'),
        status: 'PENDING',
      },
    });

    const thread = await db.messageThread.create({
      data: {
        organizationId,
        patientId,
        subject: 'Appointment request',
        category: 'scheduling',
        isInternal: false,
        messages: {
          create: {
            senderId: user.id,
            senderRoleAtSend: user.role,
            channel: MessageChannel.PORTAL,
            direction: MessageDirection.INBOUND,
            body: `${lines.join('\n')}\n\n(Request ID: ${request.id})`,
          },
        },
      },
    });

    await audit({
      organizationId,
      userId: user.id,
      action: 'CREATE',
      resourceType: 'AppointmentRequest',
      resourceId: request.id,
      metadata: { threadId: thread.id },
    });

    revalidatePath('/provider/messages');
    revalidatePath('/provider/appointment-requests');
    revalidatePath('/patient/messages');
    revalidatePath('/patient/book');
    return { requestId: request.id, threadId: thread.id };
  },
});

// ── Patient messaging ────────────────────────────────────────────

const sendMessageSchema = z.object({
  subject: z.string().min(1).max(200),
  body: z.string().min(1).max(4000),
  category: z.enum(['general', 'clinical', 'scheduling', 'billing', 'rx']).default('general'),
});

export const sendPatientMessage = action({
  schema: sendMessageSchema,
  async handler(input) {
    const { user, patientId, organizationId } = await assertPortalPatient();

    const thread = await db.messageThread.create({
      data: {
        organizationId,
        patientId,
        subject: input.subject,
        category: input.category,
        isInternal: false,
        messages: {
          create: {
            senderId: user.id,
            senderRoleAtSend: user.role,
            channel: MessageChannel.PORTAL,
            direction: MessageDirection.INBOUND,
            body: input.body,
          },
        },
      },
    });

    revalidatePath('/provider/messages');
    revalidatePath('/patient/messages');
    return { threadId: thread.id };
  },
});

const replyMessageSchema = z.object({
  threadId: z.string(),
  body: z.string().min(1).max(4000),
});

export const replyPatientMessage = action({
  schema: replyMessageSchema,
  async handler({ threadId, body }) {
    const { user, patientId } = await assertPortalPatient();

    const thread = await db.messageThread.findUnique({ where: { id: threadId } });
    if (!thread || thread.patientId !== patientId || thread.isInternal) {
      throw new AuthError('Conversation not found', 404);
    }

    const message = await db.message.create({
      data: {
        threadId,
        senderId: user.id,
        senderRoleAtSend: user.role,
        channel: MessageChannel.PORTAL,
        direction: MessageDirection.INBOUND,
        body,
      },
    });
    await db.messageThread.update({ where: { id: threadId }, data: { updatedAt: new Date() } });

    revalidatePath('/provider/messages');
    revalidatePath('/patient/messages');
    return { messageId: message.id };
  },
});

// ── Intake forms ─────────────────────────────────────────────────

const completeFormSchema = z.object({
  formId: z.string(),
  responses: z.record(z.string(), z.string().max(2000)).optional(),
  acknowledged: z.literal(true),
});

export const completePatientForm = action({
  schema: completeFormSchema,
  async handler({ formId, responses }) {
    const { user, patientId, organizationId } = await assertPortalPatient();

    const form = await db.patientForm.findUnique({ where: { id: formId } });
    if (!form || form.patientId !== patientId) {
      throw new AuthError('Form not found', 404);
    }
    if (form.status === 'COMPLETED') {
      return { formId: form.id };
    }

    await db.patientForm.update({
      where: { id: formId },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        responses: responses ?? {},
      },
    });

    await audit({
      organizationId,
      userId: user.id,
      action: 'UPDATE',
      resourceType: 'PatientForm',
      resourceId: formId,
    });

    revalidatePath('/patient/forms');
    revalidatePath('/patient/home');
    return { formId: form.id };
  },
});

// ── Profile contact updates ──────────────────────────────────────

const updateContactSchema = z.object({
  phone: z.string().max(30).optional(),
  email: z.string().email().max(200).optional(),
  addressLine1: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  region: z.string().max(100).optional(),
  postalCode: z.string().max(20).optional(),
});

export const updatePatientContact = action({
  schema: updateContactSchema,
  async handler(input) {
    const { user, patientId, organizationId } = await assertPortalPatient();

    await db.patient.update({
      where: { id: patientId },
      data: {
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.email !== undefined ? { email: input.email } : {}),
        ...(input.addressLine1 !== undefined ? { addressLine1: input.addressLine1 } : {}),
        ...(input.city !== undefined ? { city: input.city } : {}),
        ...(input.region !== undefined ? { region: input.region } : {}),
        ...(input.postalCode !== undefined ? { postalCode: input.postalCode } : {}),
      },
    });

    await audit({
      organizationId,
      userId: user.id,
      action: 'UPDATE',
      resourceType: 'Patient',
      resourceId: patientId,
    });

    revalidatePath('/patient/profile');
    return { ok: true };
  },
});
