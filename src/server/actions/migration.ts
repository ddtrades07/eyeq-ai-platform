'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import {
  MigrationProjectStatus,
  MigrationRecordStatus,
  MigrationValidationSeverity,
} from '@prisma/client';
import { db } from '@/lib/db';
import { action } from '@/lib/server-action';
import { assertPermission, assertSameOrg } from '@/lib/auth/require';
import { audit } from '@/lib/audit/log';

const SOURCE_PROFILES = [
  'revolution_ehr',
  'eyefinity_officemate',
  'eyefinity_examwriter',
  'crystal_pm',
  'compulink',
  'my_vision_express',
  'generic_csv',
  'generic_ehr_export',
] as const;

export const createMigrationProject = action({
  schema: z.object({
    name: z.string().min(1).max(200),
    sourceSystem: z.enum(SOURCE_PROFILES),
    notes: z.string().max(2000).optional(),
  }),
  async handler(input) {
    const user = await assertPermission('migration:create');
    if (!user.organizationId) throw new Error('No organization context');

    const project = await db.migrationProject.create({
      data: {
        organizationId: user.organizationId,
        name: input.name,
        sourceSystem: input.sourceSystem,
        notes: input.notes ?? null,
        status: MigrationProjectStatus.DRAFT,
        createdById: user.id,
      },
    });

    await audit({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'CREATE',
      resourceType: 'MigrationProject',
      resourceId: project.id,
    });

    revalidatePath('/provider/migration');
    return project;
  },
});

function parseCsvRows(csv: string): { headers: string[]; rows: string[][] } {
  const lines = csv.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
  const rows = lines.slice(1).map((line) => {
    const cells: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
        continue;
      }
      if (ch === ',' && !inQuotes) {
        cells.push(current.trim());
        current = '';
        continue;
      }
      current += ch;
    }
    cells.push(current.trim());
    return cells;
  });
  return { headers, rows };
}

export const uploadMigrationCsv = action({
  schema: z.object({
    projectId: z.string(),
    domain: z.string().min(1).max(100),
    fileName: z.string().min(1).max(500),
    csvContent: z.string().min(1).max(5_000_000),
    isTrial: z.boolean().default(true),
  }),
  async handler(input) {
    const user = await assertPermission('migration:upload');
    if (!user.organizationId) throw new Error('No organization context');
    const organizationId = user.organizationId;

    const project = await db.migrationProject.findUnique({ where: { id: input.projectId } });
    if (!project) throw new Error('Migration project not found');
    assertSameOrg(user, project);

    const { headers, rows } = parseCsvRows(input.csvContent);
    if (headers.length === 0) throw new Error('CSV file has no header row');

    const batch = await db.migrationBatch.create({
      data: {
        projectId: project.id,
        organizationId,
        fileName: input.fileName,
        domain: input.domain,
        format: 'csv',
        rowCount: rows.length,
        isTrial: input.isTrial,
        uploadedById: user.id,
      },
    });

    const staging = rows.map((row, index) => {
      const raw: Record<string, string> = {};
      headers.forEach((h, i) => {
        raw[h] = row[i] ?? '';
      });
      const sourceRecordId = raw.id || raw.mrn || raw.patient_id || `row-${index + 1}`;
      return {
        projectId: project.id,
        organizationId,
        domain: input.domain,
        sourceSystem: project.sourceSystem,
        sourceRecordId,
        rawValue: raw,
        status: MigrationRecordStatus.RAW,
      };
    });

    if (staging.length > 0) {
      await db.migrationStagingRecord.createMany({ data: staging });
    }

    if (input.domain === 'patients') {
      const defaults: Record<string, string> = {
        first_name: 'firstName',
        firstName: 'firstName',
        last_name: 'lastName',
        lastName: 'lastName',
        dob: 'dateOfBirth',
        date_of_birth: 'dateOfBirth',
        dateOfBirth: 'dateOfBirth',
        email: 'email',
        phone: 'phone',
        member_id: 'insuranceMemberId',
        insurance_member_id: 'insuranceMemberId',
        payer: 'insuranceCarrier',
        insurance_carrier: 'insuranceCarrier',
      };
      for (const h of headers) {
        const target = defaults[h] ?? defaults[h.toLowerCase()];
        if (!target) continue;
        await db.migrationFieldMapping.upsert({
          where: {
            projectId_domain_sourceField: {
              projectId: project.id,
              domain: input.domain,
              sourceField: h,
            },
          },
          create: {
            projectId: project.id,
            domain: input.domain,
            sourceField: h,
            targetField: target,
            required: target === 'firstName' || target === 'lastName' || target === 'dateOfBirth',
          },
          update: { targetField: target },
        });
      }
    }

    await db.migrationProject.update({
      where: { id: project.id },
      data: { status: MigrationProjectStatus.DISCOVERY },
    });

    await audit({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'IMPORT',
      resourceType: 'MigrationBatch',
      resourceId: batch.id,
      metadata: { domain: input.domain, rowCount: rows.length },
    });

    revalidatePath(`/provider/migration/${project.id}`);
    return { batchId: batch.id, rowCount: rows.length };
  },
});

