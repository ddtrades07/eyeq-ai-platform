# Google Reviews / Reputation Module

**Date:** July 20, 2026

## What works

- Reviews inbox UI (`/provider/reputation`)
- Questions inbox UI (`/provider/reputation/questions`)
- Reply drafts queue (`/provider/reputation/drafts`)
- Review analytics (`/provider/reputation/analytics`)
- Owner sidebar **Reputation** section (Google Reviews, Questions, Reply Drafts, Analytics)
- Dashboard Reputation card + Open Reputation Inbox
- AI / template draft replies (approve before publish)
- Sync of reviews (live API or demo seed)
- Escalation-friendly star ratings + internal draft workflow
- RBAC: `reputation:read` / `reputation:manage`
- Soft locked panel for roles without permission

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

- Seeded demo reviews (5-star, 3-star, negative, DRAFT, DEMO_PUBLISHED)
- Seeded Google questions (appointments, insurance, CL exams, one answered)
- Demo sync list when unconfigured / demoMode
- Demo-published replies

## Partially operational

- AI draft reply (gateway or template fallback)
- Live Google Questions publish adapter (demo stores answers as DEMO_PUBLISHED)

## Requires vendor keys

- `GOOGLE_BUSINESS_API_KEY`
- `GOOGLE_BUSINESS_ACCOUNT_ID`
- Full OAuth My Business publish adapter (still integration-ready)

## Requires BAA / compliance

- Treat review replies as public marketing: **PHI warning** before reply (do not paste chart details)
- No auto-posting without human approval

## Future roadmap

- Live OAuth publish adapter for reviews and questions
- Internal notes / escalation flags on negative reviews
- Sentiment analytics depth

## Honest advertising ban

Do not claim automatic Google publishing as confirmed public posts without a live connected API and `PUBLISHED` status.
