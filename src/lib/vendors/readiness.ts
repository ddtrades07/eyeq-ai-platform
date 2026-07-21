import 'server-only';

import type { VendorKind, VendorReadinessStatus } from '@prisma/client';
import { serverEnv } from '@/lib/env';
import { isStripeConfigured } from '@/lib/providers/payments/stripe';
import { isGoogleBusinessConfigured } from '@/lib/providers/google-business';
import { db } from '@/lib/db';
import type { ReadinessState } from '@/lib/production/phi-readiness';

export type VendorCard = {
  vendor: VendorKind;
  label: string;
  state: ReadinessState;
  statusLabel: string;
  configured: boolean;
  baaRequired: boolean;
  baaComplete: boolean;
  lastTestAt: string | null;
  lastTestOk: boolean | null;
  lastError: string | null;
  configHint: string | null;
  detail: string;
};

const VENDOR_META: { vendor: VendorKind; label: string; baaRequired: boolean }[] = [
  { vendor: 'OPENAI', label: 'OpenAI', baaRequired: true },
  { vendor: 'TWILIO', label: 'Twilio (SMS)', baaRequired: true },
  { vendor: 'SENDGRID', label: 'SendGrid (email)', baaRequired: true },
  { vendor: 'STRIPE', label: 'Stripe', baaRequired: false },
  { vendor: 'GOOGLE_BUSINESS', label: 'Google Business Profile', baaRequired: false },
  { vendor: 'STORAGE', label: 'Storage (Supabase)', baaRequired: true },
  { vendor: 'DEEPGRAM', label: 'Deepgram / speech', baaRequired: true },
  { vendor: 'CLEARINGHOUSE', label: 'Clearinghouse', baaRequired: true },
  { vendor: 'EHR', label: 'EHR integrations', baaRequired: true },
];

function maskHint(value: string | undefined | null): string | null {
  if (!value) return null;
  if (value.length <= 8) return '••••';
  return `${value.slice(0, 3)}…${value.slice(-4)}`;
}

export function detectVendorEnv(vendor: VendorKind): {
  configured: boolean;
  baaComplete: boolean;
  hint: string | null;
  detail: string;
} {
  switch (vendor) {
    case 'OPENAI':
      return {
        configured: Boolean(serverEnv.openaiApiKey) && (serverEnv.aiProvider === 'openai' || serverEnv.aiMode === 'openai'),
        baaComplete: serverEnv.openaiBaaConfirmed || serverEnv.aiBaaConfirmed,
        hint: maskHint(serverEnv.openaiApiKey),
        detail: serverEnv.openaiApiKey ? `Model ${serverEnv.openaiModel}` : 'OPENAI_API_KEY missing',
      };
    case 'TWILIO':
      return {
        configured: Boolean(serverEnv.twilioAccountSid && serverEnv.twilioAuthToken && serverEnv.twilioFromNumber),
        baaComplete: serverEnv.twilioBaaConfirmed,
        hint: maskHint(serverEnv.twilioAccountSid),
        detail: serverEnv.twilioFromNumber ? `From ${serverEnv.twilioFromNumber}` : 'Twilio credentials missing',
      };
    case 'SENDGRID':
      return {
        configured: Boolean(serverEnv.sendgridApiKey && serverEnv.sendgridFromEmail),
        baaComplete: serverEnv.sendgridBaaConfirmed,
        hint: maskHint(serverEnv.sendgridApiKey),
        detail: serverEnv.sendgridFromEmail ?? 'SendGrid not configured',
      };
    case 'STRIPE':
      return {
        configured: isStripeConfigured(),
        baaComplete: true,
        hint: maskHint(serverEnv.stripeSecretKey),
        detail: serverEnv.stripeWebhookSecret
          ? 'Secret + webhook configured'
          : isStripeConfigured()
            ? 'Webhook secret missing'
            : 'Stripe not configured',
      };
    case 'GOOGLE_BUSINESS':
      return {
        configured: isGoogleBusinessConfigured(),
        baaComplete: true,
        hint: maskHint(serverEnv.googleBusinessAccountId),
        detail: isGoogleBusinessConfigured() ? 'API keys present' : 'Demo / not configured',
      };
    case 'STORAGE':
      return {
        configured: Boolean(serverEnv.supabaseServiceRoleKey),
        baaComplete: Boolean(serverEnv.supabaseServiceRoleKey), // ops must still confirm BAA
        hint: maskHint(serverEnv.supabaseServiceRoleKey),
        detail: serverEnv.storageBucketImaging
          ? `Buckets: ${serverEnv.storageBucketImaging}`
          : 'Storage service role missing',
      };
    case 'DEEPGRAM':
      return {
        configured:
          Boolean(serverEnv.transcriptionApiKey) &&
          (serverEnv.transcriptionProvider?.toLowerCase() === 'deepgram' ||
            !serverEnv.transcriptionProvider),
        baaComplete: serverEnv.transcriptionBaaConfirmed,
        hint: maskHint(serverEnv.transcriptionApiKey),
        detail: serverEnv.transcriptionApiKey
          ? `Provider ${serverEnv.transcriptionProvider || 'deepgram'}`
          : 'Speech vendor not configured',
      };
    case 'CLEARINGHOUSE':
      return {
        configured: serverEnv.clearinghouseEnabled,
        baaComplete: false,
        hint: null,
        detail: serverEnv.clearinghouseEnabled
          ? 'Flag enabled: live adapter still placeholder'
          : 'Placeholder / not connected',
      };
    case 'EHR':
      return {
        configured: false,
        baaComplete: false,
        hint: null,
        detail: 'EHR sync is placeholder. FHIR inbound limited',
      };
    default:
      return { configured: false, baaComplete: false, hint: null, detail: 'Unknown' };
  }
}

