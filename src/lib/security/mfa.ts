import 'server-only';

import { createSupabaseServerClient } from '@/lib/supabase/server';
import { db } from '@/lib/db';
import { audit } from '@/lib/audit/log';
import { publicEnv } from '@/lib/env';
import { DEMO_ORG_SLUG } from '@/lib/demo/constants';

export type MfaAssurance = {
  providerConfigured: boolean;
  currentLevel: 'aal1' | 'aal2' | 'unknown';
  nextLevel: 'aal1' | 'aal2' | null;
  enrolled: boolean;
};

export function isMfaProviderConfigured(): boolean {
  return Boolean(publicEnv.supabaseUrl && publicEnv.supabaseAnonKey);
}

/** Read Supabase AAL for the current session. */
export async function getMfaAssurance(): Promise<MfaAssurance> {
  if (!isMfaProviderConfigured()) {
    return {
      providerConfigured: false,
      currentLevel: 'unknown',
      nextLevel: null,
      enrolled: false,
    };
  }

  try {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (error || !data) {
      return {
        providerConfigured: true,
        currentLevel: 'unknown',
        nextLevel: null,
        enrolled: false,
      };
    }
    const currentLevel = (data.currentLevel as 'aal1' | 'aal2' | null) ?? 'aal1';
    const nextLevel = (data.nextLevel as 'aal1' | 'aal2' | null) ?? null;
    return {
      providerConfigured: true,
      currentLevel,
      nextLevel,
      enrolled: currentLevel === 'aal2' || nextLevel === 'aal2',
    };
  } catch {
    return {
      providerConfigured: true,
      currentLevel: 'unknown',
      nextLevel: null,
      enrolled: false,
    };
  }
}

export async function getOrgMfaPolicy(organizationId: string): Promise<{
  mfaRequiredForStaff: boolean;
  organizationSlug: string | null;
}> {
  const org = await db.organization.findUnique({
    where: { id: organizationId },
    select: { mfaRequiredForStaff: true, slug: true },
  });
  return {
    mfaRequiredForStaff: org?.mfaRequiredForStaff ?? false,
    organizationSlug: org?.slug ?? null,
  };
}

/**
 * Staff must satisfy MFA when the org requires it.
 * Demo org never hard-blocks (still shows warnings).
 * Returns null when access is allowed, or a reason code when blocked.
 */
export async function evaluateStaffMfaGate(args: {
  userId: string;
  organizationId: string | null;
  organizationSlug: string | null;
  role: string;
}): Promise<{ allowed: boolean; reason?: string; assurance: MfaAssurance }> {
  const assurance = await getMfaAssurance();

  if (args.role === 'PATIENT' || !args.organizationId) {
    return { allowed: true, assurance };
  }

  const policy = await getOrgMfaPolicy(args.organizationId);
  if (!policy.mfaRequiredForStaff) {
    return { allowed: true, assurance };
  }

  // Demo org: warn but do not hard-block so sales demos keep working.
  if (args.organizationSlug === DEMO_ORG_SLUG || policy.organizationSlug === DEMO_ORG_SLUG) {
    return { allowed: true, assurance, reason: 'demo_org_soft_gate' };
  }

  if (!assurance.providerConfigured) {
    return {
      allowed: false,
      reason: 'mfa_provider_not_configured',
      assurance,
    };
  }

  if (assurance.currentLevel === 'aal2') {
    // Persist last verified timestamp (best-effort).
    void db.user
      .update({
        where: { id: args.userId },
        data: { mfaLastVerifiedAt: new Date() },
      })
      .catch(() => undefined);
    return { allowed: true, assurance };
  }

  return {
    allowed: false,
    reason: assurance.enrolled ? 'mfa_challenge_required' : 'mfa_enrollment_required',
    assurance,
  };
}

export async function recordMfaBypassAttempt(args: {
  organizationId: string | null;
  userId: string;
  path: string;
  reason: string;
}) {
  await audit({
    organizationId: args.organizationId,
    userId: args.userId,
    action: 'MFA_BYPASS_ATTEMPT',
    resourceType: 'MfaGate',
    success: false,
    metadata: { path: args.path, reason: args.reason },
  });
}
