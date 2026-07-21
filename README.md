# EyeQ AI. Practice Operating Platform

EyeQ AI is a production-grade SaaS foundation for optometry practices.

It ships a Next.js 15 App Router app, a Prisma + PostgreSQL data layer, Supabase Auth / Storage integrations, an AI-provider abstraction (mocked by default, swappable to OpenAI / Anthropic), multi-tenant RBAC, an audit log, server actions for every core domain, REST endpoints that mirror them, and a polished UI with a staff console and patient portal.

> **Safety posture.** EyeQ AI surfaces *review-support* signals only. It does **not** diagnose disease. Final clinical interpretation always belongs to the supervising provider. The platform-level disclaimer is rendered alongside any AI output by design.

---

## Stack

| Layer        | Tooling                                                                 |
| ------------ | ----------------------------------------------------------------------- |
| Framework    | **Next.js 15 (App Router)**, React 19, TypeScript                       |
| Styling      | **TailwindCSS 3**, shadcn/ui-style primitives, lucide-react             |
| Data fetching| **TanStack Query v5**, Next.js Server Components + Server Actions       |
| Client state | **Zustand** for ephemeral UI prefs                                      |
| Database     | **PostgreSQL**, **Prisma 6** (migrations + seed)                        |
| Auth         | **Supabase Auth** (SSR via `@supabase/ssr`)                             |
| Storage      | **Supabase Storage** with signed upload URLs                            |
| Validation   | **Zod**                                                                  |
| AI           | Pluggable `AIProvider` interface (mock / OpenAI / Anthropic)            |
| Audit        | DB or stdout sink, switchable via env var                               |

---

## Folder structure

```
eyeq-ai-platform/
├── prisma/
│   ├── schema.prisma          # 13 models, enums, indexes
│   └── seed.ts                # demo org + patients + visits + imaging
├── src/
│   ├── middleware.ts          # Supabase session refresh + auth gating
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── globals.css
│   │   ├── page.tsx           # marketing landing
│   │   ├── (auth)/            # login / signup / patient signup
│   │   ├── auth/callback/     # OAuth / magic-link return
│   │   ├── (staff)/           # /dashboard, /appointments, /patients, ...
│   │   ├── portal/            # patient portal pages
│   │   └── api/               # REST mirrors of the server actions
│   ├── components/
│   │   ├── ui/                # shadcn-style primitives
│   │   ├── layout/            # sidebars, topbar
│   │   ├── appointments/
│   │   ├── patients/
│   │   ├── imaging/
│   │   ├── care-gaps/
│   │   ├── dashboard/
│   │   ├── safety/            # SafetyDisclaimer
│   │   └── providers/         # TanStack Query + Toaster
│   ├── lib/
│   │   ├── db.ts              # Prisma singleton
│   │   ├── env.ts             # validated env access
│   │   ├── utils.ts           # cn, formatters
│   │   ├── server-action.ts   # typed server-action wrapper
│   │   ├── supabase/          # browser, server, middleware clients
│   │   ├── auth/              # session, RBAC, require helpers
│   │   ├── ai/                # provider interface, mock/openai/anthropic
│   │   ├── audit/             # audit log helper
│   │   ├── storage/           # signed-upload helper
│   │   └── zod/               # shared schemas
│   ├── server/
│   │   ├── actions/           # 'use server' mutations (auth, appts, ...)
│   │   └── queries/           # read-only helpers (dashboard, listings)
│   └── store/
│       └── ui.ts              # Zustand UI store
├── docs/
│   ├── ARCHITECTURE.md
│   ├── SECURITY.md
│   └── AI_ROADMAP.md
├── .env.example
├── package.json
└── tailwind.config.ts
```

---

## Prisma schema summary

The schema is multi-tenant: every clinical / operational row is scoped by `organizationId`.

| Model                  | Notes                                                             |
| ---------------------- | ----------------------------------------------------------------- |
| `Organization`         | Tenant root. Tracks slug, mode (Native EHR / Connected EHR), tz. |
| `Location`             | Per-org sites (multi-location ready).                            |
| `User`                 | Mirror of a Supabase Auth user. Role on the default org.          |
| `OrganizationMembership` | Supports future multi-org accounts.                            |
| `Provider`             | A clinician (linked to a `User`).                                 |
| `Patient`              | Demographics + risk flags. Optional `userId` for portal access.   |
| `Appointment`          | Status / type enums, provider + location, AI signals.             |
| `ImagingCase`          | Storage path, image type, AI signals, provider sign-off.          |
| `ClinicalNote`         | SOAP fields + signed lifecycle.                                   |
| `Prescription`         | Glasses + contacts (per-eye fields).                              |
| `CareGap`              | Recall queue with type + priority + suggested action.             |
| `MessageThread` / `Message` | Portal + internal channels, read tracking.                  |
| `Document`             | Per-patient consents/insurance/etc.                               |
| `AuditLog`             | Cross-resource audit trail.                                       |

