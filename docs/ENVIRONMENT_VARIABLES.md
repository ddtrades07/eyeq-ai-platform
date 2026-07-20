# EyeQ Environment Variables

**Date:** July 20, 2026

Use this as the single reference for local demo, pilot, and production PHI gates.  
Missing production-required vars should fail clearly — do not silently mock success.

## Core

| Variable | Required in prod | Notes |
|----------|------------------|-------|
| `DATABASE_URL` | Yes | Postgres connection |
| `DIRECT_URL` | Recommended | Prisma migrations / shadow |
| `APP_ENV` | Yes | `development` \| `demo` \| `staging` \| `production` |
| `DEMO_MODE` / `FEATURE_DEMO_MODE` | No | Must be `false` in PHI production |
| `ALLOW_SEED_DATA` | No | Never true in production |
| `NEXT_PUBLIC_APP_URL` | Yes | Public app origin |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Auth |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Auth |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Server storage / admin |
| `JOB_PROCESSOR_SECRET` | Yes | Cron job processor bearer token |

## AI (OpenAI-only for production PHI)

| Variable | Required for PHI AI | Notes |
|----------|---------------------|-------|
| `OPENAI_API_KEY` | Yes | Never expose to frontend |
| `OPENAI_MODEL` | No | Default `gpt-4o-mini` |
| `AI_PROVIDER` | Yes | Use `openai` for live; `mock` for demo |
| `AI_MODE` | Recommended | Prefer `openai` \| `mock` \| `disabled` |
| `AI_ALLOW_PHI` | Yes (explicit) | Default `false` |
| `AI_REQUIRE_PROVIDER_REVIEW` | Recommended | Default `true` |
| `AI_LOGGING_MODE` | Recommended | `redacted` (default) \| `off` \| `full` (never full in prod) |
| `AI_BAA_CONFIRMED` / `OPENAI_BAA_CONFIRMED` | Yes for PHI | Legal gate |
| `AI_HIPAA_MODE` | Recommended | Default `true` |
| `NEXT_PUBLIC_AI_PROVIDER` | Optional | UI badge only — not the key |

Public website AI must not accept PHI. Clinical AI must stay organization-scoped, role-gated, audit-logged, and provider-reviewed.

## Speech / imaging AI

| Variable | Notes |
|----------|-------|
| `TRANSCRIPTION_PROVIDER` | e.g. `deepgram` |
| `TRANSCRIPTION_API_KEY` | Required for live ambient speech |
| `TRANSCRIPTION_BAA_CONFIRMED` | PHI gate |
| `IMAGING_AI_PROVIDER` / `IMAGING_AI_API_KEY` | Validated imaging vendor or OpenAI vision |
| `IMAGING_ANALYSIS_MODE` | `manual` (default) \| vendor mode |
| `IMAGING_AI_BAA_CONFIRMED` | PHI gate |

If unset: show **Not configured** / **Manual review only** — never fabricate findings.

## Comms

| Variable | Notes |
|----------|-------|
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_FROM_NUMBER` | SMS |
| `TWILIO_BAA_CONFIRMED` | Required before PHI SMS |
| `SENDGRID_API_KEY` / `SENDGRID_FROM_EMAIL` | Email |
| `SENDGRID_BAA_CONFIRMED` | Required before PHI email |

If unset: reminders show disabled / not configured. Do not pretend messages sent.

## Monitoring / ops

| Variable | Notes |
|----------|-------|
| `ERROR_TRACKING_PROVIDER` | e.g. `sentry` or `none` |
| `ERROR_TRACKING_DSN` | Server-only DSN — never expose to client |
| `MONITORING_WEBHOOK_URL` | Optional ops webhook |

Admin must still mark monitoring verified on PHI readiness. EyeQ does not auto-claim monitoring.

## Payments

| Variable | Notes |
|----------|-------|
| `STRIPE_SECRET_KEY` | Required for live checkout |
| `STRIPE_WEBHOOK_SECRET` | Required in production when Stripe enabled |
| `ALLOW_SIMULATED_PAYMENTS` | Demo only |

## Google Business / reputation

| Variable | Notes |
|----------|-------|
| `GOOGLE_BUSINESS_API_KEY` | Live GBP |
| `GOOGLE_BUSINESS_ACCOUNT_ID` | Live GBP |

If unset or `demoMode` on connection: sync uses demo reviews; publish → `DEMO_PUBLISHED` only.

## Simulated / stub flags (never for PHI prod)

| Variable | Notes |
|----------|-------|
| `ALLOW_SIMULATED_CLAIMS` | Clearinghouse stub |
| `ALLOW_TEST_MESSAGES` | Non-prod only |
| `CLEARINGHOUSE_ENABLED` | Stub until real vendor |

## Startup validation

`src/lib/env.ts` exports:

- `validateEnvironment()` — returns errors/warnings
- `assertProductionEnvironmentSafe()` — throws on production errors

Call these from health / boot paths in production deploys.
