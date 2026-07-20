# Incident response runbook

Keep this simple and real. Mark **Incident response reviewed** on PHI readiness / Pilot launch after owners read this doc.

Audit actions: `INCIDENT_CREATED`, `INCIDENT_REVIEW`.

## Severity (pilot)

| Level | Examples |
| --- | --- |
| Sev-1 | Suspected PHI exposure, wrong-patient access, RLS/tenant isolation break |
| Sev-2 | Account compromise, AI safety event with PHI context |
| Sev-3 | Vendor outage, failed reminder delivery, billing issue |

## Common steps (all incidents)

1. Stabilize: stop sending (pause campaigns), freeze risky imports, consider disabling controlled pilot / live PHI for the org.
2. Preserve evidence: timestamps, user ids, audit log ids — **no PHI in tickets**.
3. Notify practice owner + EyeQ ops.
4. Remediate and verify.
5. Write short post-incident notes; audit `INCIDENT_REVIEW`.

---

### Suspected PHI exposure

1. Disable live PHI / controlled pilot for the org if exposure is app-side.
2. Rotate compromised credentials (DB, storage, AI, messaging).
3. Review audit logs for access window.
4. Legal/HIPAA breach assessment (manual — outside app).
5. Document patients/systems affected at a high level only.

### Wrong-patient access

1. Identify user, patient ids, and pages/actions from audit log.
2. Lock or force MFA re-enrollment for the user if appropriate.
3. Correct any clinical artifacts created under the wrong chart (notes stay draft until signed — void if needed).
4. Notify practice clinical lead.

### Vendor outage

1. Confirm vendor status (Twilio, SendGrid, OpenAI, Stripe, Supabase).
2. Switch to portal-only messaging if SMS/email down.
3. Keep AI in review-only / mock if AI vendor down — do not fake success.
4. Communicate delay to staff via practice channel.

### AI safety event

1. Set `AI_EMERGENCY_SHUTDOWN=true` if needed.
2. Review blocked AI request / PHI detection logs (redacted).
3. Confirm BAAs and `AI_ALLOW_PHI` posture.
4. Retrain staff: AI drafts require provider review; no auto-send / auto-sign.

### Failed reminder delivery

1. Check vendor health + BAA flags + patient consent/opt-out.
2. Do not retry blast without fixing root cause.
3. Prefer portal message for urgent outreach.

### Billing / payment issue

1. Check Stripe dashboard + webhook events table.
2. Do not invent “paid” status in EyeQ.
3. Reconcile ledger manually with practice billing lead.

### Account compromise

1. Disable user (`isActive=false`), revoke sessions (Supabase Auth).
2. Require MFA re-enrollment.
3. Review audit trail for that user.
4. Reset passwords / invite links.

### RLS / tenant isolation concern

1. Treat as Sev-1.
2. Disable controlled pilot / live PHI for affected orgs.
3. Re-run RLS verification (`prisma/rls.sql` ENABLE/FORCE).
4. Confirm app-layer `organizationId` checks still present.
5. Do not resume pilot until RLS + audit verified and incident reviewed.

## Manual / blocked

- Breach notification letters, counsel engagement, and insurer reporting are manual.
- EyeQ records readiness attestation only; it is not a SOC ticketing system.
