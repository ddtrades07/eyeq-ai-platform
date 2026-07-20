// Centralised environment access with light validation.
//
// We avoid throwing at module-evaluation time so that `next build`
// can collect page data even when the build runner doesn't have
// production secrets. Reads that *truly* require a value (DB queries,
// signed-storage URLs) call `requireServerEnv(...)` at request time.

function optional(name: string, fallback = ''): string {
  return process.env[name] ?? fallback;
}

export function requireServerEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v;
}

// Server-only: never expose service-role keys to the browser.
export const serverEnv = {
  // Build-time placeholder is safe, Prisma only attempts to use this when
  // a query actually runs. At request time the real env var is read.
  databaseUrl:
    process.env.DATABASE_URL ?? 'postgresql://localhost:5432/eyeq-build-placeholder',
  directUrl: optional('DIRECT_URL'),
  supabaseServiceRoleKey: optional('SUPABASE_SERVICE_ROLE_KEY'),
  storageBucketImaging: optional('SUPABASE_STORAGE_BUCKET_IMAGING', 'imaging'),
  storageBucketDocuments: optional(
    'SUPABASE_STORAGE_BUCKET_DOCUMENTS',
    'documents',
  ),
  aiProvider: optional('AI_PROVIDER', 'mock'),
  aiMode: optional('AI_MODE', optional('AI_PROVIDER', 'mock')),
  openaiApiKey: optional('OPENAI_API_KEY'),
  openaiModel: optional('OPENAI_MODEL', 'gpt-4o-mini'),
  anthropicApiKey: optional('ANTHROPIC_API_KEY'),
  anthropicModel: optional('ANTHROPIC_MODEL', 'claude-3-5-sonnet-latest'),
  aiFallbackProvider: optional('AI_FALLBACK_PROVIDER'),
  aiFallbackModel: optional('AI_FALLBACK_MODEL'),
  aiHipaaMode: optional('AI_HIPAA_MODE', 'true') === 'true',
  aiBaaConfirmed: optional('AI_BAA_CONFIRMED', 'false') === 'true',
  aiAllowPhi: optional('AI_ALLOW_PHI', 'false') === 'true',
  aiRequireProviderReview: optional('AI_REQUIRE_PROVIDER_REVIEW', 'true') === 'true',
  aiLoggingMode: optional('AI_LOGGING_MODE', 'redacted'),
  aiLogRedactedOnly: optional('AI_LOG_REDACTED_ONLY', 'true') === 'true',
  aiDailyCostLimit: Number(optional('AI_DAILY_COST_LIMIT', '0')) || undefined,
  aiMonthlyCostLimit: Number(optional('AI_MONTHLY_COST_LIMIT', '0')) || undefined,
  aiRequestTimeoutMs: Number(optional('AI_REQUEST_TIMEOUT', '30000')),
  aiMaxRetries: Number(optional('AI_MAX_RETRIES', '1')),
  aiEmergencyShutdown: optional('AI_EMERGENCY_SHUTDOWN', 'false') === 'true',
  appEnv: optional('APP_ENV', process.env.NODE_ENV === 'production' ? 'production' : 'development'),
  demoModeEnabled: optional('DEMO_MODE', optional('FEATURE_DEMO_MODE', process.env.NODE_ENV === 'development' ? 'true' : 'false')) === 'true',
  allowSeedData: optional('ALLOW_SEED_DATA', 'false') === 'true',
  allowSimulatedClaims: optional('ALLOW_SIMULATED_CLAIMS', 'false') === 'true',
  allowSimulatedPayments: optional('ALLOW_SIMULATED_PAYMENTS', 'false') === 'true',
  allowTestMessages: optional('ALLOW_TEST_MESSAGES', 'false') === 'true',
  openaiBaaConfirmed: optional('OPENAI_BAA_CONFIRMED', 'false') === 'true',
  anthropicBaaConfirmed: optional('ANTHROPIC_BAA_CONFIRMED', 'false') === 'true',
  transcriptionProvider: optional('TRANSCRIPTION_PROVIDER'),
  transcriptionApiKey: optional('TRANSCRIPTION_API_KEY'),
  transcriptionBaaConfirmed: optional('TRANSCRIPTION_BAA_CONFIRMED', 'false') === 'true',
  transcriptionStoreAudio: optional('TRANSCRIPTION_STORE_AUDIO', 'false') === 'true',
  imagingAiProvider: optional('IMAGING_AI_PROVIDER'),
  imagingAiApiKey: optional('IMAGING_AI_API_KEY'),
  imagingAiBaaConfirmed: optional('IMAGING_AI_BAA_CONFIRMED', 'false') === 'true',
  embeddingProvider: optional('EMBEDDING_PROVIDER', 'openai'),
  embeddingModel: optional('EMBEDDING_MODEL', 'text-embedding-3-small'),
  auditLogSink: optional('AUDIT_LOG_SINK', 'db'),
  imagingAnalysisMode: optional('IMAGING_ANALYSIS_MODE', 'manual'),
  twilioAccountSid: optional('TWILIO_ACCOUNT_SID'),
  twilioAuthToken: optional('TWILIO_AUTH_TOKEN'),
  twilioFromNumber: optional('TWILIO_FROM_NUMBER'),
  twilioBaaConfirmed: optional('TWILIO_BAA_CONFIRMED', 'false') === 'true',
  sendgridApiKey: optional('SENDGRID_API_KEY'),
  sendgridFromEmail: optional('SENDGRID_FROM_EMAIL'),
  sendgridBaaConfirmed: optional('SENDGRID_BAA_CONFIRMED', 'false') === 'true',
  clearinghouseEnabled: optional('CLEARINGHOUSE_ENABLED', 'false') === 'true',
  jobProcessorSecret: optional('JOB_PROCESSOR_SECRET'),
  stripeSecretKey: optional('STRIPE_SECRET_KEY'),
  stripeWebhookSecret: optional('STRIPE_WEBHOOK_SECRET'),
  auditWebhookUrl: optional('AUDIT_WEBHOOK_URL'),
  auditWebhookSecret: optional('AUDIT_WEBHOOK_SECRET'),
  googleBusinessApiKey: optional('GOOGLE_BUSINESS_API_KEY'),
  googleBusinessAccountId: optional('GOOGLE_BUSINESS_ACCOUNT_ID'),
  errorTrackingProvider: optional('ERROR_TRACKING_PROVIDER'), // e.g. sentry | none
  errorTrackingDsn: optional('ERROR_TRACKING_DSN'),
  monitoringWebhookUrl: optional('MONITORING_WEBHOOK_URL'),
};

