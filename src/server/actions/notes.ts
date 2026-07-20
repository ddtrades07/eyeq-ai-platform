'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { ClinicalNoteStatus } from '@prisma/client';
import { db } from '@/lib/db';
import { action } from '@/lib/server-action';
import { assertPermission, assertSameOrg } from '@/lib/auth/require';
import { audit } from '@/lib/audit/log';

const createNoteSchema = z.object({
  patientId: z.string(),
  appointmentId: z.string().optional().nullable(),
  encounterId: z.string().optional().nullable(),
  type: z.string().min(2).max(120),
  chiefComplaint: z.string().max(500).optional().nullable(),
  subjective: z.string().max(8000).optional().nullable(),
  objective: z.string().max(8000).optional().nullable(),
  assessment: z.string().max(8000).optional().nullable(),
  plan: z.string().max(8000).optional().nullable(),
  diagnosis: z.string().max(2000).optional().nullable(),
  followUp: z.string().max(2000).optional().nullable(),
  patientInstructions: z.string().max(4000).optional().nullable(),
});

const updateNoteSchema = z.object({
  id: z.string(),
  type: z.string().min(2).max(120).optional(),
  chiefComplaint: z.string().max(500).optional().nullable(),
  subjective: z.string().max(8000).optional().nullable(),
  objective: z.string().max(8000).optional().nullable(),
  assessment: z.string().max(8000).optional().nullable(),
  plan: z.string().max(8000).optional().nullable(),
  diagnosis: z.string().max(2000).optional().nullable(),
  followUp: z.string().max(2000).optional().nullable(),
  patientInstructions: z.string().max(4000).optional().nullable(),
});

function buildExtras(input: {
  diagnosis?: string | null;
  followUp?: string | null;
  patientInstructions?: string | null;
}) {
  return [
    input.diagnosis ? `Diagnosis: ${input.diagnosis}` : null,
    input.followUp ? `Follow-up: ${input.followUp}` : null,
    input.patientInstructions ? `Patient instructions: ${input.patientInstructions}` : null,
  ]
    .filter(Boolean)
    .join('\n');
}

export const createClinicalNote = action({
  schema: createNoteSchema,
  async handler(input) {
    const user = await assertPermission('notes:write');
    if (!user.organizationId) throw new Error('No organization context');

    const patient = await db.patient.findUnique({ where: { id: input.patientId } });
    if (!patient) throw new Error('Patient not found');
    assertSameOrg(user, patient);

    const extras = buildExtras(input);

    const note = await db.clinicalNote.create({
      data: {
        organizationId: user.organizationId,
        patientId: input.patientId,
        appointmentId: input.appointmentId ?? null,
        authorId: user.id,
        type: input.type,
        chiefComplaint: input.chiefComplaint ?? null,
        subjective: input.subjective ?? null,
        objective: input.objective ?? null,
        assessment: input.assessment ?? null,
        plan: input.plan ?? null,
        legacySummary: extras || null,
        status: ClinicalNoteStatus.DRAFT,
      },
    });

    await audit({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'CREATE',
      resourceType: 'ClinicalNote',
      resourceId: note.id,
      metadata: { encounterId: input.encounterId ?? null },
    });

    revalidatePath(`/provider/patients/${input.patientId}`);
    return note;
  },
});

export const updateClinicalNote = action({
  schema: updateNoteSchema,
  async handler(input) {
    const user = await assertPermission('notes:write');
    if (!user.organizationId) throw new Error('No organization context');

    const note = await db.clinicalNote.findUnique({ where: { id: input.id } });
    if (!note) throw new Error('Clinical note not found');
    assertSameOrg(user, note);

    if (
      note.status === ClinicalNoteStatus.SIGNED ||
      note.status === ClinicalNoteStatus.AMENDED
    ) {
      throw new Error('Signed notes cannot be edited. Create an amendment instead.');
    }

    const extras = buildExtras(input);

    const updated = await db.clinicalNote.update({
      where: { id: input.id },
      data: {
        ...(input.type !== undefined ? { type: input.type } : {}),
        ...(input.chiefComplaint !== undefined ? { chiefComplaint: input.chiefComplaint } : {}),
        ...(input.subjective !== undefined ? { subjective: input.subjective } : {}),
        ...(input.objective !== undefined ? { objective: input.objective } : {}),
        ...(input.assessment !== undefined ? { assessment: input.assessment } : {}),
        ...(input.plan !== undefined ? { plan: input.plan } : {}),
        ...(extras ? { legacySummary: extras } : {}),
      },
    });

    await audit({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'UPDATE',
      resourceType: 'ClinicalNote',
      resourceId: input.id,
      metadata: { action: 'edit_draft' },
    });

    revalidatePath(`/provider/patients/${note.patientId}`);
    return updated;
  },
});

