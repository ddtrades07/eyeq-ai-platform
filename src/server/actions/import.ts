'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/lib/db';
import { action } from '@/lib/server-action';
import { assertPermission } from '@/lib/auth/require';
import { audit } from '@/lib/audit/log';
import { DEMO_ORG_SLUG } from '@/lib/demo/constants';
import { isProductionApp } from '@/lib/production/mode';
import { assertPilotAllowsImport } from '@/lib/production/controlled-pilot';

const patientRowSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  dateOfBirth: z.string().min(8),
  email: z.string().email().optional().or(z.literal('')),
  phone: z.string().optional(),
  externalId: z.string().optional(),
});

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
      continue;
    }
    current += ch;
  }
  result.push(current.trim());
  return result;
}

function parseCsv(content: string): Record<string, string>[] {
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, '_'));
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = values[i] ?? '';
    });
    return row;
  });
}

function mapRow(row: Record<string, string>) {
  return patientRowSchema.parse({
    firstName: row.first_name ?? row.firstname ?? row['first name'] ?? '',
    lastName: row.last_name ?? row.lastname ?? row['last name'] ?? '',
    dateOfBirth: row.date_of_birth ?? row.dob ?? row.dateofbirth ?? '',
    email: row.email || undefined,
    phone: row.phone || undefined,
    externalId: row.mrn ?? row.external_id ?? row.externalid ?? undefined,
  });
}

export type ImportRowResult = {
  row: number;
  ok: boolean;
  status: 'valid' | 'invalid' | 'duplicate' | 'would_create' | 'created' | 'skipped';
  name?: string;
  error?: string;
  matchType?: 'externalId' | 'name_dob';
};

export const previewPatientImport = action({
  schema: z.object({ csvContent: z.string().min(10).max(500_000) }),
  async handler({ csvContent }) {
    const user = await assertPermission('patients:create');
    if (!user.organizationId) throw new Error('No organization');

    const rows = parseCsv(csvContent);
    const preview: ImportRowResult[] = [];

    for (let i = 0; i < Math.min(rows.length, 200); i++) {
      try {
        const parsed = mapRow(rows[i]);
        const dob = new Date(parsed.dateOfBirth);
        if (Number.isNaN(dob.getTime())) throw new Error('Invalid date of birth');

        let duplicate = false;
        let matchType: 'externalId' | 'name_dob' | undefined;

        if (parsed.externalId) {
          const byExt = await db.patient.findFirst({
            where: { organizationId: user.organizationId, externalId: parsed.externalId },
            select: { id: true },
          });
          if (byExt) {
            duplicate = true;
            matchType = 'externalId';
          }
        }
        if (!duplicate) {
          const byName = await db.patient.findFirst({
            where: {
              organizationId: user.organizationId,
              firstName: { equals: parsed.firstName, mode: 'insensitive' },
              lastName: { equals: parsed.lastName, mode: 'insensitive' },
              dateOfBirth: dob,
            },
            select: { id: true },
          });
          if (byName) {
            duplicate = true;
            matchType = 'name_dob';
          }
        }

        preview.push({
          ok: !duplicate,
          row: i + 2,
          status: duplicate ? 'duplicate' : 'valid',
          name: `${parsed.firstName} ${parsed.lastName}`,
          matchType,
          error: duplicate ? `Duplicate (${matchType})` : undefined,
        });
      } catch (err) {
        preview.push({
          ok: false,
          row: i + 2,
          status: 'invalid',
          error: err instanceof Error ? err.message : 'Invalid row',
        });
      }
    }

    return {
      totalRows: rows.length,
      preview,
      validCount: preview.filter((p) => p.status === 'valid').length,
      invalidCount: preview.filter((p) => p.status === 'invalid').length,
      duplicateCount: preview.filter((p) => p.status === 'duplicate').length,
      label: 'CSV migration preview: not full EHR conversion',
    };
  },
});

export const importPatientsFromCsv = action({
  schema: z.object({
    csvContent: z.string().min(10).max(500_000),
    dryRun: z.boolean().default(false),
    confirmedAfterDryRun: z.boolean().default(false),
  }),
  async handler({ csvContent, dryRun, confirmedAfterDryRun }) {
    const user = await assertPermission('patients:create');
    if (!user.organizationId) throw new Error('No organization');

    const org = await db.organization.findUnique({
      where: { id: user.organizationId },
      select: { livePhiEnabled: true, controlledPilotEnabled: true, slug: true },
    });
    const controlledPilot =
      Boolean(org?.controlledPilotEnabled) &&
      org?.slug !== DEMO_ORG_SLUG &&
      (isProductionApp() || Boolean(org?.livePhiEnabled));

    assertPilotAllowsImport({
      controlledPilot,
      dryRun,
      confirmedAfterDryRun,
    });

    const rows = parseCsv(csvContent);
    const results = {
      created: 0,
      skipped: 0,
      duplicates: 0,
      errors: [] as string[],
      dryRun,
      errorCsv: '' as string,
    };
    const errorLines = ['row,error,name'];

    for (let i = 0; i < rows.length; i++) {
      try {
        const parsed = mapRow(rows[i]);
        const dob = new Date(parsed.dateOfBirth);
        if (Number.isNaN(dob.getTime())) throw new Error('Invalid date of birth');

        if (parsed.externalId) {
          const existing = await db.patient.findFirst({
            where: { organizationId: user.organizationId, externalId: parsed.externalId },
          });
          if (existing) {
            results.duplicates++;
            results.skipped++;
            continue;
          }
        }

        const nameDup = await db.patient.findFirst({
          where: {
            organizationId: user.organizationId,
            firstName: { equals: parsed.firstName, mode: 'insensitive' },
            lastName: { equals: parsed.lastName, mode: 'insensitive' },
            dateOfBirth: dob,
          },
        });
        if (nameDup) {
          results.duplicates++;
          results.skipped++;
          continue;
        }

        if (dryRun) {
          results.created++;
          continue;
        }

        const patient = await db.patient.create({
          data: {
            organizationId: user.organizationId,
            firstName: parsed.firstName,
            lastName: parsed.lastName,
            dateOfBirth: dob,
            email: parsed.email || null,
            phone: parsed.phone || null,
            externalId: parsed.externalId || null,
          },
        });

        await audit({
          organizationId: user.organizationId,
          userId: user.id,
          action: 'IMPORT',
          resourceType: 'Patient',
          resourceId: patient.id,
          patientId: patient.id,
          metadata: { source: 'csv_import', row: i + 2, dryRun: false },
        });

        results.created++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Error';
        results.errors.push(`Row ${i + 2}: ${msg}`);
        errorLines.push(`${i + 2},"${msg.replace(/"/g, '""')}",`);
      }
    }

    results.errorCsv = errorLines.length > 1 ? errorLines.join('\n') : '';

    await audit({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'IMPORT',
      resourceType: 'PatientImportBatch',
      metadata: {
        dryRun,
        created: results.created,
        skipped: results.skipped,
        duplicates: results.duplicates,
        errorCount: results.errors.length,
        label: 'csv_migration_not_ehr_conversion',
      },
    });

    revalidatePath('/provider/patients');
    revalidatePath('/provider/settings/import');
    return results;
  },
});
