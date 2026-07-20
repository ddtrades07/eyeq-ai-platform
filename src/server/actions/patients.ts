'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/lib/db';
import { action } from '@/lib/server-action';
import { assertPermission, assertSameOrg } from '@/lib/auth/require';
import { audit } from '@/lib/audit/log';
import { patientCreateSchema, patientUpdateSchema } from '@/lib/zod/patient';

function emptyToNull<T>(v: T | '' | null | undefined): T | null {
  return v === '' || v === undefined ? null : (v as T | null);
}

export const createPatient = action({
  schema: patientCreateSchema,
  async handler(input) {
    const user = await assertPermission('patients:create');
    if (!user.organizationId) throw new Error('No organization context');

    const patient = await db.patient.create({
      data: {
        organizationId: user.organizationId,
        firstName: input.firstName,
        lastName: input.lastName,
        dateOfBirth: input.dateOfBirth,
        email: emptyToNull(input.email),
        phone: emptyToNull(input.phone),
        addressLine1: emptyToNull(input.addressLine1),
        city: emptyToNull(input.city),
        region: emptyToNull(input.region),
        postalCode: emptyToNull(input.postalCode),
        insuranceCarrier: emptyToNull(input.insuranceCarrier),
        insuranceMemberId: emptyToNull(input.insuranceMemberId),
        preferredLanguage: input.preferredLanguage,
        hasDiabetes: input.hasDiabetes,
        hasHypertension: input.hasHypertension,
        hasGlaucomaPersonal: input.hasGlaucomaPersonal,
        hasGlaucomaFamily: input.hasGlaucomaFamily,
        isSmoker: input.isSmoker,
        notes: emptyToNull(input.notes),
      },
    });

    await audit({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'CREATE',
      resourceType: 'Patient',
      resourceId: patient.id,
    });

    revalidatePath('/provider/patients');
    return patient;
  },
});

export const updatePatient = action({
  schema: patientUpdateSchema,
  async handler(input) {
    const user = await assertPermission('patients:update');
    if (!user.organizationId) throw new Error('No organization context');

    const existing = await db.patient.findUnique({ where: { id: input.id } });
    if (!existing) throw new Error('Patient not found');
    assertSameOrg(user, existing);

    const { id, ...rest } = input;
    const data: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(rest)) {
      if (v === undefined) continue;
      data[k] = v === '' ? null : v;
    }

    const updated = await db.patient.update({ where: { id }, data });

    await audit({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'UPDATE',
      resourceType: 'Patient',
      resourceId: updated.id,
    });

    revalidatePath('/provider/patients');
    revalidatePath(`/provider/patients/${updated.id}`);
    return updated;
  },
});

export const archivePatient = action({
  schema: z.object({ id: z.string() }),
  async handler({ id }) {
    const user = await assertPermission('patients:delete');
    if (!user.organizationId) throw new Error('No organization context');
    const existing = await db.patient.findUnique({ where: { id } });
    if (!existing) throw new Error('Patient not found');
    assertSameOrg(user, existing);

    const updated = await db.patient.update({
      where: { id },
      data: { archivedAt: new Date() },
    });

    await audit({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'DELETE',
      resourceType: 'Patient',
      resourceId: id,
    });

    revalidatePath('/provider/patients');
    return updated;
  },
});

/**
 * Fast patient search by name, email, phone, or DOB.
 * Returns up to 10 results for the command bar / global search.
 */
export const searchPatients = action({
  schema: z.object({ query: z.string().min(1).max(200) }),
  async handler(input) {
    const user = await assertPermission('patients:read');
    if (!user.organizationId) throw new Error('No organization context');

    const q = input.query.trim();
    const orConditions: Array<Record<string, unknown>> = [
      { firstName: { contains: q, mode: 'insensitive' } },
      { lastName: { contains: q, mode: 'insensitive' } },
      { email: { contains: q, mode: 'insensitive' } },
      { phone: { contains: q, mode: 'insensitive' } },
    ];

    // Full name: "Jane Doe"
    const parts = q.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      orConditions.push({
        AND: [
          { firstName: { contains: parts[0], mode: 'insensitive' } },
          { lastName: { contains: parts.slice(1).join(' '), mode: 'insensitive' } },
        ],
      });
    }

    // Patient / chart id (internal id prefix match)
    if (q.length >= 6) {
      orConditions.push({ id: { startsWith: q, mode: 'insensitive' } });
    }

    // DOB: MM/DD/YYYY, YYYY-MM-DD, or partial year
    const dobParsed = parseSearchDate(q);
    if (dobParsed) {
      const next = new Date(dobParsed);
      next.setDate(next.getDate() + 1);
      orConditions.push({
        dateOfBirth: { gte: dobParsed, lt: next },
      });
    }

    const patients = await db.patient.findMany({
      where: {
        organizationId: user.organizationId,
        archivedAt: null,
        OR: orConditions as never,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        email: true,
        phone: true,
      },
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
      take: 10,
    });

    return patients;
  },
});

function parseSearchDate(q: string): Date | null {
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(q);
  if (iso) {
    const d = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const us = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/.exec(q);
  if (us) {
    let year = Number(us[3]);
    if (year < 100) year += 2000;
    const d = new Date(year, Number(us[1]) - 1, Number(us[2]));
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return null;
}
