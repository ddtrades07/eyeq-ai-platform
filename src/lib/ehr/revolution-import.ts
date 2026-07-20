import 'server-only';
import { db } from '@/lib/db';
import type { RevolutionEhrPatient } from './types';

export async function importRevolutionPatients(args: {
  organizationId: string;
  envelope: { patients?: RevolutionEhrPatient[] };
}): Promise<number> {
  const patients = args.envelope.patients ?? [];
  let imported = 0;

  for (const p of patients) {
    const externalId = String(p.id ?? p.patientId ?? '');
    if (!externalId) continue;

    const existing = await db.patient.findFirst({
      where: { organizationId: args.organizationId, externalId },
    });
    if (existing) continue;

    await db.patient.create({
      data: {
        organizationId: args.organizationId,
        externalId,
        firstName: p.firstName ?? p.first_name ?? 'Unknown',
        lastName: p.lastName ?? p.last_name ?? 'Patient',
        dateOfBirth:
          p.dateOfBirth || p.date_of_birth
            ? new Date(p.dateOfBirth ?? p.date_of_birth!)
            : new Date('1980-01-01'),
        email: p.email ?? null,
        phone: p.phone ?? p.mobilePhone ?? null,
      },
    });
    imported++;
  }

  return imported;
}
