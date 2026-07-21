# EyeQ AI. Production Readiness Checklist

**Date:** July 6, 2026  
**Use:** Sign off before pilot with **real PHI** or paid production tenant  
**Not a compliance certification**

---

## How to use

- [ ] = not done · [~] = partial · [x] = verified  
- Complete **all P0** items before PHI pilot  
- Record verifier name + date in deployment runbook

---

## 1. Infrastructure & secrets (P0)

| # | Item | Status | Notes |
|---|------|--------|-------|
| 1.1 | Production Supabase project provisioned | [ ] | Separate from dev/demo |
| 1.2 | Postgres migrations applied (`prisma migrate deploy`) | [ ] | Fix schema enum syntax first |
| 1.3 | `DATABASE_URL` uses pooled connection (PgBouncer) | [ ] | Port 6543 on Supabase |
| 1.4 | `DIRECT_URL` set for migrations only | [ ] | |
| 1.5 | Storage buckets `imaging` + `documents` created | [ ] | Private, not public |
| 1.6 | Bucket policies prevent cross-tenant reads | [ ] | Path prefix `{orgId}/` |
| 1.7 | All secrets in host env (Vercel encrypted) | [ ] | No secrets in repo |
| 1.8 | `FEATURE_DEMO_MODE=false` | [ ] | Verify in prod env |
| 1.9 | `NODE_ENV=production` | [ ] | |
| 1.10 | `NEXT_PUBLIC_APP_URL` matches production domain | [ ] | HTTPS |

---

## 2. Authentication & access (P0)

| # | Item | Status | Notes |
|---|------|--------|-------|
| 2.1 | Supabase Auth email provider configured | [ ] | |
| 2.2 | `/onboarding` flow works for new staff org | [ ] | **Currently missing** |
| 2.3 | Password reset pages functional | [ ] | **Currently missing** |
| 2.4 | Session refresh verified (middleware) | [ ] | |
| 2.5 | Sign-out clears cookies (`/api/auth/sign-out`) | [ ] | |
| 2.6 | RBAC verified for each role smoke test | [ ] | See `ROLE_PERMISSION_MATRIX.md` |
| 2.7 | `/access-denied` renders for unauthorized roles | [ ] | |
| 2.8 | MFA enabled for OWNER/ADMIN (recommended) | [ ] | R5 target |

---

## 3. Multi-tenant isolation (P0)

| # | Item | Status | Notes |
|---|------|--------|-------|
| 3.1 | All server actions call `assertSameOrg` on mutations | [~] | Audit spot-check |
| 3.2 | API routes scoped to `user.organizationId` | [~] | Add permission checks |
| 3.3 | AI gateway `assertTenantAccess` on patient context | [ ] | |
| 3.4 | Supabase RLS policies deployed | [ ] | **Gap** |
| 3.5 | Demo org isolated; demo disabled in prod | [ ] | |

---

## 4. AI & PHI (P0 if AI enabled)

| # | Item | Status | Notes |
|---|------|--------|-------|
| 4.1 | BAA executed with AI vendor before real PHI to LLM | [ ] | |
| 4.2 | `AI_ALLOW_PHI=false` unless legal approval | [ ] | Default safe |
| 4.3 | `AI_BAA_CONFIRMED` set only after BAA | [ ] | |
| 4.4 | PHI safety gate tests passing | [ ] | Fix Vitest `server-only` |
| 4.5 | `AI_EMERGENCY_SHUTDOWN` runbook documented | [ ] | |
| 4.6 | Imaging AI BAA if using cloud Vision | [ ] | `IMAGING_AI_BAA_CONFIRMED` |
| 4.7 | UI disclaimers visible on AI output | [ ] | `SafetyDisclaimer` |
| 4.8 | Mock/dev imaging badges disabled in prod | [ ] | `IMAGING_DEV_MOCK=false` |

---

## 5. Audit & monitoring (P1)

