# EyeQ AI — Installation Readiness Checklist

Use this checklist before deploying EyeQ AI to a new optometry office or multi-site group.

Also see the in-app page: **Configuration → Installation readiness** (`/installation-readiness`).

---

## Infrastructure

- [ ] **Supabase project** created (PostgreSQL, Auth, Storage)
- [ ] **Environment variables** in `.env.local`:
  - `DATABASE_URL` (pooler)
  - `DIRECT_URL` (migrations, optional)
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `NEXT_PUBLIC_APP_URL`
- [ ] **Database migrations**: `npx prisma migrate deploy` or `npm run db:push` for pilot
- [ ] **Prisma generate**: `npx prisma generate`
- [ ] **Seed demo** (optional): `npm run db:seed`

## Storage

- [ ] Supabase bucket **`imaging`** (or `SUPABASE_STORAGE_BUCKET_IMAGING`)
- [ ] Supabase bucket **`documents`**
- [ ] Bucket policies restrict access to authenticated staff

## Auth

- [ ] Supabase Auth enabled (email/password or SSO)
- [ ] Each staff user has matching `User` row with `supabaseUserId`
- [ ] Demo login configured OR production invite flow via Team page

## Organization setup

- [ ] Organization created (Practice Setup)
- [ ] **Locations** added (Main + satellite sites)
- [ ] **Providers** linked to locations
- [ ] **Team** invited with correct roles
- [ ] **UserLocationAccess** rows for staff limited to assigned sites (DB/seed until UI)

## Roles (verify)

| Role | Access |
|------|--------|
| Owner / Admin | All locations, financials, EHR, team, settings |
| Manager | Assigned location operations + reports |
| Optometrist | Clinical workflow, scribe, imaging review |
| Technician | Schedule, pretest, imaging upload |
| Front Desk | Appointments, messages, reminders |
| Optical | Inventory, optical handoff |
| Patient | Portal only |

## EHR

- [ ] EHR vendor selected in **EHR Integration Center**
- [ ] Connection method documented
- [ ] Credentials stored securely (not in git)
- [ ] Label shown as **placeholder** until configured
- [ ] Terminology uses **EHR** (not EMR)

## Communications

- [ ] SMS/email provider selected (Twilio, SES, etc.)
- [ ] **Consent** documented for reminders and marketing
- [ ] `CommunicationPreference` per patient where applicable

## AI

- [ ] `AI_PROVIDER=mock` for demo OR `openai`/`anthropic` with API key
- [ ] `NEXT_PUBLIC_AI_PROVIDER` matches (shows Mock AI Mode in UI when mock)
- [ ] Staff trained: AI is **decision support only**, provider review required
- [ ] Ambient Scribe: consent before recording

## Security & compliance (before live PHI)

- [ ] **HIPAA/security review** completed
- [ ] **BAAs** executed with Supabase, AI vendor, comms vendor, EHR
- [ ] Audit logging reviewed (`AuditLog` table)
- [ ] **Backup plan** documented (Supabase PITR / exports)
- [ ] Incident response contact list

## Smoke test (36-step workflow)

1. Start app → login Owner/Admin  
2. Select **All Locations**  
3. Open Brain → search patient → Patient Chart  
4. Create appointment → verify in Appointments, Scheduling, Chart  
5. Pre-Chart → Ambient Scribe → generate note (no hallucination)  
6. Upload imaging → quality check → provider sign-off → Imaging Timeline  
7. Care gap → reminder → Messages  
8. Inventory update → Financial Reports (Owner only)  
9. Switch to Technician → Financial Reports hidden  
10. Switch location → data filters  
11. EHR Integrations placeholders  
12. Ask EyeQ “summarize this patient” (with patient selected)  
13. `npm run build`

## Commands

```bash
npm install
npx prisma generate
npx prisma migrate deploy   # or: npm run db:push
npm run db:seed             # optional demo
npm run dev
npm run build
```

---

**Pilot standard:** Stable, synced, safe, multi-office aware — not full clinical production certification.
