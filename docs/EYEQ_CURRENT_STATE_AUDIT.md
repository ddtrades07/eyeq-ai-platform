# EyeQ AI — Current State Audit

**Date:** July 6, 2026  
**Scope:** Full codebase review — `eyeq-ai-platform/` (Next.js 15 App Router, Prisma 6, Supabase Auth/Storage)  
**Route count:** ~82 App Router segments (54 pages, 11 API routes, loading/error layouts, auth callback, legacy redirects)

---

## Executive summary

EyeQ AI is a **multi-tenant optometry platform** with a clear **provider (`/provider/*`) / patient (`/patient/*`)** split. Core clinical workflows—scheduling, patients, structured imaging review, care gaps, messaging, RBAC, and audit logging—are **implemented with real database persistence**. A new **AI Gateway** layer (PHI safety gate, tenant isolation, model routing) is in place and partially wired to the copilot.

Several areas remain **UI-only, stubbed, or demo-seeded**: EHR connectors, ambient scribe STT, outbound SMS/email, claims/payments, and vector search. Demo mode is now **gated by `FEATURE_DEMO_MODE`** (defaults off in production).

**Release 1 is partially complete:** `Encounter` and `StaffTask` models and server actions exist; provider adapter interfaces are defined; API routes enforce staff auth; demo provisioning is env-gated.

---

## 1. Completed / production-quality features

| Area | Routes / entry points | Backend | Notes |
|------|----------------------|---------|-------|
| **Authentication** | `/login`, `/signup`, `/signup-patient`, `/auth/callback`, `/api/auth/sign-out` | Supabase SSR + Prisma `User` mirror | Session refresh via middleware |
| **RBAC** | All staff/patient pages | `src/lib/auth/rbac.ts`, `requirePermission()` | 13 roles, 40+ permissions |
| **Multi-tenant isolation** | Server actions | `assertSameOrg()` on mutations | Org-scoped Prisma queries |
| **Dashboard / Brain** | `/provider/dashboard` | DB queries + intelligence rules | Today insights, proactive alerts |
| **Appointments** | `/provider/appointments`, `/provider/scheduling` | CRUD server actions + revalidation | Status workflow enums |
| **Patients** | `/provider/patients`, `/provider/patients/[id]` | Full chart tabs (notes, imaging, rx, gaps) | Search by name, DOB, phone, email |
| **Pre-charting** | `/provider/pre-charting` | Server queries | Visit prep from chart data |
| **Imaging pipeline** | `/provider/imaging`, `[id]`, `compare`, `imaging-timeline` | Structured orchestrator, quality assessment, provider review | OpenAI Vision when configured; dev mock otherwise |
| **Care gaps** | `/provider/care-gaps` | `CareGap` model + actions | Recall / follow-up queue |
| **Messaging** | `/provider/messages`, `/patient/messages` | `MessageThread` / `Message` | Portal + internal channels |
| **Clinical notes** | Patient chart | SOAP fields, sign-off lifecycle | Disease template insertion |
| **Prescriptions** | Patient chart + portal | Glasses + contacts per-eye fields | Read/write by clinical roles |
| **Audit log** | `/provider/audit-logs` | `AuditLog` model, `audit()` helper | `AUDIT_LOG_SINK=db\|stdout\|external` |
| **Team / roles** | `/provider/team` | Invite, role assignment | Last-owner protection |
| **Inventory** | `/provider/inventory` | Items + activity log | Reorder thresholds |
| **Reminders (templates/campaigns)** | `/provider/reminders` | DB CRUD | Campaign approval workflow; **no real send** |
| **Financial reports** | `/provider/financial-reports` | Snapshot `FinancialReport` | Owner/Admin + `finance:read` |
| **Admin insights** | `/provider/admin-insights` | Aggregated metrics | Gated to `finance:read` |
| **Disease templates** | `/provider/disease-templates` | System + org templates | Documentation scaffolds only |
| **Timeline intelligence** | `/provider/timeline-intelligence` | Rule engine | Explainable, non-diagnostic |
| **AI copilot (Ask EyeQ)** | Command bar, `/api/copilot/stream` | AI Gateway + legacy copilot path | PHI gate; mock when unconfigured |
| **AI Gateway infrastructure** | Settings → AI, `/api/admin/ai/status` | `AiGatewayRequest`, PHI events, usage records | Central enforcement layer |
| **Encounters (Release 1)** | Appointment flow | `Encounter` model + `encounters.ts` actions | Status mapped from appointment |
| **Staff tasks (Release 1)** | `/provider/tasks` | `StaffTask` model + `tasks.ts` actions | Create, complete, assign |
| **Patient portal** | `/patient/home`, visits, prescriptions, forms, education, book | Portal actions + RBAC `portal:self` | Signed notes + approved imaging only |
| **Demo mode** | Login page, demo banner | `FEATURE_DEMO_MODE` + `provision.ts` | Isolated demo org; reset/exit |

