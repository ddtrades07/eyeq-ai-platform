# EyeQ AI — Integration Requirements

**Date:** July 6, 2026  
**Purpose:** Vendor options, BAA requirements, environment variables, and fallback behavior per integration category

---

## Summary matrix

| Category | Status | BAA required | Fallback when unconfigured |
|----------|--------|:------------:|----------------------------|
| Identity (Auth) | ✅ Supabase | Yes (Supabase) | Auth disabled; middleware passes null user |
| Database | ✅ Postgres/Prisma | Yes (host) | Build placeholder URL; runtime queries fail |
| Object storage | ✅ Supabase Storage | Yes (Supabase) | Upload actions error |
| AI / LLM | ⚠️ Gateway + stubs | Yes | Mock provider; copilot shows unconfigured message |
| Imaging analysis | ⚠️ Structured pipeline | Yes (if cloud Vision) | Heuristic / dev mock provider |
| Speech-to-text (scribe) | ❌ Interface only | Yes | Manual transcript; demo UI |
| SMS | ❌ Stub | Yes | `throw` on send; campaigns stay draft |
| Email | ❌ Stub | Yes | `throw` on send |
| Payments | ❌ Interface only | Yes (Stripe) | No pay button functionality |
| EHR / FHIR | ❌ Placeholder | Yes + vendor DUA | Status cards only; sync returns placeholder |
| Eligibility | ❌ Interface only | Yes | Not exposed in UI |
| Claims clearinghouse | ❌ Interface only | Yes | Not exposed in UI |
| ePrescribing | ❌ Interface only | Yes | Rx stored locally only |
| Embeddings / vector | ❌ Scaffold | Yes | No retrieval |
| Audit external sink | ❌ Stub | Depends on vendor | Falls back to stdout JSON |
| Error monitoring | ⚠️ Sentry hook | Optional | No remote error capture |

---

## 1. Identity & authentication

**Implementation:** Supabase Auth via `@supabase/ssr`  
**Code:** `src/lib/supabase/*`, `src/middleware.ts`

| Vendor option | Use case | BAA |
|---------------|----------|-----|
| **Supabase Auth** (default) | Email/password, OAuth callback | Required for PHI |
| SAML/OIDC (future) | Enterprise SSO | IdP + Supabase agreement |

### Environment variables

| Variable | Required | Notes |
|----------|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes (prod) | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes (prod) | Public; RLS must protect data |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes (server) | Demo provisioning only; never expose to client |

### Fallback

- Missing Supabase env → middleware returns `user: null`; protected routes redirect to `/login`
- Demo mode uses service role to provision demo org (`FEATURE_DEMO_MODE=true`)

---

## 2. Database

**Implementation:** PostgreSQL via Prisma 6  
**Code:** `prisma/schema.prisma`, `src/lib/db.ts`

| Vendor option | Notes | BAA |
|---------------|-------|-----|
| **Supabase Postgres** | Default; pooled `DATABASE_URL` port 6543 | Yes |
| Neon / RDS / self-hosted | Supported if Postgres 14+ | Yes with host |

### Environment variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | Pooled connection (PgBouncer) |
| `DIRECT_URL` | Migrations / Prisma Studio |

### Fallback

- Missing `DATABASE_URL` at build → placeholder string; runtime queries throw

---

## 3. Object storage (imaging & documents)

**Implementation:** Supabase Storage signed URLs  
**Code:** `src/lib/storage/upload.ts`, imaging upload API

| Variable | Default |
|----------|---------|
| `SUPABASE_STORAGE_BUCKET_IMAGING` | `imaging` |
| `SUPABASE_STORAGE_BUCKET_DOCUMENTS` | `documents` |

### Fallback

- Missing bucket → upload URL generation fails with server error
- Paths must include `{organizationId}/{patientId}/...` for isolation

---

## 4. AI / LLM (Ask EyeQ, chart drafts)

**Implementation:** AI Gateway → OpenAI / Anthropic / mock  
**Code:** `src/lib/ai-gateway/*`, `/api/copilot/stream`

