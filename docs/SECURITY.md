# Security & HIPAA posture

> EyeQ AI is **not** a covered entity by default. Practices deploying EyeQ AI in a HIPAA context are responsible for executing a BAA with their hosting vendors (Supabase, Vercel, AI providers) and configuring the platform accordingly.

## What the code enforces

- **Authentication.** Supabase Auth issues JWTs; middleware refreshes session cookies on every request and redirects unauthenticated users to `/login`.
- **Authorization.** RBAC matrix in `src/lib/auth/rbac.ts`; every server action runs `assertPermission(...)`.
- **Tenant isolation.** Every server action checks `assertSameOrg(user, row)` before touching org-scoped data. Cross-tenant attempts throw `AuthError(403)` and are recorded in the audit log.
- **Audit log.** Every mutation calls `audit({...})`. Records include actor, action, resource type, resource ID, and metadata. Sink configurable via `AUDIT_LOG_SINK`.
- **Secure file access.** Imaging files live in private Supabase Storage buckets. Upload uses a signed one-time URL minted on the server. Download uses short-lived signed URLs.
- **Server-only secrets.** `SUPABASE_SERVICE_ROLE_KEY` and any AI API keys are only read through `src/lib/env.ts` and are never bundled into client components. The storage admin module is marked `import 'server-only'`.
- **Input validation.** Every action validates with Zod before touching Prisma.
- **Output safety.** AI outputs are surfaced through `SafetyDisclaimer`. The platform never presents diagnosis-style conclusions.

## Production checklist

- [ ] Sign BAAs with Supabase, Vercel, and any AI vendor before flipping `AI_PROVIDER` off `mock`.
- [ ] Enable Supabase Postgres row-level security backstops (defence-in-depth) for any tables your operations team accesses directly.
- [ ] Configure Supabase Auth password policy (length, breach checking).
- [ ] Enable MFA in Supabase Auth and require it for staff roles.
- [ ] Set short JWT TTLs and rotate the JWT secret on a schedule.
- [ ] Route audit logs into long-term cold storage (`AUDIT_LOG_SINK=external` then forward to S3 / CloudWatch / Datadog).
- [ ] Pin Vercel deployments to a HIPAA-eligible region.
- [ ] Disable Supabase Storage public buckets entirely; only ever issue signed URLs.
- [ ] Run `npm run typecheck`, dependency audits, and SAST in CI.
- [ ] Configure a Web Application Firewall in front of the Vercel domain.
- [ ] Add monitoring (Sentry / Datadog APM).
- [ ] Schedule periodic backups + restore drills for the Postgres instance.

## Known gaps (intentional)

- **Email verification / MFA flows** in the UI are stubs — Supabase handles delivery; surface them in `/login` once your policy is finalized.
- **Patient data export / portability** endpoints are not yet implemented; clinics in HIPAA jurisdictions must build these to satisfy patient access rights.
- **Break-glass access** (e.g. emergency override with audit) is not implemented; consider adding a special role + double-log workflow for clinics that require it.