---

## 2. UI-only / mock / prototype logic

| Feature | What renders | What actually runs | Risk if mis-marketed |
|---------|--------------|-------------------|----------------------|
| **EHR integrations** | `/provider/ehr-integrations` | Placeholder connectors return `{ status: 'placeholder' }` | "Live Epic sync" |
| **Ambient scribe STT** | `/provider/ambient-scribe` | Manual transcript entry / demo segments; `getTranscriptionProvider()` unconfigured | "Hands-free documentation" |
| **SMS / Email reminders** | `/provider/reminders` | `getMessagingProvider()` / `getEmailProvider()` throw if called | "Automated recall texts" |
| **Billing / claims** | `/provider/billing`, `/patient/billing` | Invoice **display** from `PatientInvoice`; no claims engine | "Revenue cycle management" |
| **Payments** | Patient billing copy | No `PaymentProvider` implementation | "Pay online" |
| **Eligibility / clearinghouse** | Adapter interfaces only | Not wired | "Real-time eligibility" |
| **E-prescribing** | Interface only | Not wired | "Send Rx to pharmacy" |
| **Vector / embeddings search** | Copilot context scaffold | `getVectorSearchProvider()` returns null | "Longitudinal AI memory" |
| **External audit sink** | Env flag | Logs JSON stub to stdout | "SOC2-grade logging" |
| **Workflow builder** | `/provider/workflow-builder` | Template UI; limited execution | "Custom automation engine" |
| **Installation readiness** | `/provider/installation-readiness` | Checklist UI | Implies go-live certification |

---

## 3. Broken or missing routes

| Path | Issue |
|------|-------|
| `/onboarding` | Referenced in `requireStaffUser()` when `organizationId` is null — **no page exists** → 404 |
| `/forgot-password` | Listed in middleware `PUBLIC_ROUTES` — **no page** |
| `/reset-password` | Listed in middleware `PUBLIC_ROUTES` — **no page** |
| Legacy `/dashboard`, `/portal/*` | Redirect to `/provider/*` and `/patient/*` (308) — works |

---

## 4. Missing APIs, tables, and permissions

### REST API coverage (thin layer)

Only **10 API routes** exist; most domains use **server actions only**:

| Exists | Missing REST mirrors |
|--------|---------------------|
| `/api/patients`, `/api/appointments`, `/api/care-gaps` | Notes, prescriptions, messaging, inventory, team, encounters, tasks |
| `/api/imaging/upload-url`, `/api/imaging/analyze` | Imaging list, sign-off, compare |
| `/api/copilot/stream`, `/api/admin/ai/status` | Scribe, reminders send, EHR sync |
| `/api/health`, `/api/auth/sign-out` | Webhooks (Twilio, Stripe, FHIR) |

### Permission gaps

| Gap | Detail |
|-----|--------|
| **Staff tasks** | `createStaffTask` uses `org:read` — overly broad; no dedicated `tasks:*` permission |
| **API routes** | Some check `isStaffRole` only, not granular permissions (e.g. imaging analyze) |
| **Patient portal AI** | Patients have `ai:use` — gateway must restrict clinical actions (partially done) |

### Schema note

`prisma/schema.prisma` contains a **syntax error** around lines 59–69 (orphaned `AppointmentStatus` enum values without `enum AppointmentStatus {`). Prisma generate may fail until fixed.

---

## 5. Security observations

| ID | Severity | Finding |
|----|----------|---------|
| SEC-01 | High | Demo mode provisions shared credentials; must stay **`FEATURE_DEMO_MODE=false`** in production PHI environments |
| SEC-02 | High | AI PHI transmission blocked by default (`AI_ALLOW_PHI=false`) — correct; marketing must not imply cloud AI on PHI without BAA |
| SEC-03 | Medium | API routes lack permission-level checks on some endpoints |
| SEC-04 | Medium | No Supabase RLS policies documented/enforced at DB layer — isolation relies on app code |
| SEC-05 | Medium | `/api/admin/ai/status` — verify admin-only gate in production |
| SEC-06 | Low | Middleware auth skipped when Supabase env missing — intentional for build preview |
| SEC-07 | Low | Demo org uses predictable emails/passwords in constants |

---

## 6. Duplicates and simplification candidates