// Safe to expose to the browser; only NEXT_PUBLIC_* values.
export const publicEnv = {
  appUrl: optional('NEXT_PUBLIC_APP_URL', 'http://localhost:3000'),
  appName: optional('NEXT_PUBLIC_APP_NAME', 'EyeQ AI'),
  supabaseUrl: optional('NEXT_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: optional('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
  aiProvider: optional('NEXT_PUBLIC_AI_PROVIDER', 'mock'),
};

export const features = {
  patientPortal: optional('FEATURE_PATIENT_PORTAL', 'true') === 'true',
  aiImagingReview: optional('FEATURE_AI_IMAGING_REVIEW', 'true') === 'true',
  multiLocation: optional('FEATURE_MULTI_LOCATION', 'true') === 'true',
};

export type EnvValidationIssue = {
  level: 'error' | 'warning';
  code: string;
  message: string;
};

/**
 * Validate environment for the current APP_ENV. Production fails hard on
 * missing core secrets; demo/dev may warn but continue.
 */
export function validateEnvironment(): EnvValidationIssue[] {
  const issues: EnvValidationIssue[] = [];
  const appEnv = serverEnv.appEnv;
  const isProd = appEnv === 'production';

  const requireInProd = (name: string, value: string | undefined, code: string) => {
    if (!value) {
      issues.push({
        level: isProd ? 'error' : 'warning',
        code,
        message: `${name} is ${isProd ? 'required' : 'recommended'} for ${appEnv}`,
      });
    }
  };

  requireInProd('DATABASE_URL', process.env.DATABASE_URL, 'missing_database_url');
  requireInProd('NEXT_PUBLIC_SUPABASE_URL', publicEnv.supabaseUrl, 'missing_supabase_url');
  requireInProd('NEXT_PUBLIC_SUPABASE_ANON_KEY', publicEnv.supabaseAnonKey, 'missing_supabase_anon');
  requireInProd('SUPABASE_SERVICE_ROLE_KEY', serverEnv.supabaseServiceRoleKey, 'missing_supabase_service');
  requireInProd('JOB_PROCESSOR_SECRET', serverEnv.jobProcessorSecret, 'missing_job_secret');

  if (isProd && serverEnv.demoModeEnabled) {
    issues.push({
      level: 'error',
      code: 'demo_mode_in_production',
      message: 'DEMO_MODE cannot be enabled in production PHI environments',
    });
  }

  if (isProd && serverEnv.aiAllowPhi) {
    if (serverEnv.aiProvider !== 'openai' && serverEnv.aiMode !== 'openai') {
      issues.push({
        level: 'error',
        code: 'ai_provider_not_openai',
        message: 'Production PHI AI requires AI_PROVIDER/AI_MODE=openai',
      });
    }
    if (!serverEnv.openaiApiKey) {
      issues.push({
        level: 'error',
        code: 'missing_openai_key',
        message: 'OPENAI_API_KEY is required when AI_ALLOW_PHI=true in production',
      });
    }
    if (!serverEnv.openaiBaaConfirmed && !serverEnv.aiBaaConfirmed) {
      issues.push({
        level: 'error',
        code: 'missing_ai_baa',
        message: 'OPENAI_BAA_CONFIRMED or AI_BAA_CONFIRMED must be true before PHI AI',
      });
    }
  }

  if (isProd && serverEnv.stripeSecretKey && !serverEnv.stripeWebhookSecret) {
    issues.push({
      level: 'error',
      code: 'missing_stripe_webhook',
      message: 'STRIPE_WEBHOOK_SECRET is required when STRIPE_SECRET_KEY is set in production',
    });
  }

  return issues;
}

export function assertProductionEnvironmentSafe(): void {
  if (serverEnv.appEnv !== 'production') return;
  const errors = validateEnvironment().filter((i) => i.level === 'error');
  if (errors.length > 0) {
    throw new Error(
      `Production environment validation failed:\n${errors.map((e) => `- ${e.message}`).join('\n')}`,
    );
  }
}