Enums cover roles, appointment status / type, imaging type / status, clinical-note status, care-gap type / status, message channel + direction, audit actions, and practice mode.

### New in this release

| Model                       | Notes                                                                                                |
| --------------------------- | ---------------------------------------------------------------------------------------------------- |
| `EhrIntegration`            | One row per configured EHR connector. No tokens: those live in a vault.                              |
| `EhrSyncLog`                | Structured "what would have been sent" envelope for every test / sync.                                |
| `DiseaseTemplate`           | Documentation scaffolds (HPI, exam, plan, education, coding, referral): provider always signs.       |
| `InventoryItem` / `InventoryActivity` | Optical, dry-eye, drops, supplies, trial CLs; reorder thresholds + activity log.            |
| `AmbientScribeSession` / `TranscriptSegment` | Consent-gated session with speaker-labelled transcript and AI draft artifacts.       |
| `ReminderTemplate` / `ReminderCampaign` / `CommunicationPreference` / `MessageDeliveryLog` | Communication automation with vendor-agnostic delivery log. |
| `FinancialReport`           | Snapshot store for owner / admin operational reports.                                                  |
| `TranslationString`         | Per-org overrides on top of the shipped i18n dictionaries.                                            |

### Practice modes

- **Native EHR Mode**. EyeQ AI is the EHR. All clinical data lives in this platform.
- **Connected EHR Mode**. EyeQ AI sits on top of an existing EHR (Epic, Cerner, athenahealth, eClinicalWorks, NextGen, DrChrono, RevolutionEHR, Eyefinity / OfficeMate, Crystal PM, Compulink, MaximEyes, iTRUST, or a custom FHIR endpoint). Use the **EHR Integration Center** to configure each connector.

---

## Setup

### 1. Prerequisites

- Node 20+
- A PostgreSQL 14+ instance (Supabase Postgres works; so does local Docker)
- A Supabase project for Auth + Storage

### 2. Install

```bash
cd eyeq-ai-platform
npm install
```

### 3. Configure env

Copy `.env.example` to `.env.local` and fill in:

```bash
cp .env.example .env.local
```

Key variables:

```
DATABASE_URL         # Pooled URL (Prisma client)
DIRECT_URL           # Direct URL (Prisma migrations)
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_STORAGE_BUCKET_IMAGING   # default: "imaging"
SUPABASE_STORAGE_BUCKET_DOCUMENTS # default: "documents"
AI_PROVIDER          # mock | openai | anthropic
```

In Supabase Storage, create the buckets named above (private). The app issues short-lived signed URLs for uploads & downloads: no public bucket exposure.

### 4. Database

```bash
npm run db:migrate    # creates migrations + applies them
npm run db:seed       # creates the Sunrise Eye Care demo org
```

The seed inserts demo users with `supabaseUserId = seed-<role>-uid`. To **actually log them in**, create matching Supabase Auth users (via the Supabase dashboard or `supabase.auth.admin.createUser`) and update each `User.supabaseUserId` to the real UID: or simply sign up fresh accounts at `/signup` and `/signup-patient`.

### 5. Run

```bash
npm run dev
```

App boots at <http://localhost:3000>.

- Marketing / landing: `/`
- Staff sign-up: `/signup`
- Patient sign-up: `/signup-patient`
- Health check: `/api/health`

---

## Required environment variables

