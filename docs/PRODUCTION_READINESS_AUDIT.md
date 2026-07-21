# EyeQ AI. Production Readiness Audit

**Date:** July 20, 2026 (live-PHI pass)  
**Scope:** `eyeq-ai-platform/` security, MFA, RLS, vendor BAA gates, reminders, AI PHI, audit, CI/E2E

## Verdict

EyeQ is **structurally ready for a real optometry pilot** and **fail-closed for live PHI** until MFA policy, RLS verification, BAAs, and org `livePhiEnabled` are explicitly completed.

Demo mode remains usable. Live PHI is not accidental.

Admin screens:
- `/provider/settings/phi-readiness`
- `/provider/settings/vendors`
- `/provider/settings/security`

## Closed in this pass

1. **MFA enforcement**: org policy, AAL2 gate in provider layout, enroll/challenge UI, audits, honest “provider not configured” state  
2. **RLS expansion**. ENABLE/FORCE on PHI tables including claims, optical, appointment requests, vendor readiness, payment ledger  
3. **Production PHI gate**: `evaluatePhiReadiness` / `assertLivePhiAllowed`  
4. **Vendor BAA UX**: readiness cards, test connection, mark BAA (no full secrets)  
5. **Reminder send gates**: vendor/BAA/consent; demo-sent only in demo; no fake production send  
6. **AI PHI hardening**. OpenAI + BAA + `AI_ALLOW_PHI` required for patient-context clinical AI  
7. **Audit hardening**: patientId, success, previous/new status, request IP/UA enrichment; new AuditActions  
8. **Playwright in CI**. Chromium install + `e2e/public.spec.ts` smoke after build  
9. **Production launch checklist**: replaced pilot checklist content  

## Remaining before flipping live PHI

1. Complete legal BAAs and mark them in Vendor readiness + env flags  
2. Ops: apply/verify `prisma/rls.sql`, mark RLS + audit verified in UI  
3. Require MFA for staff on the real org; enroll all clinical users  
4. Set `APP_ENV=production`, disable demo mode, enable `livePhiEnabled` only when readiness screen is green  
5. Wire full demo Playwright suite to CI secrets (`E2E_*`) when available  
6. Backup/restore drill + monitoring/on-call (operational, not code)

## Automated verification

| Check | Result |
|-------|--------|
| `npm run typecheck` | Pass |
| `npm test` | 54/54 pass |
| Prisma schema push + migrations | Applied |
| Playwright public smoke | In CI workflow |

*This document does not certify HIPAA, SOC 2, or legal compliance.*
