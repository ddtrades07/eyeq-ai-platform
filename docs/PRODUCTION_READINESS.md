# EyeQ AI — Production Readiness Report

**Date:** May 2026  
**Scope:** Office pilot readiness (not HIPAA-certified clinical deployment)

---

## 1. Pages audited

| Area | Route(s) | Status |
|------|----------|--------|
| Brain | `/dashboard` | DB-backed; intelligence + proactive alerts |
| Appointments | `/appointments` | CRUD + status via server actions |
| Scheduling | `/scheduling` | Synced via shared DB + revalidation |
| Patients | `/patients`, `/patients/[id]` | Full chart tabs |
| Pre-charting | `/pre-charting` | Server queries |
| Ambient scribe | `/ambient-scribe`, `[id]` | Conservative note generation |
| Timeline intelligence | `/timeline-intelligence`, `[id]` | Rule engine, explainable |
| Imaging | `/imaging`, `/imaging/[id]` | Structured review pipeline |
| Imaging timeline | `/imaging-timeline` | Prior cases + trends |
| Disease templates | `/disease-templates`, `[slug]` | Template library |
| Care gaps | `/care-gaps` | DB-backed gaps |
| AI copilots | `/copilots` | Role tabs |
| Messages | `/messages` | Threads + messaging |
| Reminders | `/reminders` | Campaigns/templates |
| Education | `/education-center` | Educational content |
| Inventory | `/inventory` | Items + reorder placeholders |
| Financial reports | `/financial-reports` | **Owner/Admin only** (`finance:read`) |
| Admin insights | `/admin-insights` | **Owner/Admin only** (`finance:read`) |
| Practice setup | `/practice-setup` | Configuration UI |
| Team | `/team` | Invite + roles |
| Workflow builder | `/workflow-builder` | Templates |
| EHR integrations | `/ehr-integrations` | Placeholder vendors |
| Settings | `/settings` | Practice settings |
| Patient portal | `/portal/*` | Signed notes + approved imaging only |

All staff routes have `loading.tsx` skeletons (including dynamic `[id]` routes).

---

## 2. Issues found (before this pass)

- Sign-out / exit demo failed (httpOnly cookies not cleared client-side)
- `next/dynamic` with `ssr: false` in Server Component layout (build error)
- Ask EyeQ could stuck on failed fetch (no assistant message)
- Command palette did not set global patient context for copilot
- Appointment mutations did not revalidate scheduling / pre-chart / patient chart
- Patient search lacked DOB / full-name / id matching
- Financial reports visible in command palette for all roles
- Admin insights used `org:manage` (broader than Owner/Admin financial scope)
- Heavy client bundle loaded eagerly on every staff page
- Duplicate DB fetch on patient chart + intelligence

---

## 3. Issues fixed (this pass)

- **Auth:** `POST /api/auth/sign-out` clears server cookies; `signOutAndRedirect()` for top bar + demo exit
- **Layout:** `LazyClientShell` client wrapper for dynamic imports
- **Patient context:** `useSelectedPatient` store; command bar + chart sync copilot `patientId`
- **Search:** Enhanced `searchPatients` (name, DOB, phone, email, chart id prefix)
- **Appointments:** `revalidateAppointmentViews()` on create/update/status/cancel/reschedule
- **Ask EyeQ:** Fallback assistant message on error/timeout; Mock AI Mode label; 28s timeout
- **RBAC:** Command bar hides financial reports without `finance:read`; admin insights gated to `finance:read`
- **Performance:** Lazy copilot/command bar; lighter `computeTodayInsights` includes; patient intelligence reuses loaded data
- **Compliance:** Staff footer disclaimer for regulatory review
- **Imaging:** GPT-4o Vision path when `OPENAI_API_KEY` + `AI_PROVIDER≠mock` (falls back to deterministic mock)

---

## 4. Remaining limitations

- **EHR integrations:** UI placeholders; no live FHIR/HL7 sync without vendor credentials
- **SMS/Email reminders:** Draft/template UI; no Twilio/SendGrid wired by default
- **Real-time:** No WebSocket live schedule board; refresh after mutations
- **Imaging AI:** Without OpenAI key, findings are patient-risk + metadata heuristics, not pixel analysis
- **Ambient scribe:** Browser transcription is mock/placeholder unless Web Speech / vendor ASR is configured
- **Multi-location:** Supported in schema; some reports aggregate at org level only
- **Billing:** Coding suggestions are disclaimers only, not certified billing engine
- **i18n:** UI strings partially translated; clinical translations need human review

