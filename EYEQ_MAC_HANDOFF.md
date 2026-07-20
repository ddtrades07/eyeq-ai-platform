# EyeQ AI — Complete Handoff (Mac + Google Drive)

Use this document with the project zip to continue development on your Mac.

**Project folder:** `eyeq-ai-platform`  
**Stack:** Next.js 15 · React 19 · TypeScript · Prisma · PostgreSQL (Supabase) · Supabase Auth

---

## 1. What’s in the zip

The zip contains the full EyeQ AI codebase **except**:

| Excluded | Why |
|----------|-----|
| `node_modules/` | Reinstall with `npm install` on Mac |
| `.next/` | Rebuilt on first `npm run dev` / `npm run build` |
| `.env.local` | **Secrets — not included.** Copy from `.env.example` and fill in (see §3) |

Everything else (source, Prisma schema, docs, components) is included.

---

## 2. Mac setup (first time)

### Prerequisites

- [Node.js 20+](https://nodejs.org/) (LTS)
- Git (optional)
- Supabase project (you already have one)

### Steps

```bash
# 1. Unzip and enter project
cd ~/Downloads/eyeq-ai-platform   # or wherever you put it

# 2. Install dependencies
npm install

# 3. Create local env (see §3)
cp .env.example .env.local
# Edit .env.local with your Supabase + DB credentials

# 4. Push schema & seed demo data
npm run db:push
npm run db:seed

# 5. Run
npm run dev
```

Open **http://localhost:3000** → Login or **Demo mode**.

### Verify build

```bash
npm run typecheck   # tsc --noEmit
npm run build       # production build
```

---

## 3. Environment variables (`.env.local`)

Copy `.env.example` to `.env.local`. Minimum for local dev:

```env
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_APP_NAME="EyeQ AI"

NEXT_PUBLIC_SUPABASE_URL="https://YOUR_PROJECT.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your_anon_key"
SUPABASE_SERVICE_ROLE_KEY="your_service_role_key"

# Supabase Postgres — use session pooler (port 5432) for local dev
DATABASE_URL="postgresql://postgres.PROJECT_REF:PASSWORD@aws-1-us-west-2.pooler.supabase.com:5432/postgres?connection_limit=10&pool_timeout=20"
DIRECT_URL="postgresql://postgres.PROJECT_REF:PASSWORD@aws-1-us-west-2.pooler.supabase.com:5432/postgres"

SUPABASE_STORAGE_BUCKET_IMAGING="imaging"
SUPABASE_STORAGE_BUCKET_DOCUMENTS="documents"

AUDIT_LOG_SINK="stdout"
AI_PROVIDER="mock"
NEXT_PUBLIC_AI_PROVIDER="mock"
```

**Optional — live AI:**

```env
OPENAI_API_KEY="sk-..."
AI_PROVIDER="openai"
NEXT_PUBLIC_AI_PROVIDER="openai"
```

Never commit `.env.local` to Git or upload it to Google Drive.

---

## 4. What was built & fixed (summary)

### Core platform

- Multi-tenant optometry SaaS (Owner, Optometrist, Technician, Front Desk, Optical, Patient roles)
- PostgreSQL + Prisma (patients, appointments, imaging, notes, care gaps, team, inventory, etc.)
- Supabase Auth + Storage
- Patient portal (approved content only)

### Recent production pass

- **Sign out / exit demo:** `POST /api/auth/sign-out` + `signOutAndRedirect()`
- **Global search:** Cmd/Ctrl+K — patient search (name, DOB, phone, email, chart ID); sets patient context for Ask EyeQ
- **Appointment sync:** Changes revalidate Brain, Scheduling, Pre-chart, Patient chart, Portal
- **Ask EyeQ:** Always responds; mock mode label; fallback on timeout/error; anti-hallucination rules
- **Imaging:** Structured review pipeline; GPT-4o Vision when OpenAI key set; provider sign-off required
- **Ambient scribe:** Conservative notes from transcript only; provider sign-off
- **RBAC:** Financial reports + Admin insights → Owner/Admin only
- **Performance:** Lazy Copilot/CommandBar, loading skeletons on all routes
- **Build verified:** `tsc`, `prisma generate`, `next build` (68 routes)

### Documentation

- `docs/PRODUCTION_READINESS.md` — full audit report
- This file — Mac handoff

---

## 5. Key commands

| Command | Purpose |
|---------|---------|
| `npm run dev` | Local dev server (:3000) |
| `npm run build` | Production build |
| `npm run typecheck` | TypeScript check |
| `npm run db:push` | Sync Prisma schema to DB |
| `npm run db:seed` | Seed demo org + patients |
| `npm run db:studio` | Prisma Studio (DB browser) |
| `npm run lint` | ESLint |

---

## 6. Demo workflow (pitch)

1. Open app → **Demo mode** on login
2. **Brain** — today’s schedule + insights
3. **Cmd+K** — search patient → open chart
4. **Appointments** — create → verify **Scheduling** + chart
5. **Imaging** — upload → structured review → provider sign-off
6. **Ask EyeQ** — context-aware assistant (mock unless OpenAI key)
7. **Sign out** — profile menu or `/api/auth/sign-out`

---

## 7. Still placeholder (needs vendor / compliance)

- EHR live sync (Epic, athena, etc.)
- SMS/email (Twilio, SendGrid)
- Live speech-to-text for scribe
- HIPAA BAA + security audit before real PHI

**EyeQ is not HIPAA-certified by default.**

---

## 8. Project structure (high level)

```
eyeq-ai-platform/
├── prisma/           # Schema, migrations, seed
├── src/
│   ├── app/          # Next.js App Router (staff, portal, api)
│   ├── components/   # UI
│   ├── lib/          # AI, auth, imaging, intelligence, i18n
│   ├── server/       # Server actions & queries
│   └── store/        # Zustand (copilot, selected patient)
├── docs/
│   └── PRODUCTION_READINESS.md
├── .env.example
└── EYEQ_MAC_HANDOFF.md   ← this file
```

---

## 9. Google Drive tips

1. Upload **`eyeq-ai-platform-mac-handoff.zip`** (on your Desktop after export).
2. On Mac: download zip → unzip → follow §2.
3. **Do not** upload `.env.local` — recreate it locally on each machine.
4. If OneDrive/iCloud sync causes `.next` errors, delete `.next` and restart dev.

---

## 10. Support checklist if something breaks

| Issue | Fix |
|-------|-----|
| `EPERM` on prisma generate | Stop dev server; delete `.next`; retry |
| Auth errors | Check Supabase URL/keys; project not paused |
| DB connection | Verify pooler region (`aws-1-us-west-2` for your project) |
| Blank page after build | `rm -rf .next && npm run dev` |
| Sign out stuck | Visit `http://localhost:3000/api/auth/sign-out` |

---

*Last updated: May 2026 · Build verified on Windows; same steps apply on macOS.*
