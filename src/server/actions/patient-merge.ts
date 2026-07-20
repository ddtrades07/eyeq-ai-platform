'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { action } from '@/lib/server-action';
import { assertPermission, assertSameOrg } from '@/lib/auth/require';
import { audit } from '@/lib/audit/log';
import {
  MERGEABLE_FIELDS,
  buildSurvivingPatch,
  computeMergeFieldConflicts,
  type MergeableField,
} from '@/lib/patients/merge';

const fieldSelectionSchema = z.record(
  z.string(),
  z.enum(['surviving', 'merged']),
);

/** Relations that carry patientId and must be re-pointed to the surviving record. */
const RELATION_MODELS = [
  'appointment',
  'imagingCase',
  'clinicalNote',
  'prescription',
  'careGap',
  'messageThread',
  'document',
  'ambientScribeSession',
  'patientInvoice',
  'patientForm',
  'encounter',
  'staffTask',
  'examChart',
  'claim',
  'patientStatement',
  'opticalOrder',
] as const;

export const previewPatientMerge = action({
  schema: z.object({ survivingId: z.string(), mergedId: z.string() }),
  async handler({ survivingId, mergedId }) {
    const user = await assertPermission('patients:merge');
    if (!user.organizationId) throw new Error('No organization context');
    if (survivingId === mergedId) throw new Error('Choose two different patients');

    const [surviving, merged] = await Promise.all([
      db.patient.findUnique({ where: { id: survivingId } }),
      db.patient.findUnique({ where: { id: mergedId } }),
    ]);
    if (!surviving || !merged) throw new Error('Patient not found');
    assertSameOrg(user, surviving);
    assertSameOrg(user, merged);
    if (merged.mergedIntoId) throw new Error('Source patient is already merged');

    const conflicts = computeMergeFieldConflicts(surviving, merged);

    return {
      surviving: { id: surviving.id, firstName: surviving.firstName, lastName: surviving.lastName },
      merged: { id: merged.id, firstName: merged.firstName, lastName: merged.lastName },
      fields: conflicts,
    };
  },
});

export const mergePatients = action({
  schema: z.object({
    survivingId: z.string(),
    mergedId: z.string(),
    fieldSelections: fieldSelectionSchema.optional(),
  }),
  async handler({ survivingId, mergedId, fieldSelections }) {
    const user = await assertPermission('patients:merge');
    if (!user.organizationId) throw new Error('No organization context');
    if (survivingId === mergedId) throw new Error('Choose two different patients');
    const organizationId = user.organizationId;

    const [surviving, merged] = await Promise.all([
      db.patient.findUnique({ where: { id: survivingId } }),
      db.patient.findUnique({ where: { id: mergedId } }),
    ]);
    if (!surviving || !merged) throw new Error('Patient not found');
    assertSameOrg(user, surviving);
    assertSameOrg(user, merged);
    if (merged.mergedIntoId) throw new Error('Source patient is already merged');

    const selections = fieldSelections ?? {};
    const survivingUpdates = buildSurvivingPatch(merged, selections as Partial<Record<MergeableField, 'surviving' | 'merged'>>);

    const movedCounts: Record<string, number> = {};

    const result = await db.$transaction(async (tx) => {
      for (const model of RELATION_MODELS) {
        const delegate = (tx as any)[model];
        if (!delegate?.updateMany) continue;
        const res = await delegate.updateMany({
          where: { patientId: mergedId },
          data: { patientId: survivingId },
        });
        if (res.count > 0) movedCounts[model] = res.count;
      }

      if (Object.keys(survivingUpdates).length > 0) {
        await tx.patient.update({ where: { id: survivingId }, data: survivingUpdates });
      }

      await tx.patient.update({
        where: { id: mergedId },
        data: { mergedIntoId: survivingId, archivedAt: new Date() },
      });

      return tx.patientMergeRecord.create({
        data: {
          organizationId,
          survivingPatientId: survivingId,
          mergedPatientId: mergedId,
          fieldSelections: selections as Prisma.InputJsonValue,
          mergedSnapshot: serializePatient(merged),
          movedCounts: movedCounts as Prisma.InputJsonValue,
          mergedById: user.id,
        },
      });
    });

    await audit({
      organizationId,
      userId: user.id,
      action: 'UPDATE',
      resourceType: 'PatientMerge',
      resourceId: result.id,
      metadata: { survivingId, mergedId, movedCounts },
    });

    revalidatePath('/provider/patients');
    revalidatePath(`/provider/patients/${survivingId}`);
    return { mergeRecordId: result.id, movedCounts };
  },
});

export const unmergePatients = action({
  schema: z.object({ mergeRecordId: z.string() }),
  async handler({ mergeRecordId }) {
    const user = await assertPermission('patients:merge');
    if (!user.organizationId) throw new Error('No organization context');

    const record = await db.patientMergeRecord.findUnique({ where: { id: mergeRecordId } });
    if (!record) throw new Error('Merge record not found');
    assertSameOrg(user, record);
    if (record.reversedAt) throw new Error('This merge was already reversed');

    // Reversal restores the merged patient's active status. Records moved
    // during merge stay with the surviving patient because they cannot be
    // deterministically re-attributed; this is documented for the admin.
    await db.$transaction(async (tx) => {
      await tx.patient.update({
        where: { id: record.mergedPatientId },
        data: { mergedIntoId: null, archivedAt: null },
      });
      await tx.patientMergeRecord.update({
        where: { id: mergeRecordId },
        data: { reversedAt: new Date(), reversedById: user.id },
      });
    });

    await audit({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'UPDATE',
      resourceType: 'PatientMerge',
      resourceId: mergeRecordId,
      metadata: { reversed: true },
    });

    revalidatePath('/provider/patients');
    return { reversed: true };
  },
});

function serializePatient(patient: Record<string, unknown>): Prisma.InputJsonValue {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patient)) {
    out[key] = value instanceof Date ? value.toISOString() : value;
  }
  return out as Prisma.InputJsonValue;
}
