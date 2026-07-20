# EyeQ AI — Feature Matrix

**Date:** July 20, 2026  
**Legend**

| Status | Meaning |
|--------|---------|
| Production ready | Persistent, permissioned, auditable, usable end-to-end for a controlled pilot *after* BAAs / env gates |
| Functional but incomplete | Real DB/actions exist; missing pieces, edge-case bugs, or weak UX |
| UI only | Screens/copy without complete backend workflow |
| Mocked | Synthetic / stub / demo outcomes |
| Broken | Incorrect, fail-open, or unsafe behavior |
| Missing | Not implemented |
| Blocked by credentials | Code path exists; secrets/BAA required |
| Blocked by compliance / vendor contracting | Legal or vendor agreement / network required |

## Core platform

| Feature | Status | Notes |
|---------|--------|-------|
| Staff login (Supabase) | Production ready | MFA enforceable via org policy + AAL2 gate |
| Patient portal login | Functional but incomplete | MFA optional for portal |
| Forgot / reset password | Production ready | Pages exist |
| RBAC permissions | Production ready | |
| Multi-tenant org isolation (app layer) | Production ready | assertSameOrg + tests; Prisma still table-owner |
| Location scoping | Production ready | Fail-closed for scoped roles |
| Demo mode | Functional but incomplete | Soft MFA gate; never mix with real PHI |
| Audit log (mutations) | Production ready | Enriched fields; sparse READ still |
| Health check | Functional but incomplete | App/DB/AI/transcription |
| Background jobs | Production ready | Fail-closed without secret |
| Prisma migrations | Functional but incomplete | Pilot + live-PHI migrations present |
| CI / Playwright | Functional but incomplete | Unit+build+public e2e in CI; full demo e2e needs secrets |
| MFA enforcement | Production ready | Requires Supabase Auth; honest not-configured state |
| Production PHI gate | Production ready | Admin readiness screen; fail closed |
| Vendor BAA readiness UI | Production ready | Configured states; no secret display |
| Reminder sending | Functional but incomplete | Blocked without vendor/BAA; demo-sent labeled |
| Clinical AI PHI | Functional but incomplete | OpenAI+BAA+AI_ALLOW_PHI required |
| RLS | Functional but incomplete | SQL expanded; mark verified after ops apply |
| Guardian / proxy portal | Missing | Schema only |

## Clinical operations

| Feature | Status | Notes |
|---------|--------|-------|
| Dashboard (role personas) | Functional but incomplete | Real queries; some metric semantics still soft |
| Patient search / registry | Production ready | |
| Patient chart (read) | Production ready | Exam chart link from appointments |
| Clinical note authoring UI | Production ready | Draft → review → sign; no auto-sign |
| Note sign / lock | Production ready | Amend marks original `AMENDED` |
| Exam chart workspace | Production ready | Discoverable from schedule + patient appointments |
| Prescriptions (glasses/CL) authoring | Production ready | Draft + provider sign-off |
| e-Prescribing medications | Missing | Vendor-contract blocked |
| Appointments CRUD | Production ready | |
| Walk-in encounter | Production ready | Lightweight `WALK_IN` appointment + encounter |
| Online booking requests | Production ready | Request → staff convert/decline |
| Conflict detection | Production ready | Unit-tested |
| Check-in / patient flow | Functional but incomplete | Status-driven; limited checkout |
| Encounter sync | Functional but incomplete | Now syncs on reschedule |
| Pre-charting / pretest | Functional but incomplete | Draft notes |
| Ambient scribe sessions | Functional but incomplete | Manual/demo without STT |
| Ambient ASR | Blocked by credentials | Deepgram path exists |
| Imaging upload | Production ready | Storage BAA needed |
| Imaging AI analysis | Blocked by credentials / incomplete | Manual-only message when unconfigured |
| Provider imaging review | Production ready | |
| Care gaps queue | Production ready | |
| AI copilots / Ask EyeQ | Functional but incomplete | OpenAI / demo mock / disabled states |

## Business / optical / RCM

| Feature | Status | Notes |
|---------|--------|-------|
| Invoices | Functional but incomplete | Payment ledger foundation added |
| Stripe patient checkout | Blocked by credentials | Webhook signature + idempotency + ledger |
| Demo pay invoice | Mocked | |
| Claims draft + validation | Functional but incomplete | |
| Electronic claim submit | Mocked | Stub clearinghouse |
| Manual claim submit | Production ready | |
| Eligibility 270/271 | Missing / Mocked stub | |
| ERA 835 | Missing | Placeholder only if labeled not connected |
| Reminders templates/campaigns | Functional but incomplete | Send credential/BAA gated |
| Google review AI drafts | Functional but incomplete | Template fallback |
| Google live sync/publish | Functional but incomplete | Demo → `DEMO_PUBLISHED`; live not fake |
| Workflow builder | UI only / incomplete | Persist templates; not consumed |
| Data migration center | Functional but incomplete | Patients CSV scaffold |
| Reputation page | Functional but incomplete | Demo connection seeded |
| Guardian / proxy portal | Missing | Schema planned (`PatientProxyAccess`) |

## Patient portal

| Feature | Status | Notes |
|---------|--------|-------|
| Home / visits / Rx read | Production ready | Prefer signed/active Rx |
| Secure messages | Production ready | |
| Online booking | Production ready | Creates `AppointmentRequest` + message |
| Billing / pay | Blocked by credentials | Stripe / demo |

## Honest advertising ban list

Do not claim without closing corresponding blockers:

- HIPAA certified / ONC certified EHR
- Live EHR bidirectional sync
- Real-time eligibility or clearinghouse submissions as production
- Hands-free medical ambient scribe as default
- FDA-cleared imaging diagnosis
- Automatic Google review publishing without live API
- Complete RCM / A/R aging (ledger foundation only)