export const saveMigrationMapping = action({
  schema: z.object({
    projectId: z.string(),
    domain: z.string(),
    mappings: z.array(
      z.object({
        sourceField: z.string(),
        targetField: z.string(),
        dataType: z.string().default('string'),
        transform: z.string().optional(),
        required: z.boolean().default(false),
        ignore: z.boolean().default(false),
      }),
    ),
  }),
  async handler({ projectId, domain, mappings }) {
    const user = await assertPermission('migration:map');
    if (!user.organizationId) throw new Error('No organization context');

    const project = await db.migrationProject.findUnique({ where: { id: projectId } });
    if (!project) throw new Error('Migration project not found');
    assertSameOrg(user, project);

    await db.$transaction([
      ...mappings.map((m) =>
        db.migrationFieldMapping.upsert({
          where: {
            projectId_domain_sourceField: {
              projectId,
              domain,
              sourceField: m.sourceField,
            },
          },
          create: {
            projectId,
            domain,
            sourceField: m.sourceField,
            targetField: m.targetField,
            dataType: m.dataType,
            transform: m.transform ?? null,
            required: m.required,
            ignore: m.ignore,
          },
          update: {
            targetField: m.targetField,
            dataType: m.dataType,
            transform: m.transform ?? null,
            required: m.required,
            ignore: m.ignore,
          },
        }),
      ),
      db.migrationProject.update({
        where: { id: projectId },
        data: { status: MigrationProjectStatus.MAPPING },
      }),
    ]);

    revalidatePath(`/provider/migration/${projectId}`);
    return { saved: mappings.length };
  },
});

export const validateMigrationProject = action({
  schema: z.object({ projectId: z.string(), domain: z.string().optional() }),
  async handler({ projectId, domain }) {
    const user = await assertPermission('migration:validate');
    if (!user.organizationId) throw new Error('No organization context');

    const project = await db.migrationProject.findUnique({ where: { id: projectId } });
    if (!project) throw new Error('Migration project not found');
    assertSameOrg(user, project);

    const mappings = await db.migrationFieldMapping.findMany({
      where: { projectId, ...(domain ? { domain } : {}) },
    });
    const requiredTargets = new Set(
      mappings.filter((m) => m.required && !m.ignore).map((m) => m.targetField),
    );

    const staging = await db.migrationStagingRecord.findMany({
      where: { projectId, ...(domain ? { domain } : {}) },
      take: 5000,
    });

    let blocking = 0;
    let warnings = 0;

    for (const record of staging) {
      const raw = record.rawValue as Record<string, string>;
      const mapped: Record<string, string> = {};
      let error: string | null = null;
      let warning: string | null = null;
      let severity: MigrationValidationSeverity | null = null;

      for (const map of mappings) {
        if (map.ignore) continue;
        let value = raw[map.sourceField] ?? '';
        if (map.transform === 'phone_normalize') {
          value = value.replace(/\D/g, '');
        }
        if (map.transform === 'date_iso' && value) {
          const d = new Date(value);
          if (Number.isNaN(d.getTime())) {
            error = `Invalid date in ${map.sourceField}`;
            severity = MigrationValidationSeverity.BLOCKING;
          } else {
            value = d.toISOString().slice(0, 10);
          }
        }
        mapped[map.targetField] = value;
        if (map.required && !value.trim()) {
          error = `Missing required field ${map.targetField}`;
          severity = MigrationValidationSeverity.BLOCKING;
        }
      }

      for (const req of requiredTargets) {
        if (!mapped[req]?.trim()) {
          error = `Missing mapped value for ${req}`;
          severity = MigrationValidationSeverity.BLOCKING;
        }
      }

      if (!error && record.domain === 'patients' && !mapped.firstName && !mapped.lastName) {
        warning = 'Patient name may be incomplete';
        severity = MigrationValidationSeverity.WARNING;
      }

      if (error) blocking++;
      else if (warning) warnings++;

      await db.migrationStagingRecord.update({
        where: { id: record.id },
        data: {
          mappedValue: mapped,
          status: error
            ? MigrationRecordStatus.ERROR
            : MigrationRecordStatus.VALIDATED,
          validationSeverity: severity,
          error,
          warning,
        },
      });
    }

    await db.migrationProject.update({
      where: { id: projectId },
      data: { status: MigrationProjectStatus.VALIDATION },
    });

    revalidatePath(`/provider/migration/${projectId}`);
    return { validated: staging.length, blocking, warnings };
  },
});

