'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { PrescriptionStatus, PrescriptionType } from '@prisma/client';
import { db } from '@/lib/db';
import { action } from '@/lib/server-action';
import { assertPermission, assertSameOrg } from '@/lib/auth/require';
import { audit } from '@/lib/audit/log';

const eye = z.string().max(40).optional().nullable();

const createRxSchema = z.object({
  patientId: z.string(),
  type: z.nativeEnum(PrescriptionType),
  issuedAt: z.coerce.date().optional(),
  expiresAt: z.coerce.date(),
  providerName: z.string().max(120).optional().nullable(),
  odSphere: eye,
  odCyl: eye,
  odAxis: eye,
  odAdd: eye,
  osSphere: eye,
  osCyl: eye,
  osAxis: eye,
  osAdd: eye,
  pd: eye,
  modality: z.string().max(40).optional().nullable(),
  odBrand: eye,
  odBc: eye,
  odDia: eye,
  odPower: eye,
  osBrand: eye,
  osBc: eye,
  osDia: eye,
  osPower: eye,
  notes: z.string().max(2000).optional().nullable(),
  submitForSign: z.boolean().optional(),
});

export const createPrescription = action({
  schema: createRxSchema,
  async handler(input) {
    const user = await assertPermission('rx:write');
    if (!user.organizationId) throw new Error('No organization context');

    const patient = await db.patient.findUnique({ where: { id: input.patientId } });
    if (!patient) throw new Error('Patient not found');
    assertSameOrg(user, patient);

    const rx = await db.prescription.create({
      data: {
        organizationId: user.organizationId,
        patientId: input.patientId,
        type: input.type,
        status: PrescriptionStatus.DRAFT,
        issuedAt: input.issuedAt ?? new Date(),
        expiresAt: input.expiresAt,
        providerName: input.providerName ?? null,
        odSphere: input.odSphere ?? null,
        odCyl: input.odCyl ?? null,
        odAxis: input.odAxis ?? null,
        odAdd: input.odAdd ?? null,
        osSphere: input.osSphere ?? null,
        osCyl: input.osCyl ?? null,
        osAxis: input.osAxis ?? null,
        osAdd: input.osAdd ?? null,
        pd: input.pd ?? null,
        modality: input.modality ?? null,
        odBrand: input.odBrand ?? null,
        odBc: input.odBc ?? null,
        odDia: input.odDia ?? null,
        odPower: input.odPower ?? null,
        osBrand: input.osBrand ?? null,
        osBc: input.osBc ?? null,
        osDia: input.osDia ?? null,
        osPower: input.osPower ?? null,
        notes: input.notes ?? null,
      },
    });

    await audit({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'CREATE',
      resourceType: 'Prescription',
      resourceId: rx.id,
      metadata: { status: rx.status },
    });

    revalidatePath(`/provider/patients/${input.patientId}`);
    return rx;
  },
});

export const signPrescription = action({
  schema: z.object({ id: z.string() }),
  async handler({ id }) {
    const user = await assertPermission('notes:sign');
    if (!user.organizationId) throw new Error('No organization context');

    const existing = await db.prescription.findUnique({ where: { id } });
    if (!existing) throw new Error('Prescription not found');
    assertSameOrg(user, existing);
    if (existing.archivedAt || existing.status === PrescriptionStatus.ARCHIVED) {
      throw new Error('Archived prescriptions cannot be signed');
    }
    if (existing.status === PrescriptionStatus.ACTIVE && existing.signedAt) {
      throw new Error('Prescription is already signed');
    }

    const fromUser = [user.firstName, user.lastName].filter(Boolean).join(' ');
    const displayName = existing.providerName || fromUser || user.email;

    const updated = await db.prescription.update({
      where: { id },
      data: {
        status: PrescriptionStatus.ACTIVE,
        signedAt: new Date(),
        signedById: user.id,
        providerName: displayName,
      },
    });

    await audit({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'SIGN_OFF',
      resourceType: 'Prescription',
      resourceId: id,
    });

    revalidatePath(`/provider/patients/${existing.patientId}`);
    return updated;
  },
});

export const archivePrescription = action({
  schema: z.object({ id: z.string() }),
  async handler({ id }) {
    const user = await assertPermission('rx:write');
    if (!user.organizationId) throw new Error('No organization context');

    const existing = await db.prescription.findUnique({ where: { id } });
    if (!existing) throw new Error('Prescription not found');
    assertSameOrg(user, existing);

    const updated = await db.prescription.update({
      where: { id },
      data: { archivedAt: new Date(), status: PrescriptionStatus.ARCHIVED },
    });

    await audit({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'DELETE',
      resourceType: 'Prescription',
      resourceId: id,
    });

    revalidatePath(`/provider/patients/${existing.patientId}`);
    return updated;
  },
});
