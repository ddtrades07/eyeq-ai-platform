# EyeQ Production Launch Checklist

**Date:** July 20, 2026  
**Goal:** Live PHI production readiness (fail closed until verified)  
**Supersedes:** pilot-only checklist for go-live decisions  
**Sources:** FEATURE_MATRIX, PRODUCTION_READINESS_AUDIT, ENVIRONMENT_VARIABLES, AI_READINESS

## Current verdict

| Layer | Status |
|-------|--------|
| Demo / sales walkthrough | Ready |
| Controlled pilot (no live PHI unless gated) | Ready |
| **Live PHI production** | **Blocked until checklist below is green** |

Admin UI: `/provider/settings/phi-readiness` and `/provider/settings/vendors`.

---

## Go / no-go decision

**GO** only if every section below is marked Ready (or N/A with written rationale).  
**NO-GO** if any Security, HIPAA/BAA, MFA, RLS, or Audit item is Blocked.

---

## 1. Security

- [ ] `APP_ENV=production`, `DEMO_MODE=false`
- [ ] Env validation passes (`validateEnvironment` / PHI readiness screen)
- [ ] `JOB_PROCESSOR_SECRET` set; job route fail-closed
- [ ] Secure cookies / HTTPS only at edge
- [ ] No secrets in client bundles or UI (hints only)
- [ ] Production PHI warning shown when incomplete

## 2. HIPAA / BAA

- [ ] OpenAI BAA complete before `AI_ALLOW_PHI=true`
- [ ] Twilio BAA complete before SMS with PHI
- [ ] SendGrid (or email) BAA complete before email with PHI
- [ ] Storage (Supabase) BAA complete before PHI files
- [ ] Speech vendor BAA complete before ambient audio PHI
- [ ] Vendor marks recorded in Vendor readiness UI

## 3. Authentication / MFA

- [ ] MFA provider configured (Supabase Auth)
- [ ] Org policy: MFA required for staff
- [ ] Staff blocked from PHI until AAL2 when required
- [ ] MFA enroll / challenge / policy changes audit-logged
- [ ] Password reset path verified
- [ ] No pretend-MFA when provider missing

## 4. RLS / Tenant isolation

- [ ] `prisma/rls.sql` applied (ENABLE + FORCE on PHI tables)
- [ ] Org marked `rlsVerifiedAt` after ops verification
- [ ] App-layer `organizationId` checks on all PHI mutations
- [ ] Location scoping fail-closed
- [ ] Cross-org access tests pass
- [ ] Patient cannot access other patients’ data
- [ ] Prisma owner bypass understood; Data API denied

## 5. Audit logs

- [ ] `AUDIT_LOG_SINK=db` (or external+db)
- [ ] Org `auditVerifiedAt` set
- [ ] Sensitive actions emit audits (MFA, PHI mode, vendors, reminders, AI, billing, clinical sign-off)
- [ ] Logs include actor, org, patient (when applicable), action, resource, success, timestamps

## 6. AI safety

- [ ] Production AI = OpenAI only
- [ ] Public website AI never accepts PHI
- [ ] Clinical AI: auth + org scope + role + audit + BAA + `AI_ALLOW_PHI`
- [ ] Provider-review-required labels
- [ ] No auto-sign / auto-send / auto-diagnose
- [ ] Blocked AI attempts logged

## 7. Vendor readiness

- [ ] OpenAI, Twilio, SendGrid, Stripe, Storage, Google, Speech reviewed in UI
- [ ] States honest: Not configured / Demo / Production / BAA required / BAA complete
- [ ] Connection tests run where safe
- [ ] Clearinghouse & EHR remain placeholder until real adapters

## 8. Reminders

- [ ] Send blocked without vendor + BAA in production
- [ ] Consent / opt-out checked
- [ ] Preview before send
- [ ] Demo-sent only in demo org (never fake live delivery)

## 9. Backups

- [ ] Automated Postgres backups enabled (provider console)
- [ ] Admin attestation on PHI readiness: provider, last backup, retention, restore test
- [ ] `backupStatus=verified` only after real restore drill
- [ ] Procedure: `docs/BACKUP_RESTORE.md`

## 10. Monitoring

- [ ] `ERROR_TRACKING_PROVIDER` / `ERROR_TRACKING_DSN` configured (or equivalent)
- [ ] Health endpoint monitored (`/api/health` + Pilot launch service cards)
- [ ] Monitoring marked verified in admin UI (not auto-claimed)
- [ ] Runbook: `docs/MONITORING_RUNBOOK.md`

## 11. Incident response

- [ ] `docs/INCIDENT_RESPONSE_RUNBOOK.md` reviewed
- [ ] Org marked `incidentResponseReviewedAt`
- [ ] On-call contact list (manual)
- [ ] Emergency AI shutdown (`AI_EMERGENCY_SHUTDOWN`)

## 12. Controlled pilot mode

- [ ] Separate from demo mode; demo org cannot enable
- [ ] Banner **Controlled Live Pilot** when enabled
- [ ] Org-scoped: other orgs remain blocked unless separately approved
- [ ] Restrictions: no auto-send AI, auto-sign notes, fake vendor publish, unverified imports/reminders
- [ ] Audit `PILOT_MODE` on enable/disable
- [ ] UI: `/provider/settings/pilot-launch`

## 13. Data migration

- [ ] CSV pilot migration dry-run + duplicate detection
- [ ] Error CSV export + import audits
- [ ] Guide: `docs/PILOT_MIGRATION_GUIDE.md` (not full EHR conversion)

## 14. Demo mode separation

- [ ] Demo org slug isolated; no real PHI in demo
- [ ] Demo script: `docs/PILOT_DEMO_SCRIPT.md`
- [ ] `livePhiEnabled` false on demo
- [ ] Seed data disabled in production

## 15. Staff training / onboarding

- [ ] MFA enrollment completed for clinical staff
- [ ] Staff onboarding checklist (`/provider/settings/staff-onboarding`)
- [ ] Chart sign-off / Rx / imaging review training
- [ ] Reminder consent / PHI in reviews training
- [ ] Org `staffTrainingCompletedAt` attested

## 16. Patient portal readiness

- [ ] Portal users see only own records
- [ ] Online booking = request workflow (staff convert)
- [ ] Proxy/guardian not enabled without permission model
- [ ] Communication consent visible on chart; portal available if SMS/email off

---

## Engineering verification (must pass)

- [ ] `npm run typecheck`
- [ ] `npm test`
- [ ] Playwright in CI (`e2e/public.spec.ts`; full demo suite with secrets)
- [ ] Production mode fails closed when PHI settings incomplete
- [ ] Demo mode remains usable
- [ ] Controlled pilot clearly separated from demo
- [ ] Admin can see blockers on PHI readiness screen (security, vendor, backup, monitoring, incident, MFA, RLS, audit)

---

## Related docs

- `docs/ENVIRONMENT_VARIABLES.md`
- `docs/BACKUP_RESTORE.md`
- `docs/MONITORING_RUNBOOK.md`
- `docs/INCIDENT_RESPONSE_RUNBOOK.md`
- `docs/PILOT_MIGRATION_GUIDE.md`
- `docs/PILOT_DEMO_SCRIPT.md`
- `docs/AI_READINESS.md`
- `docs/GOOGLE_REVIEWS_MODULE.md`
- `docs/FEATURE_MATRIX.md`
- `docs/PRODUCTION_READINESS_AUDIT.md`
- `prisma/rls.sql`