export const runTrialMigrationImport = action({
  schema: z.object({ projectId: z.string(), domain: z.string().default('patients') }),
  async handler({ projectId, domain }) {
    const user = await assertPermission('migration:execute');
    if (!user.organizationId) throw new Error('No organization context');

    const project = await db.migrationProject.findUnique({ where: { id: projectId } });
    if (!project) throw new Error('Migration project not found');
    assertSameOrg(user, project);

    const records = await db.migrationStagingRecord.findMany({
      where: {
        projectId,
        domain,
        status: MigrationRecordStatus.VALIDATED,
        validationSeverity: { not: MigrationValidationSeverity.BLOCKING },
      },
      take: 500,
    });

    let imported = 0;
    for (const record of records) {
      const mapped = (record.mappedValue ?? {}) as Record<string, string>;
      if (domain === 'patients') {
        const dob = mapped.dateOfBirth ? new Date(mapped.dateOfBirth) : null;
        if (!dob || Number.isNaN(dob.getTime())) continue;
        const patient = await db.patient.create({
          data: {
            organizationId: user.organizationId,
            firstName: mapped.firstName || 'Unknown',
            lastName: mapped.lastName || 'Unknown',
            dateOfBirth: dob,
            email: mapped.email || null,
            phone: mapped.phone || null,
            externalId: record.sourceRecordId,
            insuranceCarrier: mapped.insuranceCarrier || null,
            insuranceMemberId: mapped.insuranceMemberId || null,
          },
        });
        await db.migrationStagingRecord.update({
          where: { id: record.id },
          data: {
            status: MigrationRecordStatus.IMPORTED,
            destinationRecordId: patient.id,
            importedAt: new Date(),
            importedById: user.id,
          },
        });
        imported++;
      }
    }

    await db.migrationProject.update({
      where: { id: projectId },
      data: { status: MigrationProjectStatus.TRIAL },
    });

    await audit({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'IMPORT',
      resourceType: 'MigrationProject',
      resourceId: projectId,
      metadata: { trial: true, domain, imported },
    });

    revalidatePath(`/provider/migration/${projectId}`);
    revalidatePath('/provider/patients');
    return { imported };
  },
});

export const reconcileMigrationProject = action({
  schema: z.object({ projectId: z.string() }),
  async handler({ projectId }) {
    const user = await assertPermission('migration:approve');
    if (!user.organizationId) throw new Error('No organization context');

    const project = await db.migrationProject.findUnique({ where: { id: projectId } });
    if (!project) throw new Error('Migration project not found');
    assertSameOrg(user, project);

    const grouped = await db.migrationStagingRecord.groupBy({
      by: ['domain', 'status'],
      where: { projectId },
      _count: { id: true },
    });

    const importedPatients = await db.migrationStagingRecord.count({
      where: { projectId, domain: 'patients', status: MigrationRecordStatus.IMPORTED },
    });
    const livePatients = await db.patient.count({
      where: { organizationId: user.organizationId, externalId: { not: null } },
    });

    await db.migrationProject.update({
      where: { id: projectId },
      data: { status: MigrationProjectStatus.RECONCILIATION },
    });

    return {
      counts: grouped.map((g) => ({
        domain: g.domain,
        status: g.status,
        count: g._count.id,
      })),
      patients: { stagedImported: importedPatients, liveWithExternalId: livePatients },
      balanced: importedPatients <= livePatients,
    };
  },
});

export const approveMigrationProject = action({
  schema: z.object({ projectId: z.string(), goLiveDate: z.coerce.date().optional() }),
  async handler({ projectId, goLiveDate }) {
    const user = await assertPermission('migration:approve');
    if (!user.organizationId) throw new Error('No organization context');

    const project = await db.migrationProject.findUnique({ where: { id: projectId } });
    if (!project) throw new Error('Migration project not found');
    assertSameOrg(user, project);

    const updated = await db.migrationProject.update({
      where: { id: projectId },
      data: {
        status: MigrationProjectStatus.COMPLETE,
        approvedById: user.id,
        approvedAt: new Date(),
        goLiveDate: goLiveDate ?? null,
      },
    });

    await audit({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'UPDATE',
      resourceType: 'MigrationProject',
      resourceId: projectId,
      metadata: { approved: true },
    });

    revalidatePath('/provider/migration');
    return updated;
  },
});

export const MIGRATION_SOURCE_PROFILES = SOURCE_PROFILES;