---

## 5. Backend / API credentials still needed

| Service | Env vars |
|---------|----------|
| Supabase Auth + DB | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, `DIRECT_URL` |
| OpenAI (optional) | `OPENAI_API_KEY`, `AI_PROVIDER=openai`, `NEXT_PUBLIC_AI_PROVIDER=openai` |
| Anthropic (optional) | `ANTHROPIC_API_KEY`, `AI_PROVIDER=anthropic` |
| Storage | Supabase buckets `imaging`, `documents` |
| Production deploy | Vercel + pooled `DATABASE_URL` (port 6543 + pgbouncer) |

---

## 6. AI services still needed

- **Ask EyeQ:** Works in mock/fallback mode; live mode needs server-side API key + BAA with vendor
- **Imaging:** Vision analysis via OpenAI when configured; FDA-cleared models are integration slots only
- **Ambient scribe:** Conservative parsing from transcript; production needs HIPAA-eligible ASR
- **Embeddings / vector search:** Scaffold only (`getVectorSearchProvider` returns null)

---

## 7. EHR integrations (placeholder)

Epic, Oracle Health, athenahealth, eClinicalWorks, NextGen, DrChrono, RevolutionEHR, Eyefinity, Crystal PM, Compulink, MaximEyes, iTRUST, Other/FHIR — status cards and sync metadata are **mock** until credentials and legal agreements exist.

---

## 8. HIPAA / security items before real PHI

- [ ] Signed BAA with Supabase (and any AI vendor)
- [ ] Enable RLS policies audit on all Supabase tables
- [ ] Secrets only in server env (never `NEXT_PUBLIC_*` for keys)
- [ ] Audit log sink to durable store (`AUDIT_LOG_SINK=db`)
- [ ] MFA for staff accounts
- [ ] Session timeout + automatic lock
- [ ] Penetration test / SOC2 path if enterprise
- [ ] Clinical translation review
- [ ] Consent capture for recording + SMS opt-in stored in DB
- [ ] **Not HIPAA compliant by default** — requires organizational compliance program

---

## 9. Build status

**Verified (May 2026):**

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` | Pass |
| `npx prisma generate` | Pass |
| `npx next build` | Pass (68 routes) |

```bash
cd eyeq-ai-platform
npm run typecheck   # tsc --noEmit
npm run build
npm run dev
```

If `prisma generate` fails with `EPERM` on Windows, stop `npm run dev` and pause OneDrive sync on the project folder, then retry.

---

## 10. Office workflow test sequence

1. Login or **Demo mode**
2. **Brain** — confirm today’s appointments and insights load
3. **Cmd/Ctrl+K** — search patient → opens chart + sets context
4. **Appointments** — create appointment → check **Scheduling** + **Patient chart**
5. **Pre-charting** — open patient prep
6. **Ambient scribe** — transcript → generate note → provider sign-off
7. **Imaging** — upload → structured review → provider verification
8. **Care gaps** — view/recalculate gaps
9. **Reminders** — draft message
10. **Portal** (patient role) — only signed summaries, no AI flags
11. **Financial reports** as Owner — loads; as Technician — blocked
12. **Sign out** — returns to login

---

## 11. Ready for office pilot

**Ready (with demo/mock AI):**

- Scheduling & appointments workflow
- Patient chart & team management
- Care gap tracking
- Messaging UI
- Education center
- Inventory / financial **views** for admins
- Timeline intelligence (explainable rules)
- Imaging workflow with provider sign-off
- Patient portal (approved content only)

**Pilot with caution:**

- Ask EyeQ (mock or key-backed; always provider-reviewed)
- Ambient scribe (transcript fidelity depends on ASR)
- Imaging AI without OpenAI (risk-factor prompts, not image diagnosis)

---

## 12. Not safe for unrestricted clinical use

- Do **not** use AI output as diagnosis or prescription
- Do **not** load real PHI until BAA + security checklist complete
- Do **not** claim FDA-cleared imaging analysis without integrated cleared devices
- Do **not** auto-send patient SMS/email without consent workflow

---

*EyeQ AI is review-support software. Provider judgment and organizational compliance govern all clinical use.*