| Variable                                  | Required | Purpose                                          |
| ----------------------------------------- | -------- | ------------------------------------------------ |
| `DATABASE_URL`                            | yes      | Pooled Postgres URL (used at request time).      |
| `DIRECT_URL`                              | yes      | Direct Postgres URL (used by Prisma migrate).    |
| `NEXT_PUBLIC_APP_URL`                     | yes      | Base URL used in absolute links.                 |
| `NEXT_PUBLIC_APP_NAME`                    | yes      | Display name.                                    |
| `NEXT_PUBLIC_SUPABASE_URL`                | yes      | Supabase project URL.                            |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`           | yes      | Browser-safe Supabase key.                       |
| `SUPABASE_SERVICE_ROLE_KEY`               | yes\*    | Server-only key; required for signed uploads.    |
| `SUPABASE_STORAGE_BUCKET_IMAGING`         | yes      | Bucket for imaging uploads.                      |
| `SUPABASE_STORAGE_BUCKET_DOCUMENTS`       | yes      | Bucket for patient documents.                    |
| `AI_PROVIDER`                             | yes      | `mock` (default) / `openai` / `anthropic`.       |
| `OPENAI_API_KEY` / `OPENAI_MODEL`         | only if using OpenAI |                                  |
| `ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL`   | only if using Anthropic |                              |
| `AUDIT_LOG_SINK`                          | yes      | `db` (default) / `stdout` / `external`.          |
| `FEATURE_*`                               | optional | Feature flags. Default: enabled.                 |

`*` only required if you turn on storage uploads; the rest of the app boots without it.

---

## Local commands

```bash
npm run dev          # Next.js dev server
npm run build        # prisma generate + next build
npm run start        # production server
npm run typecheck    # tsc --noEmit
npm run lint         # next lint