| Vendor | Env selector | BAA flag |
|--------|--------------|----------|
| Mock | `AI_PROVIDER=mock` | N/A |
| OpenAI | `AI_PROVIDER=openai` | `OPENAI_BAA_CONFIRMED=true` |
| Anthropic | `AI_PROVIDER=anthropic` | `ANTHROPIC_BAA_CONFIRMED=true` |

### Key environment variables

See `ENVIRONMENT_VARIABLES.md` for full list. Critical:

- `AI_HIPAA_MODE=true` (default)
- `AI_ALLOW_PHI=false` (default)
- `AI_BAA_CONFIRMED=false` (default)
- `AI_EMERGENCY_SHUTDOWN=false`

### Fallback

- Unconfigured provider → copilot streams "AI assistant is not configured"
- PHI blocked → 403 from gateway with user-safe message
- Emergency shutdown → 503 all AI routes

---

## 5. Imaging analysis

**Implementation:** Structured orchestrator with pluggable providers  
**Code:** `src/lib/imaging/services/*`, `/api/imaging/analyze`

| Mode | Env | Behavior |
|------|-----|----------|
| Manual review | `IMAGING_ANALYSIS_MODE=manual` | Quality check only |
| Descriptive (OpenAI Vision) | `descriptive` + `OPENAI_API_KEY` | Structured findings JSON |
| Development mock | `IMAGING_DEV_MOCK=true` | Deterministic fake findings (dev only) |
| External validated | `external` + endpoint | Slot for FDA-cleared vendor |

### Environment variables

| Variable | Notes |
|----------|-------|
| `IMAGING_PROVIDER_MODE` | Provider selection |
| `IMAGING_ANALYSIS_MODE` | Pipeline mode |
| `IMAGING_ANALYSIS_ENDPOINT` / `_API_KEY` | External vendor |
| `IMAGING_AI_BAA_CONFIRMED` | Must be true for cloud analysis on PHI |
| `ENABLE_DEVELOPMENT_AI_MOCKS` | Global dev mock guard |

### Fallback

- No API key → heuristic / patient-risk metadata (not pixel-level diagnosis)
- Not gradable quality → `SKIPPED_NOT_GRADABLE` status

---

## 6. Speech-to-text (ambient scribe)

**Implementation:** `TranscriptionProvider` interface — **not implemented**  
**Code:** `src/lib/providers/transcription.ts`

| Vendor options (planned R2) | Notes |
|----------------------------|-------|
| Deepgram (medical) | BAA available |
| AWS Transcribe Medical | HIPAA eligible with BAA |
| Google Medical STT | Enterprise agreement |

### Environment variables

| Variable | Default |
|----------|---------|
| `TRANSCRIPTION_PROVIDER` | empty → unconfigured |
| `TRANSCRIPTION_API_KEY` | empty |
| `TRANSCRIPTION_BAA_CONFIRMED` | `false` |
| `TRANSCRIPTION_STORE_AUDIO` | `false` |

### Fallback

- UI shows demo/manual transcript entry when `demoMode && !transcriptionConfigured`
- `transcribe()` throws if invoked without config

---

## 7. SMS messaging

**Implementation:** `MessagingProvider` stub  
**Code:** `src/lib/providers/messaging.ts`

| Vendor options (planned R2) | BAA |
|----------------------------|-----|
| Twilio | Yes (HIPAA eligible with BAA) |
| Telnyx | Verify BAA |

### Environment variables (planned)

| Variable | Example |
|----------|---------|
| `SMS_PROVIDER` | `twilio` |
| `TWILIO_ACCOUNT_SID` | — |
| `TWILIO_AUTH_TOKEN` | server only |
| `TWILIO_FROM_NUMBER` | E.164 |

### Fallback

- `getMessagingProvider().send()` throws: *"SMS provider not configured"*
- Campaigns remain in `DRAFT` / `APPROVED` without delivery

---

## 8. Email

**Implementation:** `EmailProvider` stub

| Vendor options | BAA |
|----------------|-----|
| SendGrid | Available |
| AWS SES | Available |
| Postmark | Verify |

