import 'server-only';

import { serverEnv } from '@/lib/env';
import { isProductionApp } from '@/lib/production/mode';
import { isStripeConfigured } from '@/lib/providers/payments/stripe';
import { resolveAiRuntimeState } from '@/lib/ai';
import { isTranscriptionAvailable } from '@/lib/providers/transcription';
import { db } from '@/lib/db';

export type ServiceHealth = {
  id: string;
  label: string;
  status: 'ok' | 'degraded' | 'down' | 'not_configured';
  detail: string;
};

/** Build admin-visible health snapshot without secrets or PHI. */
export async function getOpsHealthSnapshot(): Promise<{
  overall: 'ok' | 'degraded' | 'down';
  services: ServiceHealth[];
  errorTrackingConfigured: boolean;
}> {
  const services: ServiceHealth[] = [
    { id: 'app', label: 'Application', status: 'ok', detail: 'Process responding' },
  ];

  try {
    await db.$queryRaw`SELECT 1`;
    services.push({ id: 'database', label: 'Database', status: 'ok', detail: 'Query ok' });
  } catch {
    services.push({ id: 'database', label: 'Database', status: 'down', detail: 'Unreachable' });
  }

  const ai = resolveAiRuntimeState();
  services.push({
    id: 'ai',
    label: 'AI vendor',
    status:
      serverEnv.aiEmergencyShutdown
        ? 'down'
        : ai.status === 'openai'
          ? 'ok'
          : ai.status === 'demo_mock'
            ? 'degraded'
            : 'not_configured',
    detail: ai.label,
  });

  const smsOk = Boolean(
    serverEnv.twilioAccountSid && serverEnv.twilioAuthToken && serverEnv.twilioFromNumber,
  );
  services.push({
    id: 'sms',
    label: 'SMS (Twilio)',
    status: smsOk ? (serverEnv.twilioBaaConfirmed ? 'ok' : 'degraded') : 'not_configured',
    detail: smsOk
      ? serverEnv.twilioBaaConfirmed
        ? 'Configured'
        : 'Configured — BAA incomplete'
      : 'Not configured',
  });

  const emailOk = Boolean(serverEnv.sendgridApiKey && serverEnv.sendgridFromEmail);
  services.push({
    id: 'email',
    label: 'Email (SendGrid)',
    status: emailOk ? (serverEnv.sendgridBaaConfirmed ? 'ok' : 'degraded') : 'not_configured',
    detail: emailOk
      ? serverEnv.sendgridBaaConfirmed
        ? 'Configured'
        : 'Configured — BAA incomplete'
      : 'Not configured',
  });

  services.push({
    id: 'storage',
    label: 'Storage',
    status: serverEnv.supabaseServiceRoleKey ? 'ok' : 'not_configured',
    detail: serverEnv.supabaseServiceRoleKey ? 'Service role present' : 'Not configured',
  });

  services.push({
    id: 'stripe',
    label: 'Payments (Stripe)',
    status: isStripeConfigured()
      ? serverEnv.stripeWebhookSecret
        ? 'ok'
        : 'degraded'
      : 'not_configured',
    detail: isStripeConfigured()
      ? serverEnv.stripeWebhookSecret
        ? 'Keys + webhook'
        : 'Webhook secret missing'
      : 'Not configured',
  });

  services.push({
    id: 'jobs',
    label: 'Background jobs',
    status: serverEnv.jobProcessorSecret
      ? 'ok'
      : isProductionApp()
        ? 'down'
        : 'degraded',
    detail: serverEnv.jobProcessorSecret ? 'Secret configured' : 'JOB_PROCESSOR_SECRET missing',
  });

  services.push({
    id: 'transcription',
    label: 'Speech / transcription',
    status: isTranscriptionAvailable() ? 'ok' : 'not_configured',
    detail: isTranscriptionAvailable() ? 'Configured' : 'Not configured',
  });

  const errorTrackingConfigured = Boolean(
    serverEnv.errorTrackingProvider &&
      serverEnv.errorTrackingProvider !== 'none' &&
      serverEnv.errorTrackingDsn,
  );

  const overall = services.some((s) => s.status === 'down')
    ? 'down'
    : services.some((s) => s.status === 'degraded')
      ? 'degraded'
      : 'ok';

  return { overall, services, errorTrackingConfigured };
}

/** Safe production error message — never include PHI or secrets. */
export function safeUserErrorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (!(err instanceof Error)) return fallback;
  const msg = err.message;
  // Strip emails, phone-like, and key-like tokens.
  if (/sk-|Bearer |password|ssn|phi/i.test(msg)) return fallback;
  if (msg.length > 200) return fallback;
  return msg || fallback;
}

export function logServerError(scope: string, err: unknown, meta?: Record<string, unknown>) {
  const safeMeta = { ...(meta ?? {}) };
  for (const key of Object.keys(safeMeta)) {
    const v = String(safeMeta[key] ?? '');
    if (/sk-|password|token|secret|ssn/i.test(key) || /sk-|Bearer /i.test(v)) {
      safeMeta[key] = '[redacted]';
    }
  }
  // eslint-disable-next-line no-console
  console.error(
    JSON.stringify({
      kind: 'server_error',
      scope,
      message: err instanceof Error ? err.message.slice(0, 300) : 'unknown',
      meta: safeMeta,
      at: new Date().toISOString(),
    }),
  );
}