export const submitClinicalNoteForReview = action({
  schema: z.object({ id: z.string() }),
  async handler({ id }) {
    const user = await assertPermission('notes:write');
    if (!user.organizationId) throw new Error('No organization context');

    const note = await db.clinicalNote.findUnique({ where: { id } });
    if (!note) throw new Error('Clinical note not found');
    assertSameOrg(user, note);
    if (note.status !== ClinicalNoteStatus.DRAFT) {
      throw new Error('Only draft notes can be submitted for review');
    }

    const updated = await db.clinicalNote.update({
      where: { id },
      data: { status: ClinicalNoteStatus.AWAITING_SIGNOFF },
    });

    await audit({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'UPDATE',
      resourceType: 'ClinicalNote',
      resourceId: id,
      metadata: { action: 'submit_for_review' },
    });

    revalidatePath(`/provider/patients/${note.patientId}`);
    return updated;
  },
});

export const signClinicalNote = action({
  schema: z.object({ id: z.string() }),
  async handler({ id }) {
    const user = await assertPermission('notes:sign');
    if (!user.organizationId) throw new Error('No organization context');

    const note = await db.clinicalNote.findUnique({ where: { id } });
    if (!note) throw new Error('Clinical note not found');
    assertSameOrg(user, note);

    if (note.status === ClinicalNoteStatus.SIGNED) {
      throw new Error('Note is already signed');
    }

    const updated = await db.clinicalNote.update({
      where: { id },
      data: {
        status: ClinicalNoteStatus.SIGNED,
        signedById: user.id,
        signedAt: new Date(),
      },
    });

    await audit({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'SIGN_OFF',
      resourceType: 'ClinicalNote',
      resourceId: id,
    });

    revalidatePath(`/provider/patients/${note.patientId}`);
    return updated;
  },
});

export const amendClinicalNote = action({
  schema: z.object({
    id: z.string(),
    subjective: z.string().max(8000).optional().nullable(),
    objective: z.string().max(8000).optional().nullable(),
    assessment: z.string().max(8000).optional().nullable(),
    plan: z.string().max(8000).optional().nullable(),
    reason: z.string().max(2000).optional(),
  }),
  async handler(input) {
    const user = await assertPermission('notes:sign');
    if (!user.organizationId) throw new Error('No organization context');

    const original = await db.clinicalNote.findUnique({ where: { id: input.id } });
    if (!original) throw new Error('Clinical note not found');
    assertSameOrg(user, original);
    if (original.status !== ClinicalNoteStatus.SIGNED) {
      throw new Error('Only signed notes can be amended');
    }

    const amendment = await db.$transaction(async (tx) => {
      await tx.clinicalNote.update({
        where: { id: original.id },
        data: { status: ClinicalNoteStatus.AMENDED },
      });

      return tx.clinicalNote.create({
        data: {
          organizationId: user.organizationId!,
          patientId: original.patientId,
          appointmentId: original.appointmentId,
          authorId: user.id,
          type: `${original.type} (Amendment)`,
          chiefComplaint: original.chiefComplaint,
          subjective: input.subjective ?? original.subjective,
          objective: input.objective ?? original.objective,
          assessment: input.assessment ?? original.assessment,
          plan: input.plan ?? original.plan,
          status: ClinicalNoteStatus.SIGNED,
          signedById: user.id,
          signedAt: new Date(),
          amendedFromId: original.id,
          legacySummary: input.reason
            ? `Amendment: ${input.reason}`
            : 'Amendment to signed note',
        },
      });
    });

    await audit({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'CREATE',
      resourceType: 'ClinicalNote',
      resourceId: amendment.id,
      metadata: { amendedFromId: original.id, action: 'amend' },
    });

    revalidatePath(`/provider/patients/${original.patientId}`);
    return amendment;
  },
});