### Environment variables (planned)

| Variable | Example |
|----------|---------|
| `EMAIL_PROVIDER` | `sendgrid` |
| `SENDGRID_API_KEY` | server only |
| `EMAIL_FROM` | `noreply@practice.com` |

### Fallback

- Same throw pattern as SMS; portal messages still work in-app

---

## 9. Payments

**Implementation:** `PaymentProvider` interface — not wired  
**Code:** `src/lib/providers/index.ts`

| Vendor | Notes |
|--------|-------|
| Stripe | Recommended; Stripe BAA for PHI-adjacent metadata |

### Environment variables (planned R3)

| Variable | Notes |
|----------|-------|
| `STRIPE_SECRET_KEY` | Server only |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Client |
| `STRIPE_WEBHOOK_SECRET` | Webhook verification |

### Fallback

- Patient billing page shows contact message only; no checkout

---

## 10. EHR / practice management connectors

**Implementation:** Placeholder connectors for all methods  
**Code:** `src/lib/ehr/connector.ts`, `server/actions/ehr.ts`

| Vendor (enum) | Typical method | Status |
|---------------|----------------|--------|
| RevolutionEHR | API native / CSV | Placeholder |
| Eyefinity OfficeMate | API / HL7 | Placeholder |
| Compulink | API / HL7 | Placeholder |
| Crystal PM | CSV import | Placeholder |
| Epic / Cerner / athena | FHIR / SMART | Placeholder |

### Environment variables (per integration — stored in DB, not env)

- `baseUrl`, `scopes` on `EhrIntegration` model
- OAuth tokens **must** live in vault (not Prisma fields)

### Fallback

- `testConnection()` → `{ status: 'placeholder', message: '...' }`
- UI shows setup checklist; no live sync

---

## 11. Eligibility & claims (future)

**Interfaces:** `EligibilityProvider`, `ClaimsClearinghouseProvider`

| Vendor examples | BAA |
|-----------------|-----|
| Change Healthcare, Availity, Waystar | Yes |

### Fallback

- Not user-facing until R3; interfaces return unconfigured

---

## 12. ePrescribing (future)

**Interface:** `EPrescribingProvider`

| Vendor examples |
|-----------------|
| DrFirst Rcopia, Surescripts network |

### Fallback

- Prescriptions stored in EyeQ DB only; no pharmacy transmission

---

## 13. Embeddings / vector search

**Code:** `src/lib/ai-gateway/knowledge-retriever.ts` (partial)

| Variable | Default |
|----------|---------|
| `EMBEDDING_PROVIDER` | `openai` |
| `EMBEDDING_MODEL` | `text-embedding-3-small` |

### Fallback

- No pgvector → retrieval returns empty; copilot uses page context only

---

## 14. Observability

| Variable | Behavior |
|----------|----------|
| `SENTRY_DSN` | Error tracking (optional) |
| `AUDIT_LOG_SINK` | `db` (default), `stdout`, `external` (stub) |

---

## 15. Feature flags

| Variable | Default (prod) | Purpose |
|----------|----------------|---------|
| `FEATURE_DEMO_MODE` | `false` | One-click demo tenant |
| `FEATURE_PATIENT_PORTAL` | `true` | Patient routes |
| `FEATURE_AI_IMAGING_REVIEW` | `true` | AI imaging pipeline |
| `FEATURE_MULTI_LOCATION` | `true` | Location scoping UI |

---

## BAA checklist (before enabling PHI on vendor)

- [ ] Executed BAA with Supabase (project owner)
- [ ] Executed BAA with AI vendor (OpenAI/Anthropic) if `AI_ALLOW_PHI=true`
- [ ] Executed BAA with transcription vendor if storing audio
- [ ] Executed BAA with Twilio/SendGrid if sending PHI in messages
- [ ] Document subprocessors in privacy notice
- [ ] Set vendor-specific `*_BAA_CONFIRMED=true` only after legal sign-off

---

*See also: `ENVIRONMENT_VARIABLES.md`, `PRODUCTION_READINESS_CHECKLIST.md`*
