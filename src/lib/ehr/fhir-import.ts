import 'server-only';
import { db } from '@/lib/db';

type FhirPatient = {
  resourceType?: string;
  id?: string;
  name?: { family?: string; given?: string[] }[];
  birthDate?: string;
  telecom?: { system?: string; value?: string }[];
  identifier?: { value?: string }[];
};

export async function importFhirPatients(args: {
  organizationId: string;
  integrationId: string;
  bundle: { entry?: { resource: FhirPatient }[] };
}): Promise<number> {
  const entries = args.bundle.entry ?? [];
  let imported = 0;

  for (const entry of entries) {
    const resource = entry.resource;
    if (!resource || resource.resourceType !== 'Patient') continue;

    const name = resource.name?.[0];
    const firstName = name?.given?.[0] ?? 'Unknown';
    const lastName = name?.family ?? 'Patient';
    const email = resource.telecom?.find((t) => t.system === 'email')?.value;
    const phone = resource.telecom?.find((t) => t.system === 'phone')?.value;
    const externalId = resource.id ?? resource.identifier?.[0]?.value;
    const dob = resource.birthDate ? new Date(resource.birthDate) : new Date('1980-01-01');

    if (!externalId) continue;

    const existing = await db.patient.findFirst({
      where: { organizationId: args.organizationId, externalId },
    });
    if (existing) continue;

    await db.patient.create({
      data: {
        organizationId: args.organizationId,
        externalId,
        firstName,
        lastName,
        dateOfBirth: dob,
        email: email ?? null,
        phone: phone ?? null,
      },
    });
    imported++;
  }

  return imported;
}
