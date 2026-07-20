import 'server-only';

import { serverEnv } from '@/lib/env';
import { validateEnvironment } from '@/lib/env';
import { isProductionApp, isDemoAppEnvironment } from '@/lib/production/mode';
import { isMfaProviderConfigured } from '@/lib/security/mfa';
import { isStripeConfigured } from '@/lib/providers/payments/stripe';
import { isGoogleBusinessConfigured } from '@/lib/providers/google-business';
import { db } from '@/lib/db';

export type ReadinessState = 'ready' | 'blocked' | 'needs_configuration' | 'demo_only';

export type ReadinessCheck = {
  id: string;
  label: string;
  state: ReadinessState;
  detail: string;
};

export type PhiReadinessReport = {
  canEnableLivePhi: boolean;
  overall: ReadinessState;
  checks: ReadinessCheck[];
  blockers: string[];
};

function envBaa(flag: boolean, configured: boolean, label: string, id: string): ReadinessCheck {
  if (!configured) {
    return {
      id,
      label,
      state: 'needs_configuration',
      detail: `${label} credentials are not configured`,
    };
  }
  if (!flag) {
    return {
      id,
      label,
      state: 'blocked',
      detail: `${label} BAA is not marked complete`,
    };
  }
  return {
    id,
    label,
    state: 'ready',
    detail: `${label} configured with BAA confirmed`,
  };
}

/**
 * Hard production PHI readiness gate.
 * Live PHI must not be enabled unless all critical checks pass.
 */
