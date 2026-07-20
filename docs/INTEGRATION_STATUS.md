# EyeQ AI — Integration Status

**Date:** July 14, 2026  
**Rule:** An integration is only **Connected** if it actually connects. Simulated, demo, and placeholder paths must not be marketed as live.

## Status legend (as shown to practices)

| Status | Meaning |
|--------|---------|
| Available | Product capability ready when credentials + BAA present |
| Planned | Interface/docs only |
| Sandbox | Explicit demo/simulation |
| Credentials Required | Code path ready; env/secrets incomplete |
| Connected | Live vendor traffic validated |
| Syncing | Active bidirectional/inbound job |
| Error | Configured but failing |
| Disabled | Feature flag / env shut off |

## Matrix

| Integration | Code path | Card status today | Real vs simulated | Blockers |
|-------------|-----------|-------------------|-------------------|----------|
| Supabase Auth | Live | Connected when env set | Real | BAA for PHI |
| Postgres (Supabase) | Live | Connected | Real | BAA; migrations process |
| Supabase Storage | Live signed URLs | Credentials Required until buckets verified | Real | Private buckets + BAA |
| OpenAI (gateway) | Live | Credentials Required / mock default | Real when keyed | Force OpenAI-only in prod; BAA/`AI_ALLOW_PHI` |
| Anthropic | Live adapters | Should be **Disabled** in production policy | Real but **nonnegotiable violation** if enabled | Remove or hard-block in prod |
| Mock AI provider | Default in many envs | Sandbox | Simulated | Must be off for PHI |
| Imaging OpenAI Vision | Optional descriptive | Credentials Required | Real multimodal when keyed | Bypasses some gateway BAA gates |
| Imaging development-mock | Optional | Sandbox / **unsafe if prod** | Simulated findings | Ban in production |
| Imaging external validated | Interface | Planned | Not connected | Vendor contracting |
| Deepgram transcription | Adapter | Credentials Required | Real when BAA+key | Speaker mapping heuristics |
| Twilio SMS | Adapter | Credentials Required | Real outbound | BAA; STOP/callbacks missing |
| SendGrid email | Adapter | Credentials Required | Real outbound | BAA; bounce handling missing |
| Stripe Checkout | Adapter + webhook | Credentials Required | Real Checkout | Ledger + idempotency incomplete |
| Stripe refunds/disputes | — | Planned | Missing | |
| Clearinghouse claims | Stub | Sandbox | Simulated `STUB-*` | Vendor contracting |
| Eligibility 270/271 | Stub returns unknown | Planned / misleading UI | Simulated | Vendor + data model |
| ERA 835 | — | Planned | Missing | Manual EOB only |
| e-Prescribing | — | Planned | Missing | Surescripts / EPCS contracting |
| Google Business Profile | Stub/demo | Sandbox | Simulated reviews/publish | OAuth; fix false PUBLISHED |
| RevolutionEHR | Connector shell | Sandbox / Planned | Placeholder / partial | Vendor DUA + API |
| OfficeMate / Eyefinity / Epic / etc. | Catalog cards | Planned | Placeholder | Vendor contracting |
| FHIR R4 Patient inbound | Partial | Sandbox capable | Partial real HTTP | SSRF allowlist; no fake DOB |
| HL7 / MLLP devices | — | Planned | Missing | |
| DICOM / PACS / MWL | — | Planned | Missing | MIME only today |
| Optical lab EDI | — | Planned | Missing | Manual order tracker only |
| QuickBooks | — | Planned | Missing | |
| Calendar (Google/Microsoft) | — | Planned | Missing | |
| Sentry / OTel | Documented | Planned | Missing implementation | |
| External audit webhook | Optional sink | Credentials Required | Partial | Timeout/retry |
| Job cron runner | HTTP endpoint | Disabled / Error-prone | Real queue, weak ops | Secret required; no DLQ |

## Integration Center honesty rules

1. Never show **Configured/Connected** for Google, clearinghouse, or lab EDI unless a live probe succeeds.  
2. Demo Mode may show **Sandbox** only.  
3. Simulated claims require explicit `ALLOW_SIMULATED_CLAIMS` (or demo) and must be labeled on every submit.  
4. Google: connection mode = `DEMO | LIVE`; publishing must stay pending until vendor ACK.  
5. Eligibility card must not claim “manual verification always available on chart” until that write path exists.

## Env + BAA checklist (minimum before PHI)

- [ ] Supabase BAA + private buckets verified  
- [ ] `AI_PROVIDER=openai` only in production; Anthropic/mock blocked  
- [ ] `AI_BAA_CONFIRMED` + `AI_ALLOW_PHI` deliberate  
- [ ] `OPENAI_BAA_CONFIRMED` actually enforced (today largely unused)  
- [ ] Twilio/SendGrid BAA flags + keys  
- [ ] Stripe secret + webhook secret  
- [ ] `JOB_PROCESSOR_SECRET` required  
- [ ] Transcription BAA if audio stored  
- [ ] `FEATURE_DEMO_MODE=false` on PHI projects  

## Contrasts with older docs

`EYEQ_INTEGRATION_REQUIREMENTS.md` and `EYEQ_MASTER_STATUS.md` (July 6) understate Stripe/Twilio/SendGrid/job queue progress and overstate some EHR readiness. Prefer this file + code over stale matrices until those docs are rewritten.
