# EyeQ AI — Security Architecture

**Date:** July 6, 2026  
**Scope:** Technical security design of the EyeQ AI platform (`eyeq-ai-platform/`)

---

## 1. Architecture overview

EyeQ AI is a **multi-tenant SaaS** application:

```
┌──────────────┐     HTTPS      ┌─────────────────────────────┐
│   Browser    │ ◄────────────► │  Next.js 15 (Vercel/Node)   │
│ Staff/Patient│                │  App Router + Middleware    │
└──────────────┘                └───────────┬─────────────────┘
                                            │
              ┌─────────────────────────────┼─────────────────────────────┐
              │                             │                             │
              ▼                             ▼                             ▼
     ┌────────────────┐           ┌─────────────────┐           ┌─────────────────┐
     │ Supabase Auth  │           │  PostgreSQL     │           │ Supabase Storage │
     │ (JWT sessions) │           │  via Prisma     │           │ (signed URLs)    │
     └────────────────┘           └─────────────────┘           └─────────────────┘
                                            │
                                            ▼
                                  ┌─────────────────┐
                                  │  AI Gateway     │──► OpenAI / Anthropic (optional)
                                  │  (server-only)  │
                                  └─────────────────┘
```

**Trust boundary:** All PHI processing occurs server-side. Browser receives only authorized, tenant-scoped data. AI vendor calls never originate from the client.

---

## 2. Authentication

| Component | Implementation |
|-----------|----------------|
| Identity provider | Supabase Auth |
| Session transport | HTTP-only cookies via `@supabase/ssr` |
| Session refresh | `src/middleware.ts` → `updateSession()` on every matched request |
| User mirror | Prisma `User.supabaseUserId` links auth user to org + role |
| Sign-out | `POST /api/auth/sign-out` clears server cookies |

### Session flow

1. User authenticates at Supabase → callback `/auth/callback`
2. Middleware refreshes JWT before Server Components run
3. `getCurrentUser()` loads Prisma user + role + `organizationId`
4. Unauthenticated access to protected routes → redirect `/login?next=...`

### Gaps

- No MFA enforcement (planned R5)
- `/forgot-password` and `/reset-password` not implemented
- Staff without `organizationId` redirect to missing `/onboarding`

---

## 3. Authorization (RBAC)

| Layer | Mechanism |
|-------|-----------|
| Pages | `requirePermission()`, `requireStaffUser()`, `requirePatientUser()` |
| Server actions | `assertPermission()` + `assertSameOrg()` |
| API routes | `getCurrentUser()` + `isStaffRole()` (partial permission checks) |
| UI | Conditional render based on `hasPermission()` |

**Policy source of truth:** `src/lib/auth/rbac.ts` — `ROLE_PERMISSIONS` map.

**Principle:** Deny by default; least privilege per role.

---

## 4. Multi-tenant isolation

| Control | Location |
|---------|----------|
| Org ID on all clinical rows | Prisma schema (`organizationId`) |
| Mutation guard | `assertSameOrg(user, row)` |
| AI gateway | `assertTenantAccess()` |
| Query scoping | Server actions filter by `user.organizationId` |
| Demo isolation | Separate org slug `eyeq-demo`; reset scoped to demo org ID |

**Defense in depth gap:** PostgreSQL Row Level Security (RLS) not yet applied — isolation depends on application code correctness.

---

## 5. AI Gateway security

All AI features should route through `executeAIRequest()` (`src/lib/ai-gateway/gateway.ts`):

| Stage | Purpose |
|-------|---------|
| Emergency shutdown | `AI_EMERGENCY_SHUTDOWN` env |
| Authorization | Role + request type matrix |
| Tenant access | Validates user/patient/org relationship |
| PHI safety gate | Regex + known-patient matching; blocks/redacts |
| Prompt guard | Injection / policy patterns |
| Model router | Vendor selection + fallback |
| Clinical safety validator | Non-diagnostic language enforcement |
| Audit | `AiGatewayRequest`, `PhiDetectionEvent`, `BlockedAiRequest` |
| Usage tracker | Cost and rate observability |

