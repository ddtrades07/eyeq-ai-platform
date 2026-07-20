'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/lib/db';
import { action } from '@/lib/server-action';
import { assertPermission } from '@/lib/auth/require';
import { audit } from '@/lib/audit/log';
import { evaluatePhiReadiness } from '@/lib/production/phi-readiness';
import { isProductionApp } from '@/lib/production/mode';
import { DEMO_ORG_SLUG } from '@/lib/demo/constants';

export const updateBackupReadiness = action({
  schema: z.object({
    backupProvider: z.string().max(120).optional().nullable(),
    backupStatus: z.enum(['unknown', 'configured', 'verified', 'failed']).optional(),
    backupLastAt: z.coerce.date().optional().nullable(),
    backupRetentionDays: z.coerce.number().int().min(1).max(3650).optional().nullable(),
    backupRestoreTestAt: z.coerce.date().optional().nullable(),
    backupRestoreTestNotes: z.string().max(4000).optional().nullable(),
  }),
  async handler(input) {
    const user = await assertPermission('org:manage');
    if (!user.organizationId) throw new Error('No organization context');

    const updated = await db.organization.update({
      where: { id: user.organizationId },
      data: {
        ...(input.backupProvider !== undefined ? { backupProvider: input.backupProvider } : {}),
        ...(input.backupStatus !== undefined ? { backupStatus: input.backupStatus } : {}),
        ...(input.backupLastAt !== undefined ? { backupLastAt: input.backupLastAt } : {}),
        ...(input.backupRetentionDays !== undefined
          ? { backupRetentionDays: input.backupRetentionDays }
          : {}),
        ...(input.backupRestoreTestAt !== undefined
          ? { backupRestoreTestAt: input.backupRestoreTestAt }
          : {}),
        ...(input.backupRestoreTestNotes !== undefined
          ? { backupRestoreTestNotes: input.backupRestoreTestNotes }
          : {}),
      },
    });

    await audit({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'SECURITY_POLICY',
      resourceType: 'Organization',
      resourceId: user.organizationId,
      metadata: { policy: 'backup_readiness', ...input },
    });

    revalidatePath('/provider/settings/phi-readiness');
    revalidatePath('/provider/settings/pilot-launch');
    return updated;
  },
});

export const markMonitoringVerified = action({
  schema: z.object({
    verified: z.boolean(),
    provider: z.string().max(120).optional().nullable(),
  }),
  async handler({ verified, provider }) {
    const user = await assertPermission('org:manage');
    if (!user.organizationId) throw new Error('No organization context');

    const updated = await db.organization.update({
      where: { id: user.organizationId },
      data: {
        monitoringVerifiedAt: verified ? new Date() : null,
        monitoringProvider: provider ?? undefined,
      },
    });

    await audit({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'SECURITY_POLICY',
      resourceType: 'Organization',
      resourceId: user.organizationId,
      newStatus: verified ? 'monitoring_verified' : 'monitoring_unverified',
      metadata: { provider },
    });

    revalidatePath('/provider/settings/phi-readiness');
    revalidatePath('/provider/settings/pilot-launch');
    return updated;
  },
});

export const markIncidentResponseReviewed = action({
  schema: z.object({
    reviewed: z.boolean(),
    notes: z.string().max(4000).optional().nullable(),
  }),
  async handler({ reviewed, notes }) {
    const user = await assertPermission('org:manage');
    if (!user.organizationId) throw new Error('No organization context');

    const updated = await db.organization.update({
      where: { id: user.organizationId },
      data: {
        incidentResponseReviewedAt: reviewed ? new Date() : null,
        incidentResponseNotes: notes ?? undefined,
      },
    });

    await audit({
      organizationId: user.organizationId,
      userId: user.id,
      action: reviewed ? 'INCIDENT_REVIEW' : 'SECURITY_POLICY',
      resourceType: 'Organization',
      resourceId: user.organizationId,
      newStatus: reviewed ? 'incident_runbook_reviewed' : 'incident_unreviewed',
    });

    revalidatePath('/provider/settings/phi-readiness');
    revalidatePath('/provider/settings/pilot-launch');
    return updated;
  },
});

export const markStaffTrainingCompleted = action({
  schema: z.object({ completed: z.boolean() }),
  async handler({ completed }) {
    const user = await assertPermission('org:manage');
    if (!user.organizationId) throw new Error('No organization context');

    const updated = await db.organization.update({
      where: { id: user.organizationId },
      data: { staffTrainingCompletedAt: completed ? new Date() : null },
    });

    await audit({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'STAFF_ONBOARDING',
      resourceType: 'Organization',
      resourceId: user.organizationId,
      newStatus: completed ? 'training_complete' : 'training_incomplete',
    });

    revalidatePath('/provider/settings/pilot-launch');
    return updated;
  },
});

export const setControlledPilotMode = action({
  schema: z.object({ enabled: z.boolean() }),
  async handler({ enabled }) {
    const user = await assertPermission('org:manage');
    if (!user.organizationId) throw new Error('No organization context');

    if (user.organizationSlug === DEMO_ORG_SLUG) {
      throw new Error('Controlled pilot mode cannot be enabled on the demo organization.');
    }

    if (enabled) {
      const report = await evaluatePhiReadiness(user.organizationId);
      const hardBlockers = report.checks.filter(
        (c) =>
          c.state === 'blocked' &&
          [
            'org_mfa_policy',
            'org_rls',
            'backup',
            'incident_response',
            'monitoring',
            'demo_mode',
          ].includes(c.id),
      );
      if (hardBlockers.length || report.overall === 'demo_only') {
        throw new Error(
          `Cannot enable controlled pilot:\n${hardBlockers.map((b) => b.detail).join('\n') || report.blockers.join('\n')}`,
        );
      }
    }

    const previous = (
      await db.organization.findUnique({
        where: { id: user.organizationId },
        select: { controlledPilotEnabled: true },
      })
    )?.controlledPilotEnabled;

    const updated = await db.organization.update({
      where: { id: user.organizationId },
      data: { controlledPilotEnabled: enabled },
    });

    await audit({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'PILOT_MODE',
      resourceType: 'Organization',
      resourceId: user.organizationId,
      previousStatus: String(previous),
      newStatus: String(enabled),
      metadata: { controlledPilotEnabled: enabled, production: isProductionApp() },
    });

    revalidatePath('/provider/settings/pilot-launch');
    revalidatePath('/provider/settings/phi-readiness');
    revalidatePath('/provider/dashboard');
    return updated;
  },
});
