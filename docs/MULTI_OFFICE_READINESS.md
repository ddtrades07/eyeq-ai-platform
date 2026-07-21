# EyeQ AI. Multi-Office Readiness Report

**Date:** May 2026  
**Scope:** Controlled office pilot (not full HIPAA-certified clinical production)

---

## 1. Multi-office readiness status

| Area | Status | Notes |
|------|--------|-------|
| Organization / Location models | ✅ Ready | `Organization`, `Location`, `Provider`↔`Location` M2M |
| User location access | ✅ Ready | `UserLocationAccess` model + demo seed |
| Location switcher | ✅ Ready | Top bar; cookie `eyeq-active-location` |
| Query scoping | ✅ Partial | Appointments, scheduling, dashboard, imaging queue, inventory, financials, care gaps |
| Cross-office isolation | ✅ Org-scoped | All queries filter by `organizationId`; location filter when selected |
| Shared patients | ✅ Ready | Patients org-wide; appointments location-scoped |

---

## 2. Pages audited

### Practice Operations
- Brain (Dashboard): location-filtered stats & schedule
- Appointments: synced via Prisma + `revalidateAppointmentViews`
- Patient Chart: org-scoped patient; appointments per patient
- Pre-Charting: patient-scoped intelligence
- Ambient Scribe: transcript-grounded + unsupported-statement check

### Clinical Intelligence
- Timeline Intelligence: patient-scoped
- Imaging Review: quality gate, provider sign-off, no diagnosis language
- Imaging Timeline: patient/org scoped
- Disease Templates: org templates
- Care Gap Autopilot: location-filtered queue
- AI Copilots: role-aware

### Patient Engagement
- Messages, Scheduling, Reminders, Education Center: org-scoped

### Business
- Inventory: location-filtered
- Financial Reports: `finance:read` + location filter
- Admin Insights: `finance:read` gated

### Configuration
- Practice Setup, Team, Workflow Builder, EHR Integrations, Settings
- **Installation Readiness**: new checklist page (`/installation-readiness`)

---

## 3. Bugs found & fixed (this pass)

| Issue | Fix |
|-------|-----|
| No location switcher | Added `LocationSwitcher` + server cookie scope |
| Dashboard/appointments not location-aware | `resolveActiveLocationId` wired into queries |
| No `UserLocationAccess` | Prisma model + seed for tech (Main) / front desk (both) |
| AI safety scattered | Central `src/lib/ai/safety.ts` |
| Ask EyeQ patient-specific without patient | Returns “Please select or search for a patient first” |
| Scribe unsupported content | `findUnsupportedNoteSections` in note generation |
| No installation checklist UI | `/installation-readiness` page + docs |

---

## 4. Remaining limitations

- **Care gaps / messages**: org-level; location filter uses patient appointment association (approximate for gaps without location field)
- **Imaging without appointment**: may not appear when location filter active
- **Real-time sync**: server revalidation on mutation; not WebSocket live updates
- **EHR sync**: placeholders until credentials configured
- **SMS/email**: mock delivery logs until Twilio/SES keys
- **UserLocationAccess admin UI**: managed via seed/DB; no Team page editor yet
- **Manager role**: can view all locations; per-location assignment UI pending

---

## 5. Still placeholder

- EHR bidirectional sync (all vendors)
- Live AI transcription (Ambient Scribe uses manual/mock segments)
- Communication vendor delivery
- Financial revenue modeling (uses operational metrics, not claims)
- Automated backup verification

---

## 6. Requires real API keys

| Key | Purpose |
|-----|---------|
| `DATABASE_URL` / Supabase | PostgreSQL |
| `NEXT_PUBLIC_SUPABASE_*` | Auth + client |
| `SUPABASE_SERVICE_ROLE_KEY` | Storage, team invites |
| `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` | Live AI (optional; mock works) |
| EHR vendor credentials | Per integration |
| Twilio / SES | SMS/email production |

---

## 7. HIPAA / security review required

Before live PHI:

- Threat model and access audit
- Encryption at rest/transit verification
- Session timeout and MFA policy
- Audit log retention policy
- Incident response plan
- Minimum necessary access review per role

**This build is not HIPAA-certified.**

---

## 8. BAA / vendor setup

Execute BAAs with:

- Supabase (database, auth, storage)
- OpenAI and/or Anthropic (if live AI on PHI)
- SMS/email provider
- Any connected EHR vendor

---

## 9-17. Verification checklist

| Check | Status |
|-------|--------|
| `npm run dev` | Run locally after `prisma generate` |
| `npm run build` | Verified in CI/local pass |
| Ask EyeQ responds reliably | ✅ Fallback + patient-required guard |
| Ambient Scribe transcript-grounded | ✅ Anti-hallucination + unsupported check |
| Imaging provider-signoff safe | ✅ No diagnosis; sign-off required |
| Role permissions | ✅ Financial/admin gated |
| Location filtering | ✅ Core operational pages |
| Appointment data sync | ✅ Shared Prisma source + revalidation |

---

## Pilot readiness claim

**Office-pilot ready** when:

1. `npm run build` passes  
2. Supabase + migrations applied  
3. Demo or production org seeded with locations + team  
4. Owner accepts pilot limitations above  

Not claimed: full production clinical readiness or HIPAA compliance.