| Item | Location | Recommendation |
|------|----------|----------------|
| **Image quality service** | `src/lib/imaging/image-quality-service.ts` AND `services/image-quality-service.ts` | Consolidate to one module |
| **AI provider paths** | Legacy `src/lib/ai/*` + new `src/lib/ai-gateway/*` | Migrate all AI calls through gateway; deprecate direct provider calls |
| **Imaging review** | `imaging-review-service.ts` vs orchestrator | Single entry point (`runStructuredReview`) |
| **Legacy route redirects** | Middleware `LEGACY_STAFF_ROUTES` | Keep until analytics show zero hits, then remove |
| **Financial + admin insights** | Overlapping owner metrics | Merge or clearly differentiate |
| **Copilots page + command bar** | Two AI entry UIs | Unify UX under Ask EyeQ |

---

## 7. Performance notes

| Observation | Impact | Mitigation status |
|-------------|--------|-------------------|
| Heavy client shell (copilot, command bar) | Large JS on staff pages | Partially lazy-loaded via `LazyClientShell` |
| Duplicate patient fetches | Chart + intelligence | Partially deduplicated |
| No WebSocket / realtime schedule | Manual refresh after mutations | By design for pilot |
| Imaging analysis | Up to 60s API route | `maxDuration` set; needs queue for scale |
| Full org aggregates | Financial reports | Snapshot model helps |

---

## 8. Test coverage

| Suite | File | Status (July 6, 2026) |
|-------|------|------------------------|
| Imaging descriptive schema | `descriptive-schema.test.ts` | ✅ 2 tests pass |
| Image quality | `image-quality-service.test.ts` | ✅ 4 tests pass |
| RBAC | `rbac.test.ts` | ✅ 5 tests pass |
| PHI safety gate | `phi-safety-gate.test.ts` | ❌ Fails — `server-only` import in Vitest |

**Total:** 11 passing tests across 3 files; 1 suite blocked by test harness config.

**Missing test areas:** Server actions, API auth, tenant isolation, imaging orchestrator E2E, demo provisioning, encounter/task workflows.

---

## 9. What to remove or simplify (pre-GA)

1. **Disable demo mode** in any environment holding real PHI.
2. **Remove or gate** workflow builder and installation readiness until executable.
3. **Hide EHR "Connect" buttons** until at least one real connector ships.
4. **Rename billing pages** to "Invoices" until claims/payments exist.
5. **Fix `/onboarding`** or remove redirect — blocking new staff signup flow.
6. **Fix Prisma schema** enum syntax before next migration.
7. **Consolidate duplicate imaging modules** to reduce maintenance drift.

---

## 10. Cannot advertise yet

- HIPAA compliance or "certified EHR"
- Automated SMS/email recall campaigns
- Live EHR bidirectional sync (RevolutionEHR, Eyefinity, etc.)
- Insurance eligibility or claims submission
- Online patient payments
- Hands-free ambient scribe with medical-grade ASR
- FDA-cleared diagnostic AI
- Real-time multi-location schedule board
- Enterprise SSO / SAML (not implemented)

---

## 11. PHI risk summary

| Vector | Control | Residual risk |
|--------|---------|---------------|
| AI copilot outbound | PHI safety gate + BAA flags | User paste of SSN/names may block or redact; regex not NER-complete |
| Demo tenant | Separate org slug `eyeq-demo` | Shared demo login if enabled in prod |
| Imaging to OpenAI | Server-only keys; optional Vision | Requires signed BAA + `IMAGING_AI_BAA_CONFIRMED` |
| Audit log metadata | May contain resource IDs | Needs retention + access policy |
| Supabase Storage | Signed URLs for imaging | Bucket policies must restrict cross-tenant reads |
| Transcript storage | `TRANSCRIPTION_STORE_AUDIO` default false | Enable only with BAA'd ASR vendor |

---

## 12. Release 1 status (partial)

| Item | Status |
|------|--------|
| `Encounter` model + actions | ✅ Done |
| `StaffTask` model + `/provider/tasks` | ✅ Done |
| Provider adapter interfaces (`src/lib/providers/`) | ✅ Defined; stubs for most vendors |
| API auth tightened (staff + org checks) | ✅ Partial — not all routes use permissions |
| Demo gated (`FEATURE_DEMO_MODE`) | ✅ Done |
| Onboarding flow for new practices | ❌ Missing page |
| PHI test suite green | ❌ Vitest config fix needed |

---

*This document reflects the codebase as of July 6, 2026. Re-audit after Release 1 completion or before any pilot with real PHI.*
