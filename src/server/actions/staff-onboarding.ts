'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/lib/db';
import { action } from '@/lib/server-action';
import { assertPermission, assertSameOrg } from '@/lib/auth/require';
import { audit } from '@/lib/audit/log';

const stepSchema = z.enum([
  'inviteAccepted',
  'passwordSet',
  'mfaEnrolled',
  'roleConfirmed',
  'locationAccessConfirmed',
  'permissionsReviewed',
  'phiNoticeAccepted',
  'workflowIntroCompleted',
]);

function stepToField(step: z.infer<typeof stepSchema>) {
  switch (step) {
    case 'inviteAccepted':
      return 'inviteAcceptedAt';
    case 'passwordSet':
      return 'passwordSetAt';
    case 'mfaEnrolled':
      return 'mfaEnrolledAt';
    case 'roleConfirmed':
      return 'roleConfirmedAt';
    case 'locationAccessConfirmed':
      return 'locationAccessConfirmedAt';
    case 'permissionsReviewed':
      return 'permissionsReviewedAt';
    case 'phiNoticeAccepted':
      return 'phiNoticeAcceptedAt';
    case 'workflowIntroCompleted':
      return 'workflowIntroCompletedAt';
  }
}

export const ensureStaffOnboarding = action({
  schema: z.object({ userId: z.string().optional() }),
  async handler({ userId }) {
    const user = await assertPermission('org:read');
    if (!user.organizationId) throw new Error('No organization context');
    const targetId = userId ?? user.id;

    if (targetId !== user.id) {
      await assertPermission('users:manage');
    }

    const target = await db.user.findUnique({ where: { id: targetId } });
    if (!target || target.organizationId !== user.organizationId) {
      throw new Error('User not found in organization');
    }

    const row = await db.staffOnboarding.upsert({
      where: { userId: targetId },
      create: {
        organizationId: user.organizationId,
        userId: targetId,
        inviteAcceptedAt: new Date(),
      },
      update: {},
    });

    return row;
  },
});

export const completeOnboardingStep = action({
  schema: z.object({
    userId: z.string().optional(),
    step: stepSchema,
  }),
  async handler({ userId, step }) {
    const user = await assertPermission('org:read');
    if (!user.organizationId) throw new Error('No organization context');
    const targetId = userId ?? user.id;

    if (targetId !== user.id) {
      await assertPermission('users:manage');
    }

    const field = stepToField(step);
    let row = await db.staffOnboarding.findUnique({ where: { userId: targetId } });
    if (!row) {
      row = await db.staffOnboarding.create({
        data: {
          organizationId: user.organizationId,
          userId: targetId,
          [field]: new Date(),
        },
      });
    } else {
      assertSameOrg(user, row);
      row = await db.staffOnboarding.update({
        where: { userId: targetId },
        data: { [field]: new Date() },
      });
    }

    const org = await db.organization.findUnique({
      where: { id: user.organizationId },
      select: { mfaRequiredForStaff: true },
    });
    const mfaOk = !org?.mfaRequiredForStaff || Boolean(row.mfaEnrolledAt);
    const allDone =
      Boolean(row.inviteAcceptedAt) &&
      Boolean(row.passwordSetAt) &&
      Boolean(row.roleConfirmedAt) &&
      Boolean(row.locationAccessConfirmedAt) &&
      Boolean(row.permissionsReviewedAt) &&
      Boolean(row.phiNoticeAcceptedAt) &&
      Boolean(row.workflowIntroCompletedAt) &&
      mfaOk;

    if (allDone && !row.completedAt) {
      row = await db.staffOnboarding.update({
        where: { userId: targetId },
        data: { completedAt: new Date() },
      });
    }

    await audit({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'STAFF_ONBOARDING',
      resourceType: 'StaffOnboarding',
      resourceId: row.id,
      metadata: { step, targetUserId: targetId, complete: Boolean(row.completedAt) },
    });

    revalidatePath('/provider/settings/staff-onboarding');
    revalidatePath('/provider/settings/pilot-launch');
    return row;
  },
});