export async function evaluatePhiReadiness(organizationId?: string | null): Promise<PhiReadinessReport> {
  const checks: ReadinessCheck[] = [];
  const envIssues = validateEnvironment();

  if (isDemoAppEnvironment()) {
    checks.push({
      id: 'demo_mode',
      label: 'Environment mode',
      state: 'demo_only',
      detail: 'Demo/development mode — live PHI is not permitted',
    });
  } else if (isProductionApp()) {
    checks.push({
      id: 'app_env',
      label: 'Environment mode',
      state: 'ready',
      detail: 'APP_ENV=production',
    });
  } else {
    checks.push({
      id: 'app_env',
      label: 'Environment mode',
      state: 'needs_configuration',
      detail: `APP_ENV=${serverEnv.appEnv} — set production for live PHI`,
    });
  }

  const envErrors = envIssues.filter((i) => i.level === 'error');
  checks.push({
    id: 'env_validation',
    label: 'Environment validation',
    state: envErrors.length ? 'blocked' : 'ready',
    detail: envErrors.length
      ? envErrors.map((e) => e.message).join('; ')
      : 'Required production env vars present',
  });

  checks.push({
    id: 'audit_logging',
    label: 'Audit logging',
    state: serverEnv.auditLogSink === 'db' || serverEnv.auditLogSink === 'external' ? 'ready' : 'blocked',
    detail: `AUDIT_LOG_SINK=${serverEnv.auditLogSink}`,
  });

  checks.push({
    id: 'mfa_provider',
    label: 'MFA provider (Supabase Auth)',
    state: isMfaProviderConfigured() ? 'ready' : 'blocked',
    detail: isMfaProviderConfigured()
      ? 'Supabase Auth MFA available'
      : 'MFA provider not configured — set NEXT_PUBLIC_SUPABASE_URL and anon key',
  });

  checks.push({
    id: 'job_secret',
    label: 'Job processor secret',
    state: serverEnv.jobProcessorSecret ? 'ready' : isProductionApp() ? 'blocked' : 'needs_configuration',
    detail: serverEnv.jobProcessorSecret ? 'JOB_PROCESSOR_SECRET set' : 'JOB_PROCESSOR_SECRET missing',
  });

  const openaiConfigured = Boolean(serverEnv.openaiApiKey) && (serverEnv.aiMode === 'openai' || serverEnv.aiProvider === 'openai');
  checks.push(
    envBaa(
      serverEnv.openaiBaaConfirmed || serverEnv.aiBaaConfirmed,
      openaiConfigured || !serverEnv.aiAllowPhi,
      'OpenAI',
      'openai_baa',
    ),
  );

  if (serverEnv.aiAllowPhi) {
    if (!(serverEnv.openaiBaaConfirmed || serverEnv.aiBaaConfirmed) || !openaiConfigured) {
      checks.push({
        id: 'ai_allow_phi_gate',
        label: 'AI_ALLOW_PHI gate',
        state: 'blocked',
        detail: 'AI_ALLOW_PHI=true requires OpenAI + BAA',
      });
    } else {
      checks.push({
        id: 'ai_allow_phi_gate',
        label: 'AI_ALLOW_PHI gate',
        state: 'ready',
        detail: 'PHI AI allowed with OpenAI BAA',
      });
    }
  } else {
    checks.push({
      id: 'ai_allow_phi_gate',
      label: 'AI_ALLOW_PHI gate',
      state: 'ready',
      detail: 'AI_ALLOW_PHI=false (PHI AI disabled)',
    });
  }

  const twilioConfigured = Boolean(
    serverEnv.twilioAccountSid && serverEnv.twilioAuthToken && serverEnv.twilioFromNumber,
  );
  checks.push(envBaa(serverEnv.twilioBaaConfirmed, twilioConfigured || true, 'Twilio SMS', 'twilio_baa'));
  // If not configured, mark needs_configuration rather than requiring BAA
  if (!twilioConfigured) {
    checks[checks.length - 1] = {
      id: 'twilio_baa',
      label: 'Twilio SMS',
      state: 'needs_configuration',
      detail: 'Twilio not configured — SMS with PHI disabled',
    };
  }

  const sendgridConfigured = Boolean(serverEnv.sendgridApiKey && serverEnv.sendgridFromEmail);
  if (!sendgridConfigured) {
    checks.push({
      id: 'sendgrid_baa',
      label: 'SendGrid email',
      state: 'needs_configuration',
      detail: 'SendGrid not configured — email with PHI disabled',
    });
  } else {
    checks.push(
      envBaa(serverEnv.sendgridBaaConfirmed, true, 'SendGrid email', 'sendgrid_baa'),
    );
  }

  checks.push({
    id: 'storage',
    label: 'Storage (Supabase)',
    state: serverEnv.supabaseServiceRoleKey ? 'ready' : 'needs_configuration',
    detail: serverEnv.supabaseServiceRoleKey
      ? 'Service role configured — confirm storage BAA operationally'
      : 'SUPABASE_SERVICE_ROLE_KEY missing',
  });

  checks.push({
    id: 'stripe',
    label: 'Stripe payments',
    state: isStripeConfigured()
      ? serverEnv.stripeWebhookSecret
        ? 'ready'
        : 'needs_configuration'
      : 'needs_configuration',
    detail: isStripeConfigured()
      ? serverEnv.stripeWebhookSecret
        ? 'Stripe keys + webhook secret present'
        : 'Stripe secret set but webhook secret missing'
      : 'Stripe not configured',
  });

  checks.push({
    id: 'google_business',
    label: 'Google Business Profile',
    state: isGoogleBusinessConfigured() ? 'ready' : 'demo_only',
    detail: isGoogleBusinessConfigured()
      ? 'Google Business API keys present'
      : 'Not configured — reputation stays demo-only',
  });

  if (organizationId) {
    const org = await db.organization.findUnique({
      where: { id: organizationId },
      select: {
        mfaRequiredForStaff: true,
        livePhiEnabled: true,
        controlledPilotEnabled: true,
        rlsVerifiedAt: true,
        auditVerifiedAt: true,
        backupLastAt: true,
        backupProvider: true,
        backupStatus: true,
        backupRetentionDays: true,
        backupRestoreTestAt: true,
        monitoringVerifiedAt: true,
        monitoringProvider: true,
        incidentResponseReviewedAt: true,
        slug: true,
      },
    });

    checks.push({
      id: 'org_mfa_policy',
      label: 'Organization MFA policy',
      state: org?.mfaRequiredForStaff ? 'ready' : 'blocked',
      detail: org?.mfaRequiredForStaff
        ? 'MFA required for staff'
        : 'Owners must require MFA for all staff before live PHI',
    });

    checks.push({
      id: 'org_rls',
      label: 'RLS verification',
      state: org?.rlsVerifiedAt ? 'ready' : 'blocked',
      detail: org?.rlsVerifiedAt
        ? `RLS verified at ${org.rlsVerifiedAt.toISOString()}`
        : 'Apply prisma/rls.sql and mark RLS verified in admin readiness',
    });

    checks.push({
      id: 'org_audit',
      label: 'Org audit verification',
      state: org?.auditVerifiedAt ? 'ready' : 'needs_configuration',
      detail: org?.auditVerifiedAt
        ? `Audit verified at ${org.auditVerifiedAt.toISOString()}`
        : 'Confirm audit log monitoring and mark verified',
    });

    const backupVerified =
      org?.backupStatus === 'verified' && Boolean(org.backupRestoreTestAt);
    checks.push({
      id: 'backup',
      label: 'Backup & restore',
      state: backupVerified
        ? 'ready'
        : org?.backupLastAt || org?.backupProvider
          ? 'needs_configuration'
          : 'blocked',
      detail: backupVerified
        ? `Verified restore ${org!.backupRestoreTestAt!.toISOString()} · provider ${org!.backupProvider ?? 'n/a'} · retention ${org!.backupRetentionDays ?? '?'}d`
        : 'Admin must attest backup provider, last backup, retention, and completed restore test — EyeQ does not auto-verify backups',
    });

    checks.push({
      id: 'monitoring',
      label: 'Monitoring & error tracking',
      state: org?.monitoringVerifiedAt
        ? 'ready'
        : 'blocked',
      detail: org?.monitoringVerifiedAt
        ? `Verified ${org.monitoringVerifiedAt.toISOString()} · ${org.monitoringProvider ?? 'configured'}`
        : serverEnv.errorTrackingDsn
          ? 'ERROR_TRACKING_DSN set — admin must mark monitoring verified after ops review'
          : 'Configure ERROR_TRACKING_PROVIDER/DSN (or equivalent) and mark monitoring verified — EyeQ does not auto-claim monitoring',
    });

    checks.push({
      id: 'incident_response',
      label: 'Incident response',
      state: org?.incidentResponseReviewedAt ? 'ready' : 'blocked',
      detail: org?.incidentResponseReviewedAt
        ? `Reviewed ${org.incidentResponseReviewedAt.toISOString()}`
        : 'Review docs/INCIDENT_RESPONSE_RUNBOOK.md and mark reviewed',
    });

    checks.push({
      id: 'controlled_pilot',
      label: 'Controlled pilot mode',
      state: org?.controlledPilotEnabled ? 'ready' : 'needs_configuration',
      detail: org?.controlledPilotEnabled
        ? 'Controlled live pilot enabled for this organization only'
        : 'Enable controlled pilot mode after readiness checks (org-scoped)',
    });

    checks.push({
      id: 'org_live_phi_flag',
      label: 'Org live PHI flag',
      state: org?.livePhiEnabled ? 'ready' : 'needs_configuration',
      detail: org?.livePhiEnabled
        ? 'Organization opted into live PHI'
        : 'livePhiEnabled=false — explicit org opt-in required',
    });
  }

  const blockers = checks
    .filter((c) => c.state === 'blocked')
    .map((c) => `${c.label}: ${c.detail}`);

  const hasDemoOnly = checks.some((c) => c.state === 'demo_only' && c.id === 'demo_mode');
  const hasNeeds = checks.some((c) => c.state === 'needs_configuration');
  const canEnableLivePhi =
    !hasDemoOnly &&
    blockers.length === 0 &&
    isProductionApp() &&
    !serverEnv.demoModeEnabled;

  let overall: ReadinessState = 'ready';
  if (hasDemoOnly) overall = 'demo_only';
  else if (blockers.length) overall = 'blocked';
  else if (hasNeeds || !canEnableLivePhi) overall = 'needs_configuration';

  return { canEnableLivePhi, overall, checks, blockers };
}

/**
 * Throws if production live PHI path is requested without readiness.
 * Call before PHI-sensitive vendor sends / AI with chart context.
 */
export async function assertLivePhiAllowed(organizationId: string | null | undefined): Promise<void> {
  if (!isProductionApp() || serverEnv.demoModeEnabled) {
    // Non-production: allow demo/dev; callers still use vendor gates.
    return;
  }

  const report = await evaluatePhiReadiness(organizationId);
  if (!report.canEnableLivePhi) {
    throw new Error(
      `Live PHI mode is blocked:\n${report.blockers.join('\n') || report.checks
        .filter((c) => c.state !== 'ready')
        .map((c) => `- ${c.label}: ${c.detail}`)
        .join('\n')}`,
    );
  }

  if (organizationId) {
    const org = await db.organization.findUnique({
      where: { id: organizationId },
      select: { livePhiEnabled: true, controlledPilotEnabled: true },
    });
    if (!org?.livePhiEnabled) {
      throw new Error('Organization has not enabled live PHI mode.');
    }
    if (!org.controlledPilotEnabled) {
      throw new Error(
        'Controlled pilot mode is not enabled for this organization. Enable it from Pilot launch after readiness checks pass.',
      );
    }
  }
}