**PHI transmission:** Blocked unless `AI_BAA_CONFIRMED=true` AND `AI_ALLOW_PHI=true` (both must be deliberately set).

---

## 6. Data protection

| Data type | Storage | Access control |
|-----------|---------|----------------|
| Demographics, clinical | Postgres | RBAC + org scope |
| Imaging binaries | Supabase Storage | Signed upload/download URLs; path includes org |
| Documents | Supabase Storage | Same as imaging |
| Audit events | Postgres (or stdout) | `audit:read` permission |
| AI request logs | Postgres | Admin + gateway tables; redacted message fields |

### Encryption

| State | Mechanism |
|-------|-----------|
| In transit | TLS (HTTPS) |
| At rest | Supabase/Postgres provider-dependent (configure in host) |
| Secrets | Server env vars only; never `NEXT_PUBLIC_*` for keys |

---

## 7. API surface

| Route | Auth | Notes |
|-------|------|-------|
| `/api/health` | Public | Liveness |
| `/api/auth/sign-out` | Public | Clears session |
| `/api/patients` | Staff + org | GET list; POST via action |
| `/api/appointments` | Staff + org | CRUD mirror |
| `/api/care-gaps` | Staff + org | Read/update |
| `/api/imaging/*` | Staff + org | Upload URL + analyze |
| `/api/copilot/stream` | Authenticated + `ai:use` | SSE stream |
| `/api/admin/ai/status` | Admin | Verify role gate |

**Preferred pattern:** Server Actions for mutations (CSRF handled by Next.js); REST for integrations and streaming.

---

## 8. Audit and logging

```typescript
// src/lib/audit/log.ts
audit({ organizationId, userId, action, resourceType, resourceId, metadata })
```

| Sink | Env | Use |
|------|-----|-----|
| Database | `AUDIT_LOG_SINK=db` | Default production |
| Stdout JSON | `stdout` | Log aggregators |
| External | `external` | Stub — implement before compliance audit |

AI invocations additionally log via `ai-gateway/audit-logger.ts`.

**Property:** Audit failures never block clinical operations; they emit stderr for monitoring.

---

## 9. Demo mode security

| Control | Detail |
|---------|--------|
| Enable flag | `FEATURE_DEMO_MODE` — default `false` in production |
| Shared account | `demo@eyeqai.app` — acceptable only in demo |
| Data wipe | `resetDemoMode()` scoped to demo org |
| Banner | Visible on staff layout when in demo org |

**Rule:** Never enable demo mode in an environment containing real PHI.

---

## 10. Deployment security (recommended)

| Item | Recommendation |
|------|----------------|
| Hosting | Vercel or hardened Node with secret manager |
| Env vars | Vercel encrypted env; separate prod/staging projects |
| Database | Pooled connection; restrict IP if self-hosted |
| Dependencies | `npm audit`; Dependabot |
| CI | `tsc`, `vitest`, `prisma validate`, `next build` |
| Headers | CSP, HSTS via platform config |

---

## 11. Threat model (summary)

| Threat | Mitigation | Residual |
|--------|------------|----------|
| Cross-tenant read | `assertSameOrg`, org-scoped queries | No RLS |
| Stolen session cookie | HTTPS, Supabase session rotation | No MFA |
| AI data exfiltration | PHI gate, server-only keys | Misconfigured env |
| Privilege escalation | RBAC on actions | API gap |
| Demo data leak | Env gate | Mis-deploy |
| Insider audit tampering | Append-only audit (future) | DB admin access |

---

## 12. Related documents

- `EYEQ_SECURITY_RISK_REGISTER.md`
- `HIPAA_TECHNICAL_SAFEGUARDS.md`
- `ROLE_PERMISSION_MATRIX.md`
- `ENVIRONMENT_VARIABLES.md`
- `PRODUCTION_READINESS_CHECKLIST.md`

---

*This document describes security architecture intent. It does not certify compliance with HIPAA, SOC 2, or any regulatory framework.*
