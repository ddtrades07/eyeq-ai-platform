'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import {
  ConnectedEhrVendor,
  EhrConnectionStatus,
  EhrConnectorMethod,
  EhrSyncDirection,
} from '@prisma/client';
import { db } from '@/lib/db';
import { action } from '@/lib/server-action';
import { assertPermission, assertSameOrg } from '@/lib/auth/require';
import { audit } from '@/lib/audit/log';
import { getVendorEntry } from '@/lib/ehr/catalog';
import { getConnector, getConnectorForIntegration } from '@/lib/ehr/connector';

const provisionSchema = z.object({
  vendor: z.nativeEnum(ConnectedEhrVendor),
  connectorMethod: z.nativeEnum(EhrConnectorMethod).optional(),
});

export const provisionIntegration = action({
  schema: provisionSchema,
  async handler({ vendor, connectorMethod }) {
    const user = await assertPermission('ehr:manage');
    if (!user.organizationId) throw new Error('No organization context');

    const entry = getVendorEntry(vendor);
    if (!entry) throw new Error('Unknown vendor');

    const existing = await db.ehrIntegration.findFirst({
      where: { organizationId: user.organizationId, vendor },
    });
    if (existing) {
      throw new Error(`${entry.name} integration already exists for this organization.`);
    }

    const integration = await db.ehrIntegration.create({
      data: {
        organizationId: user.organizationId,
        vendor,
        displayName: entry.name,
        connectorMethod: connectorMethod ?? entry.defaultMethod,
        status: EhrConnectionStatus.NOT_CONNECTED,
        syncDirection: entry.defaultDirection,
        patientSync: entry.capabilities.patientSync,
        appointmentSync: entry.capabilities.appointmentSync,
        noteExport: entry.capabilities.noteExport,
        prescriptionSync: entry.capabilities.prescriptionSync,
        imagingMetadataSync: entry.capabilities.imagingMetadataSync,
        setupChecklist: entry.setupChecklist.map((c) => ({ ...c, done: false })),
        sandboxOnly: true,
        scopes: [],
      },
    });

    await audit({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'CREATE',
      resourceType: 'EhrIntegration',
      resourceId: integration.id,
      metadata: { vendor },
    });

    revalidatePath('/provider/ehr-integrations');
    return integration;
  },
});

const updateSchema = z.object({
  id: z.string(),
  connectorMethod: z.nativeEnum(EhrConnectorMethod).optional(),
  status: z.nativeEnum(EhrConnectionStatus).optional(),
  syncDirection: z.nativeEnum(EhrSyncDirection).optional(),
  baseUrl: z.string().url().optional().nullable().or(z.literal('')),
  scopes: z.array(z.string()).optional(),
  sandboxOnly: z.boolean().optional(),
  patientSync: z.boolean().optional(),
  appointmentSync: z.boolean().optional(),
  noteExport: z.boolean().optional(),
  prescriptionSync: z.boolean().optional(),
  imagingMetadataSync: z.boolean().optional(),
  notes: z.string().max(2000).optional().nullable(),
});

export const updateIntegration = action({
  schema: updateSchema,
  async handler({ id, ...patch }) {
    const user = await assertPermission('ehr:manage');
    if (!user.organizationId) throw new Error('No organization context');

    const existing = await db.ehrIntegration.findUnique({ where: { id } });
    if (!existing) throw new Error('Integration not found');
    assertSameOrg(user, existing);

    const updated = await db.ehrIntegration.update({
      where: { id },
      data: {
        connectorMethod: patch.connectorMethod ?? undefined,
        status: patch.status ?? undefined,
        syncDirection: patch.syncDirection ?? undefined,
        baseUrl: patch.baseUrl === '' ? null : patch.baseUrl ?? undefined,
        scopes: patch.scopes ?? undefined,
        sandboxOnly: patch.sandboxOnly ?? undefined,
        patientSync: patch.patientSync ?? undefined,
        appointmentSync: patch.appointmentSync ?? undefined,
        noteExport: patch.noteExport ?? undefined,
        prescriptionSync: patch.prescriptionSync ?? undefined,
        imagingMetadataSync: patch.imagingMetadataSync ?? undefined,
        notes: patch.notes ?? undefined,
      },
    });

    await audit({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'UPDATE',
      resourceType: 'EhrIntegration',
      resourceId: id,
    });

    revalidatePath('/provider/ehr-integrations');
    revalidatePath(`/provider/ehr-integrations/${id}`);
    return updated;
  },
});

export const testIntegration = action({
  schema: z.object({ id: z.string() }),
  async handler({ id }) {
    const user = await assertPermission('ehr:manage');
    if (!user.organizationId) throw new Error('No organization context');

    const integration = await db.ehrIntegration.findUnique({ where: { id } });
    if (!integration) throw new Error('Integration not found');
    assertSameOrg(user, integration);

    const connector = getConnectorForIntegration(integration);
    const result = await connector.testConnection(integration);

    await db.ehrSyncLog.create({
      data: {
        integrationId: id,
        resourceType: 'TestConnection',
        direction: integration.syncDirection,
        recordsTotal: 0,
        recordsOk: result.recordsOk,
        recordsFailed: result.recordsFailed,
        status: result.status === 'ok' ? 'ok' : result.status,
        errorMessage: result.status === 'error' ? result.message : null,
        payload: (result.envelope ?? null) as object,
        finishedAt: new Date(),
      },
    });

    await audit({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'UPDATE',
      resourceType: 'EhrIntegration',
      resourceId: id,
      metadata: { test: true, status: result.status },
    });

    revalidatePath(`/provider/ehr-integrations/${id}`);
    return result;
  },
});

export const deleteIntegration = action({
  schema: z.object({ id: z.string() }),
  async handler({ id }) {
    const user = await assertPermission('ehr:manage');
    if (!user.organizationId) throw new Error('No organization context');

    const existing = await db.ehrIntegration.findUnique({ where: { id } });
    if (!existing) throw new Error('Integration not found');
    assertSameOrg(user, existing);

    await db.ehrIntegration.delete({ where: { id } });
    await audit({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'DELETE',
      resourceType: 'EhrIntegration',
      resourceId: id,
    });
    revalidatePath('/provider/ehr-integrations');
    return { ok: true };
  },
});

export const syncIntegration = action({
  schema: z.object({
    id: z.string(),
    resource: z.enum(['Patient', 'Appointment', 'ClinicalNote']).default('Patient'),
    records: z.number().int().min(1).max(200).default(50),
  }),
  async handler({ id, resource, records }) {
    const user = await assertPermission('ehr:manage');
    if (!user.organizationId) throw new Error('No organization context');

    const integration = await db.ehrIntegration.findUnique({ where: { id } });
    if (!integration) throw new Error('Integration not found');
    assertSameOrg(user, integration);

    const { enqueueBackgroundJob } = await import('@/lib/jobs/queue');
    const job = await enqueueBackgroundJob({
      type: 'ehr-sync',
      organizationId: user.organizationId,
      createdById: user.id,
      payload: { integrationId: id, resource, records },
    });

    await audit({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'UPDATE',
      resourceType: 'EhrIntegration',
      resourceId: id,
      metadata: { syncQueued: true, jobId: job.id, resource },
    });

    revalidatePath(`/provider/ehr-integrations/${id}`);
    return { jobId: job.id, status: 'queued' };
  },
});