| # | Item | Status | Notes |
|---|------|--------|-------|
| 5.1 | `AUDIT_LOG_SINK=db` | [ ] | |
| 5.2 | Audit log page accessible to authorized roles | [ ] | |
| 5.3 | AI gateway requests logged | [ ] | |
| 5.4 | Error monitoring (`SENTRY_DSN`) optional | [ ] | |
| 5.5 | Uptime / health check (`/api/health`) monitored | [ ] | |
| 5.6 | Log retention policy defined | [ ] | Customer policy |

---

## 6. Clinical workflows (P1)

| # | Item | Status | Notes |
|---|------|--------|-------|
| 6.1 | Appointments create/update/cancel | [ ] | |
| 6.2 | Patient chart loads all tabs | [ ] | |
| 6.3 | Clinical note create + sign-off | [ ] | |
| 6.4 | Imaging upload → review → sign-off | [ ] | |
| 6.5 | Care gaps display and resolve | [ ] | |
| 6.6 | Portal shows only signed/approved content | [ ] | |
| 6.7 | Encounters advance with appointment status | [~] | R1 |
| 6.8 | Staff tasks create/complete | [~] | R1 |

---

## 7. Integrations honesty (P1)

| # | Item | Status | Notes |
|---|------|--------|-------|
| 7.1 | EHR pages labeled placeholder / not live sync | [ ] | |
| 7.2 | SMS/email campaigns cannot send without vendor | [ ] | Stubs throw |
| 7.3 | Billing labeled invoices only (no claims) | [ ] | |
| 7.4 | Scribe labeled manual unless STT configured | [ ] | |
| 7.5 | Marketing site matches `EYEQ_MASTER_STATUS.md` | [ ] | |

---

## 8. Build & test (P0)

| # | Item | Status | Notes |
|---|------|--------|-------|
| 8.1 | `npx prisma validate` passes | [ ] | Fix enum syntax |
| 8.2 | `npx prisma generate` passes | [ ] | |
| 8.3 | `npm run typecheck` passes | [ ] | |
| 8.4 | `npm run build` passes | [ ] | ~82 routes |
| 8.5 | `npx vitest run` all green | [ ] | 11/11 + PHI suite |
| 8.6 | Seed script not run against prod unintentionally | [ ] | |

---

## 9. Legal & organizational (P0: customer)

| # | Item | Status | Notes |
|---|------|--------|-------|
| 9.1 | BAA with Supabase | [ ] | |
| 9.2 | Privacy policy + subprocessors listed | [ ] | |
| 9.3 | HIPAA risk analysis completed | [ ] | Not software-only |
| 9.4 | Breach notification procedure | [ ] | |
| 9.5 | Staff training on AI limitations | [ ] | Non-diagnostic |
| 9.6 | SMS TCPA opt-in process | [~] | Model exists |

---

## 10. Performance & ops (P2)

| # | Item | Status | Notes |
|---|------|--------|-------|
| 10.1 | Cold start / TTFB acceptable on dashboard | [ ] | |
| 10.2 | Imaging analyze timeout acceptable (60s) | [ ] | |
| 10.3 | Database connection pool sized correctly | [ ] | |
| 10.4 | Backup / PITR enabled on Postgres | [ ] | Supabase setting |
| 10.5 | Staging environment mirrors prod | [ ] | |

---

## Pilot smoke test sequence

1. Owner signup → onboarding → practice setup  
2. Invite optometrist + front desk  
3. Create patient → appointment → check-in  
4. Upload imaging → run analysis → provider sign-off  
5. Create note → sign → verify portal visibility  
6. Create care gap → resolve  
7. Send internal message  
8. Verify audit log entries  
9. Attempt cross-role access → expect `/access-denied`  
10. Confirm demo mode disabled  

---

## Sign-off

| Role | Name | Date | Approved |
|------|------|------|----------|
| Engineering lead | | | [ ] |
| Security / compliance | | | [ ] |
| Clinical advisor | | | [ ] |
| Customer practice owner | | | [ ] |

---

## Known blockers (July 6, 2026)

1. Missing `/onboarding` page  
2. Prisma schema enum syntax error  
3. PHI Vitest suite failure  
4. No Supabase RLS  
5. API permission gaps  

---

*Related: `EYEQ_CURRENT_STATE_AUDIT.md`, `PRODUCTION_READINESS.md` (May 2026 prior audit)*
