'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/lib/db';
import { action } from '@/lib/server-action';
import { assertPermission } from '@/lib/auth/require';
import { audit } from '@/lib/audit/log';
import { getMfaAssurance, isMfaProviderConfigured } from '@/lib/security/mfa';

export const setOrganizationMfaRequired = action({
  schema: z.object({ required: z.boolean() }),
  async handler({ required }) {
    const user = await assertPermission('org:manage');
    if (!user.organizationId) throw new Error('No organization context');

    if (required && !isMfaProviderConfigured()) {
      throw new Error(
        'MFA provider is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY before requiring MFA.',
      );
    }

    const org = await db.organization.findUnique({ where: { id: user.organizationId } });
    const previous = org?.mfaRequiredForStaff ?? false;

    const updated = await db.organization.update({
      where: { id: user.organizationId },
      data: { mfaRequiredForStaff: required },
    });

    await audit({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'SECURITY_POLICY',
      resourceType: 'Organization',
      resourceId: user.organizationId,
      previousStatus: String(previous),
      newStatus: String(required),
      metadata: { policy: 'mfaRequiredForStaff', required },
    });

    revalidatePath('/provider/settings/security');
    revalidatePath('/provider/settings/phi-readiness');
    return updated;
  },
});

export const syncMfaEnrollmentStatus = action({
  schema: z.object({ enrolled: z.boolean() }),
  async handler({ enrolled }) {
    const user = await assertPermission('org:read');
    const assurance = await getMfaAssurance();

    const updated = await db.user.update({
      where: { id: user.id },
      data: enrolled
        ? {
            mfaEnrolledAt: user.raw.mfaEnrolledAt ?? new Date(),
            mfaLastVerifiedAt: assurance.currentLevel === 'aal2' ? new Date() : user.raw.mfaLastVerifiedAt,
          }
        : { mfaEnrolledAt: null, mfaLastVerifiedAt: null },
    });

    await audit({
      organizationId: user.organizationId,
      userId: user.id,
      action: enrolled ? 'MFA_ENROLL' : 'MFA_DISABLE',
      resourceType: 'User',
      resourceId: user.id,
      newStatus: enrolled ? 'enrolled' : 'disabled',
      metadata: { aal: assurance.currentLevel },
    });

    revalidatePath('/provider/settings/security');
    return { enrolled: Boolean(updated.mfaEnrolledAt) };
  },
});

export const recordMfaChallengePassed = action({
  schema: z.object({}),
  async handler() {
    const user = await assertPermission('org:read');
    const assurance = await getMfaAssurance();
    if (assurance.currentLevel !== 'aal2') {
      throw new Error('MFA challenge has not been completed (AAL2 required).');
    }

    await db.user.update({
      where: { id: user.id },
      data: {
        mfaEnrolledAt: user.raw.mfaEnrolledAt ?? new Date(),
        mfaLastVerifiedAt: new Date(),
      },
    });

    await audit({
      organizationId: user.organizationId,
      userId: user.id,
      action: 'MFA_CHALLENGE',
      resourceType: 'User',
      resourceId: user.id,
      newStatus: 'aal2',
      metadata: { result: 'passed' },
    });

    revalidatePath('/provider');
    return { ok: true };
  },
});
