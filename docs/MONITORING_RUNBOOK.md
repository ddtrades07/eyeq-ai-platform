# Monitoring runbook

## Goals

Detect outages and errors without logging secrets or PHI. Production ops attest monitoring on PHI readiness; EyeQ does not auto-claim “verified.”

## Configuration

| Env | Purpose |
| --- | --- |
| `ERROR_TRACKING_PROVIDER` | e.g. `sentry` or `none` |
| `ERROR_TRACKING_DSN` | Provider DSN (server only) |
| `MONITORING_WEBHOOK_URL` | Optional ops webhook for health alerts |
| `AUDIT_LOG_SINK` | `db` / `external` |
| `JOB_PROCESSOR_SECRET` | Required for background jobs in production |

Admin UI: **Settings → PHI readiness** / **Pilot launch** → mark monitoring verified after review.

## Health surfaces

- `GET /api/health`: process + DB + vendor configuration snapshot (no secrets).
- Pilot launch page: app, database, jobs, email/SMS, AI, storage status.
- Structured server errors via `logServerError(scope, err, meta)`: redacts key-like fields.

## User-facing errors

Use `safeUserErrorMessage(err)` in production paths. Never echo emails, tokens, or raw vendor payloads to clients.

## What to watch

1. `/api/health` overall `down` or database unreachable
2. Spike in `server_error` logs
3. Reminder / job failures (`JOB_PROCESSOR_SECRET`, Twilio/SendGrid degraded)
4. AI emergency shutdown or blocked PHI AI requests
5. Stripe webhook failures
6. Storage upload failures

## Response

1. Confirm scope (single org vs platform).
2. Check vendor status pages (Twilio, SendGrid, OpenAI, Supabase, Stripe).
3. Disable risky features if needed (controlled pilot off, `AI_EMERGENCY_SHUTDOWN`, reminder campaigns paused).
4. Follow `docs/INCIDENT_RESPONSE_RUNBOOK.md` for PHI / isolation events.
5. After recovery, record monitoring verification timestamp if this was first production attestation.

## Manual

- Wiring a specific APM SDK is ops-owned once `ERROR_TRACKING_*` is set.
- On-call rotation and paging are outside EyeQ.
