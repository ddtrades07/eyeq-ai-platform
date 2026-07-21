# EyeQ AI. Security Risk Register

**Date:** July 6, 2026  
**Owner:** Engineering + Security  
**Review cadence:** Monthly (or before any pilot with PHI)

---

## Risk scoring

| Severity | Definition |
|----------|------------|
| **Critical** | Likely PHI breach or total platform compromise |
| **High** | PHI exposure or major auth bypass possible |
| **Medium** | Limited data exposure or compliance gap |
| **Low** | Defense-in-depth improvement |

| Status | Meaning |
|--------|---------|
| **Open** | Not mitigated |
| **Mitigated** | Controls in place; residual risk accepted |
| **Accepted** | Documented exception |
| **Closed** | Verified fixed |

---

## Register

| ID | Severity | Description | Mitigation | Status |
|----|----------|-------------|------------|--------|
| **SR-001** | Critical | Real PHI stored while demo mode enabled with shared demo credentials | Set `FEATURE_DEMO_MODE=false` in prod; separate Supabase project for demos; monitor env in CI | Mitigated (env-gated); verify per deploy |
| **SR-002** | Critical | PHI sent to AI vendor without BAA | `AI_ALLOW_PHI=false` default; PHI safety gate blocks confirmed PHI; require `AI_BAA_CONFIRMED=true` + per-vendor flags | Mitigated (code); org process required |
| **SR-003** | High | Cross-tenant data access via forged IDs | `assertSameOrg()` on mutations; gateway `assertTenantAccess()` | Mitigated (app layer); no DB RLS yet |
| **SR-004** | High | Missing Supabase Row Level Security | All tables org-scoped in app; **add RLS policies** mirroring app rules | Open |
| **SR-005** | High | API routes authorize staff role only, not fine-grained permissions | Audit each route; add `assertPermission()` parity with server actions | Open (partial) |
| **SR-006** | High | Service role key exposure via client bundle | Keys server-only in `serverEnv`; never `NEXT_PUBLIC_*` | Mitigated |
| **SR-007** | High | Imaging files public in Supabase bucket | Signed URLs; verify bucket private + path includes orgId | Open (verify config) |
| **SR-008** | Medium | `/onboarding` 404 leaves staff without org in limbo | Implement onboarding; fail closed on org assignment | Open |
| **SR-009** | Medium | Audit log failure silent to user | stderr alert on failure; monitor `[audit] failed` | Mitigated (partial); no paging |
| **SR-010** | Medium | AI copilot SSE without rate limits | Add per-user/org rate limits in gateway usage tracker | Open |
| **SR-011** | Medium | Regex PHI detection misses unstructured PHI | Layer NER/classifier in gateway; block enriched context without BAA | Open (partial: gate exists) |
| **SR-012** | Medium | Demo reset wipes data: acceptable only in demo org | Restrict reset to `DEMO_ORG_SLUG`; audit demo actions | Mitigated |
| **SR-013** | Medium | Session fixation / stale sessions | Supabase SSR refresh in middleware | Mitigated |
| **SR-014** | Medium | No MFA for staff accounts | Enable Supabase MFA; enforce for admin roles (R5) | Open |
| **SR-015** | Medium | Password reset routes missing | Implement forgot/reset pages; remove dead PUBLIC_ROUTES or add pages | Open |
| **SR-016** | Low | Middleware skips auth when Supabase env unset | Acceptable for local build; fail deploy if prod missing env | Accepted (dev) |
| **SR-017** | Low | `external` audit sink is stdout stub | Implement real sink before compliance audit | Open |
| **SR-018** | Low | Prisma schema syntax error blocks migrations | Fix enum; CI `prisma validate` | Open |
| **SR-019** | Medium | Ambient scribe stores transcript PHI without retention policy | Define retention + encryption at rest; `TRANSCRIPTION_STORE_AUDIO=false` default | Open |
| **SR-020** | Medium | Patient portal exposes AI chat (`ai:use`) | Gateway restricts request types for PATIENT role | Mitigated (partial); review quarterly |
| **SR-021** | High | Third-party subprocessors without BAA (OpenAI, Anthropic, Twilio, etc.) | Maintain subprocessor list; block features until BAA executed | Open (process) |
| **SR-022** | Medium | SQL injection via Prisma | Parameterized queries via Prisma; validate with Zod on actions | Mitigated |
| **SR-023** | Low | XSS in user-generated messages | React escaping; sanitize rich text if added | Mitigated (baseline) |
| **SR-024** | Medium | Insider threat: audit log readable by ADMIN | Restrict `audit:read` to OWNER; log exports | Mitigated (RBAC) |
| **SR-025** | Critical | Marketing claims HIPAA compliance without organizational controls | Legal review; disclaimers in UI; no compliance claims in docs | Mitigated (messaging); ongoing |

---

## PHI-specific risks

| ID | Scenario | Control | Residual |
|----|----------|---------|----------|
| SR-002 | User pastes SSN into Ask EyeQ | Block + redact via `scanForPhi` | Novel PHI formats may slip |
| SR-002 | Chart context to LLM | Blocked when `AI_ALLOW_PHI=false` | Misconfiguration if env wrong |
| SR-007 | Imaging URL leaked | Short-lived signed URLs | URL sharing out of band |
| SR-019 | Audio recording stored | Off by default | If enabled without BAA |

---

## Treatment plan (next 90 days)

| Priority | Actions |
|----------|---------|
| P0 | SR-004 RLS policies; SR-007 bucket audit; SR-018 schema fix |
| P1 | SR-005 API permission audit; SR-008 onboarding; SR-015 password reset |
| P2 | SR-010 rate limits; SR-011 NER layer; SR-014 MFA pilot |

---

## Related documents

- `SECURITY_ARCHITECTURE.md`
- `HIPAA_TECHNICAL_SAFEGUARDS.md`
- `PRODUCTION_READINESS_CHECKLIST.md`
- `EYEQ_CURRENT_STATE_AUDIT.md`

---

*This register does not constitute a risk assessment for HIPAA compliance.*