npm run db:generate  # prisma generate
npm run db:migrate   # prisma migrate dev
npm run db:deploy    # prisma migrate deploy (CI / prod)
npm run db:reset     # destructive reset
npm run db:seed      # run prisma/seed.ts
npm run db:studio    # prisma studio GUI
```

---

## Deployment (Vercel + Supabase)

1. **Supabase**: create a project; provision Postgres + Storage buckets `imaging`, `documents` (private).
2. **Vercel**: import this folder as a project; set `Build command` to `npm run build` (it runs `prisma generate` first).
3. Add env vars in the Vercel project to mirror `.env.example`.
4. Run migrations from CI/CD or locally against your prod `DIRECT_URL`:
   ```bash
   DATABASE_URL=$PROD_DATABASE_URL DIRECT_URL=$PROD_DIRECT_URL npx prisma migrate deploy
   ```
5. (Optional) wire a cron call to `recomputeCareGaps` daily.

---

## Security posture

- Every server action calls `assertPermission(...)` before touching data; every record is verified against the caller's `organizationId` via `assertSameOrg(...)`.
- All mutations log to `AuditLog`.
- Imaging files live in a **private** Supabase Storage bucket; clients only ever see short-lived signed URLs.
- Patient portal traffic is gated by `requirePatientUser` + `requirePortalPatient`; the staff console is gated by `requireStaffUser`.
- `.env*` files are git-ignored. Service-role keys are loaded only in `server-only` files.
- See [`docs/SECURITY.md`](docs/SECURITY.md) for the HIPAA-aware checklist.

---

## What still needs real AI integrations

The architecture is wired end-to-end; the model calls themselves are stubbed.

- `src/lib/ai/openai.ts` and `src/lib/ai/anthropic.ts`: replace `throw new Error(...)` with real SDK calls. Models, retry, and JSON-mode handling are the only feature work left.
- `src/lib/ai/imaging.ts`: already orchestrates the call; with a real provider it will start producing structured imaging signals.
- Embeddings / vector search (`getVectorSearchProvider`): stub that returns `null`. Wire up `pgvector` or a managed vector DB when ready.
- Multimodal imaging (`getMultimodalImagingProvider`): stub that returns `null`. Hook a real vision model here when clinical validation supports it.
- Pre-charting + outreach script generation: prompts live in `src/lib/ai/prompts.ts`; build feature surfaces on top of `getAIProvider().complete(...)` once the vendor flip is approved.

Before flipping `AI_PROVIDER=openai|anthropic`, sign a BAA with the vendor and confirm your data-residency posture. See [`docs/AI_ROADMAP.md`](docs/AI_ROADMAP.md).

---

## Module map

| Module                          | Path                       | Permission       |
| ------------------------------- | -------------------------- | ---------------- |
| Practice Brain (dashboard)      | `/dashboard`               | `org:read`        |
| Appointments                    | `/appointments`            | `appointments:*`  |
| Patient Chart                   | `/patients/:id`            | `patients:read`   |
| Pre-Charting                    | `/pre-charting`            | `notes:read`      |
| Ambient Scribe                  | `/ambient-scribe`          | `scribe:use`      |
| Imaging Review                  | `/imaging`                 | `imaging:read`    |
| Imaging Timeline                | `/imaging-timeline`        | `imaging:read`    |
| Disease Templates               | `/disease-templates`       | `templates:read`  |
| Care Gap Autopilot              | `/care-gaps`               | `caregaps:read`   |
| AI Copilots                     | `/copilots`                | `org:read`        |
| Messages                        | `/messages`                | `messages:read`   |
| Scheduling                      | `/scheduling`              | `appointments:create` |
| Reminders                       | `/reminders`               | `reminders:read`  |
| Education Center                | `/education-center`        | `org:read`        |
| Inventory                       | `/inventory`               | `inventory:read`  |
| Financial Reports               | `/financial-reports`       | `finance:read`    |
| Admin Insights                  | `/admin-insights`          | `org:manage`      |
| Practice Setup                  | `/practice-setup`          | `org:manage`      |
| Workflow Builder                | `/workflow-builder`        | `org:manage`      |
| EHR Integrations                | `/ehr-integrations`        | `ehr:read`        |
| Settings                        | `/settings`                | `org:read`        |

---

## Internationalization

EyeQ AI ships UI scaffolding for English, Spanish, Hindi, Gujarati, Arabic, Chinese, and Vietnamese.

- Compile-time dictionary lives in `src/lib/i18n/dictionaries.ts`; missing keys fall back to English.
- The active locale resolves from the logged-in user's `preferredLocale`, then the `eyeq_locale` cookie, then English.
- Users change their language from the top-bar selector: it writes both the cookie and (when signed in) their DB preference.
- Per-org translation overrides live in `TranslationString` so practices can localize patient-facing strings without redeploying.
- Arabic (and any RTL locale you add) auto-flips `document.dir`.

> Clinical translations require a fluent clinician review before being used with real patients.

---

## What still needs real credentials / vendor work

| Capability                | What's wired                                          | What you still need                                            |
| ------------------------- | ----------------------------------------------------- | -------------------------------------------------------------- |
| AI provider (text)        | Provider abstraction + mock + scaffolds for OpenAI / Anthropic | SDK keys + BAA before flipping `AI_PROVIDER`.          |
| EHR integrations          | Connector abstraction, vendor catalog, sync log model | Vendor approvals + OAuth credentials in a real secrets vault.  |
| Epic on FHIR              | OAuth + resource map placeholders                     | Epic on FHIR client ID, BAA, sandbox validation.               |
| Ambient scribe            | Consent + recording UI + speaker-labelled transcript + draft generation (mock) | HIPAA-compliant ASR + LLM provider (e.g. Deepgram + Anthropic with BAA). |
| SMS reminders             | Templates + campaigns + delivery log + opt-in/out     | Twilio (with BAA) or another HIPAA-compliant SMS vendor.       |
| Email reminders           | Templates + campaigns + delivery log                  | HIPAA-compliant transactional email: **not** vanilla SendGrid for PHI. |
| Imaging                   | Storage + signed URLs + AI hand-off interface         | A clinical imaging review model + validation cohort.            |
| Financial reports         | Operational metrics derived from EyeQ data            | If you need encounter-level revenue, integrate practice billing data. |

---

## What is needed before pitching to real practices

1. **Compliance package**. BAA with every vendor (Supabase, AI provider, SMS, email, ambient-scribe vendor). Don't store PHI in non-BAA providers.
2. **Security review**: pen test, dependency audit, secrets management (Vercel + a vault for tokens).
3. **Clinical validation**: sign-off from a licensed OD on copy in disease templates, scribe outputs, reminders, and patient education.
4. **EHR connector go-live**: vendor approval, sandbox certification, then production cut-over.
5. **Localized clinical content**: fluent clinician review of non-English patient-facing strings (Spanish, Hindi, Gujarati, Arabic, Chinese, Vietnamese).
6. **Marketing site + portal branding**: finalize practice-facing copy and the patient portal welcome flow.
7. **Operational runbook**: backups, restore drills, incident response, on-call rotation.

---

## License & disclaimer

EyeQ AI is review-support software. It is **not** a medical device, **does not** provide medical advice, and **does not** diagnose disease. All clinical interpretation belongs to the supervising provider. Practices deploying EyeQ AI are responsible for HIPAA compliance in their environment.
