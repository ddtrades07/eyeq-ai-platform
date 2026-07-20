# Google Reviews / Reputation Module

**Date:** July 20, 2026

## What works

- Reviews inbox UI (`/provider/reputation`)
- AI / template draft replies (approve before publish)
- Sync of reviews (live API or demo seed)
- Escalation-friendly star ratings + internal draft workflow
- RBAC: `reputation:read` / `reputation:manage`

## Connection states

| State | Meaning |
|-------|---------|
| Connected | Live Google keys present and non-demo connection |
| Demo mode | Connection `demoMode=true` — demo reviews only |
| Not configured | Missing `GOOGLE_BUSINESS_API_KEY` / account id |
| Permission error | Live adapter rejects (future OAuth errors) |

## Publish integrity

| Mode | DB status | Reality |
|------|-----------|---------|
| Live API success | `PUBLISHED` | Posted to Google |
| Demo connection | `DEMO_PUBLISHED` | **Not** posted publicly — demo only |
| Missing keys (non-demo) | Error | Does **not** fake publish |

## Demo-only

- Seeded demo reviews
- Demo sync list when unconfigured / demoMode
- Demo-published replies

## Partially operational

- AI draft reply (gateway or template fallback)
- Questions inbox (UI scaffold may expand)

## Requires vendor keys

- `GOOGLE_BUSINESS_API_KEY`
- `GOOGLE_BUSINESS_ACCOUNT_ID`
- Full OAuth My Business publish adapter (still integration-ready)

## Requires BAA / compliance

- Treat review replies as public marketing: **PHI warning** before reply (do not paste chart details)
- No auto-posting without human approval

## Future roadmap

- Google Questions inbox + reply
- Internal notes / escalation flags on negative reviews
- Live OAuth publish adapter
- Sentiment analytics

## Honest advertising ban

Do not claim automatic Google publishing as confirmed public posts without a live connected API and `PUBLISHED` status.
