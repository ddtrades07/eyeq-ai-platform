'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { VendorKind, VendorReadinessStatus } from '@prisma/client';
import { db } from '@/lib/db';
import { action } from '@/lib/server-action';
import { assertPermission } from '@/lib/auth/require';
import { audit } from '@/lib/audit/log';
import { detectVendorEnv } from '@/lib/vendors/readiness';
import { evaluatePhiReadiness } from '@/lib/production/phi-readiness';
import { isProductionApp } from '@/lib/production/mode';

export const markVendorBaaComplete = action({
  schema: z.object({
    vendor: z.nativeEnum(VendorKind),
    complete: z.boolean(),
    notes: z.string().max(2000).optional(),
  }),
  async handler({ vendor, complete, notes }) {
    const user = await assertPermission('org:manage');
    if (!user.organizationId) throw new Error('No organization context');

    const env = detectVendorEnv(vendor);
    const status: VendorReadinessStatus = complete
      ? env.configured
        ? VendorReadinessStatus.BAA_COMPLETE
        : VendorReadinessStatus.BAA_REQUIRED
      : env.configured
        ? VendorReadinessStatus.BAA_REQUIRED
        : VendorReadinessStatus.NOT_CONFIGURED;

    const row = await db.vendorReadiness.upsert({
      where: {
        organizationId_vendor: {
          organizationId: user.organizationId,
          vendor,
        },
      },
      create: {
        organizationId: user.organizationId,
        vendor,
        status,
        baaCompletedAt: complete ? new Date() : null,
        baaCompletedById: complete ? user.id : null,
        notes: notes ?? null,
        configHint: env.hint,
      },
      update: {
        status,
        baaCompletedAt: complete ? new Date() : null,
        baaCompletedById: complete ? user.id : null,
        notes: notes ?? null,
        configHint: env.hint,
      },
    });

    await audit({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'VENDOR_CONFIG',
      resourceType: 'VendorReadiness',
      resourceId: row.id,
      previousStatus: complete ? 'incomplete' : 'complete',
      newStatus: complete ? 'baa_complete' : 'baa_cleared',
      metadata: { vendor, complete },
    });

    revalidatePath('/provider/settings/vendors');
    revalidatePath('/provider/settings/phi-readiness');
    return row;
  },
});

export const testVendorConnection = action({
  schema: z.object({ vendor: z.nativeEnum(VendorKind) }),
  async handler({ vendor }) {
    const user = await assertPermission('org:manage');
    if (!user.organizationId) throw new Error('No organization context');

    const env = detectVendorEnv(vendor);
    const ok = env.configured;
    const lastError = ok ? null : env.detail;

    const row = await db.vendorReadiness.upsert({
      where: {
        organizationId_vendor: {
          organizationId: user.organizationId,
          vendor,
        },
      },
      create: {
        organizationId: user.organizationId,
        vendor,
        status: ok
          ? VendorReadinessStatus.CONFIGURED_PRODUCTION
          : VendorReadinessStatus.NOT_CONFIGURED,
        lastTestAt: new Date(),
        lastTestOk: ok,
        lastError,
        configHint: env.hint,
      },
      update: {
        lastTestAt: new Date(),
        lastTestOk: ok,
        lastError,
        configHint: env.hint,
        status: ok
          ? undefined
          : VendorReadinessStatus.NOT_CONFIGURED,
      },
    });

    await audit({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'VENDOR_CONFIG',
      resourceType: 'VendorReadiness',
      resourceId: row.id,
      success: ok,
      metadata: { vendor, action: 'connection_test', ok },
    });

    revalidatePath('/provider/settings/vendors');
    return { ok, detail: env.detail, hint: env.hint };
  },
});

export const setOrganizationLivePhi = action({
  schema: z.object({ enabled: z.boolean() }),
  async handler({ enabled }) {
    const user = await assertPermission('org:manage');
    if (!user.organizationId) throw new Error('No organization context');

    if (enabled) {
      if (!isProductionApp()) {
        throw new Error('Live PHI can only be enabled when APP_ENV=production.');
      }
      const report = await evaluatePhiReadiness(user.organizationId);
      if (!report.canEnableLivePhi || report.blockers.length) {
        throw new Error(
          `Cannot enable live PHI:\n${(report.blockers.length
            ? report.blockers
            : report.checks.filter((c) => c.state !== 'ready').map((c) => c.detail)
          ).join('\n')}`,
        );
      }
    }

    const previous = (
      await db.organization.findUnique({
        where: { id: user.organizationId },
        select: { livePhiEnabled: true },
      })
    )?.livePhiEnabled;

    const updated = await db.organization.update({
      where: { id: user.organizationId },
      data: { livePhiEnabled: enabled },
    });

    await audit({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'PHI_MODE',
      resourceType: 'Organization',
      resourceId: user.organizationId,
      previousStatus: String(previous),
      newStatus: String(enabled),
      metadata: { livePhiEnabled: enabled },
    });

    revalidatePath('/provider/settings/phi-readiness');
    return updated;
  },
});

export const markRlsVerified = action({
  schema: z.object({ verified: z.boolean() }),
  async handler({ verified }) {
    const user = await assertPermission('org:manage');
    if (!user.organizationId) throw new Error('No organization context');

    const updated = await db.organization.update({
      where: { id: user.organizationId },
      data: { rlsVerifiedAt: verified ? new Date() : null },
    });

    await audit({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'SECURITY_POLICY',
      resourceType: 'Organization',
      resourceId: user.organizationId,
      newStatus: verified ? 'rls_verified' : 'rls_unverified',
      metadata: { policy: 'rlsVerifiedAt' },
    });

    revalidatePath('/provider/settings/phi-readiness');
    return updated;
  },
});

export const markAuditVerified = action({
  schema: z.object({ verified: z.boolean() }),
  async handler({ verified }) {
    const user = await assertPermission('org:manage');
    if (!user.organizationId) throw new Error('No organization context');

    const updated = await db.organization.update({
      where: { id: user.organizationId },
      data: { auditVerifiedAt: verified ? new Date() : null },
    });

    await audit({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'SECURITY_POLICY',
      resourceType: 'Organization',
      resourceId: user.organizationId,
      newStatus: verified ? 'audit_verified' : 'audit_unverified',
      metadata: { policy: 'auditVerifiedAt' },
    });

    revalidatePath('/provider/settings/phi-readiness');
    return updated;
  },
});