function toUiState(args: {
  configured: boolean;
  baaRequired: boolean;
  baaComplete: boolean;
  dbStatus?: VendorReadinessStatus | null;
  vendor: VendorKind;
}): { state: ReadinessState; statusLabel: string } {
  if (args.dbStatus === 'PERMISSION_ERROR') {
    return { state: 'blocked', statusLabel: 'Permission error' };
  }
  if (args.dbStatus === 'DEMO_ONLY' || (!args.configured && (args.vendor === 'GOOGLE_BUSINESS' || args.vendor === 'CLEARINGHOUSE' || args.vendor === 'EHR'))) {
    return { state: 'demo_only', statusLabel: args.configured ? 'Configured for demo' : 'Demo only / placeholder' };
  }
  if (!args.configured) {
    return { state: 'needs_configuration', statusLabel: 'Not configured' };
  }
  if (args.baaRequired && !args.baaComplete) {
    return { state: 'blocked', statusLabel: 'BAA required' };
  }
  if (args.baaRequired && args.baaComplete) {
    return { state: 'ready', statusLabel: 'BAA complete' };
  }
  return { state: 'ready', statusLabel: 'Configured for production' };
}

export async function listVendorCards(organizationId: string): Promise<VendorCard[]> {
  const rows = await db.vendorReadiness.findMany({ where: { organizationId } });
  const byVendor = new Map(rows.map((r) => [r.vendor, r]));

  return VENDOR_META.map((meta) => {
    const env = detectVendorEnv(meta.vendor);
    const row = byVendor.get(meta.vendor);
    const baaComplete = Boolean(row?.baaCompletedAt) || env.baaComplete;
    const { state, statusLabel } = toUiState({
      configured: env.configured,
      baaRequired: meta.baaRequired,
      baaComplete,
      dbStatus: row?.status,
      vendor: meta.vendor,
    });

    return {
      vendor: meta.vendor,
      label: meta.label,
      state,
      statusLabel,
      configured: env.configured,
      baaRequired: meta.baaRequired,
      baaComplete,
      lastTestAt: row?.lastTestAt?.toISOString() ?? null,
      lastTestOk: row?.lastTestOk ?? null,
      lastError: row?.lastError ?? null,
      configHint: row?.configHint ?? env.hint,
      detail: env.detail,
    };
  });
}
