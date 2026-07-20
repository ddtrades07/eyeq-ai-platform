'use server';

import { z } from 'zod';
import { db } from '@/lib/db';
import { action } from '@/lib/server-action';
import { assertPermission, assertSameOrg } from '@/lib/auth/require';

export type DuplicateCandidate = {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: Date;
  phone: string | null;
  email: string | null;
  externalId: string | null;
  matchReasons: string[];
};

function normalizePhone(phone: string | null | undefined): string {
  return (phone ?? '').replace(/\D/g, '');
}

function normalizeEmail(email: string | null | undefined): string {
  return (email ?? '').trim().toLowerCase();
}

export const findPatientDuplicates = action({
  schema: z.object({ patientId: z.string().optional() }),
  async handler({ patientId }) {
    const user = await assertPermission('patients:read');
    if (!user.organizationId) throw new Error('No organization context');

    const patients = await db.patient.findMany({
      where: { organizationId: user.organizationId, archivedAt: null },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        phone: true,
        email: true,
        externalId: true,
      },
      take: 5000,
    });

    const groups = new Map<string, typeof patients>();

    for (const p of patients) {
      const keys: string[] = [];
      const phone = normalizePhone(p.phone);
      const email = normalizeEmail(p.email);
      const dobKey = p.dateOfBirth.toISOString().slice(0, 10);
      const nameKey = `${p.lastName.trim().toLowerCase()}|${dobKey}`;

      if (phone.length >= 10) keys.push(`phone:${phone}`);
      if (email) keys.push(`email:${email}`);
      keys.push(`nameDob:${nameKey}`);
      if (p.externalId?.trim()) keys.push(`ext:${p.externalId.trim().toLowerCase()}`);

      for (const key of keys) {
        const list = groups.get(key) ?? [];
        list.push(p);
        groups.set(key, list);
      }
    }

    const duplicateSets = new Map<string, DuplicateCandidate[]>();

    for (const [, group] of groups) {
      if (group.length < 2) continue;
      const unique = [...new Map(group.map((p) => [p.id, p])).values()];
      if (unique.length < 2) continue;

      for (const p of unique) {
        const reasons: string[] = [];
        for (const other of unique) {
          if (other.id === p.id) continue;
          const phone = normalizePhone(p.phone);
          const otherPhone = normalizePhone(other.phone);
          if (phone && phone === otherPhone) reasons.push('Same phone number');
          const email = normalizeEmail(p.email);
          const otherEmail = normalizeEmail(other.email);
          if (email && email === otherEmail) reasons.push('Same email');
          if (
            p.dateOfBirth.getTime() === other.dateOfBirth.getTime() &&
            p.lastName.trim().toLowerCase() === other.lastName.trim().toLowerCase()
          ) {
            reasons.push('Same last name and date of birth');
          }
          if (p.externalId && other.externalId && p.externalId === other.externalId) {
            reasons.push('Same external / legacy ID');
          }
        }
        if (reasons.length === 0) continue;

        const existing = duplicateSets.get(p.id) ?? [];
        const mergedReasons = [...new Set([...existing.flatMap((e) => e.matchReasons), ...reasons])];
        duplicateSets.set(p.id, [
          {
            ...p,
            matchReasons: mergedReasons,
          },
        ]);
      }
    }

    const results = [...duplicateSets.values()].map((arr) => arr[0]);

    if (patientId) {
      const patient = await db.patient.findUnique({ where: { id: patientId } });
      if (!patient) throw new Error('Patient not found');
      assertSameOrg(user, patient);

      const matches = results.filter((r) => r.id !== patientId);
      const relatedIds = new Set<string>();
      for (const [, group] of groups) {
        if (!group.some((g) => g.id === patientId)) continue;
        for (const g of group) {
          if (g.id !== patientId) relatedIds.add(g.id);
        }
      }

      const forPatient = patients
        .filter((p) => relatedIds.has(p.id))
        .map((p) => {
          const found = results.find((r) => r.id === p.id);
          return (
            found ?? {
              ...p,
              matchReasons: ['Potential duplicate'],
            }
          );
        });

      return { duplicates: forPatient };
    }

    return { duplicates: results };
  },
});
