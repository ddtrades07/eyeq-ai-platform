# Postgres backup & restore strategy

EyeQ does **not** auto-verify backups. Admins must attest provider, last backup, retention, and restore-test completion on **PHI readiness** / **Pilot launch**. Until `backupStatus=verified` and a restore test date is recorded, production PHI readiness stays **blocked** or **needs configuration**.

## Recommended strategy (managed Postgres)

1. **Provider**: Prefer the host’s managed backups (Supabase PITR, AWS RDS automated backups + snapshots, Neon, etc.).
2. **RPO target (pilot)**: Continuous WAL / PITR when available; otherwise nightly full + frequent incremental.
3. **Retention**: Document days retained (e.g. 30). Record `backupRetentionDays` in EyeQ.
4. **Encryption**: Confirm backups encrypted at rest with provider KMS.
5. **Access**: Restrict restore credentials to ops break-glass roles; never store restore secrets in the app.

## What to record in EyeQ

| Field | Meaning |
| --- | --- |
| `backupProvider` | e.g. Supabase PITR |
| `backupStatus` | `unknown` / `configured` / `verified` / `failed` |
| `backupLastAt` | Last known successful backup (ops-attested) |
| `backupRetentionDays` | Retention window |
| `backupRestoreTestAt` | Date of successful restore drill |
| `backupRestoreTestNotes` | Short notes (env restored, time taken) |

Only mark **verified** after a real restore drill succeeds.

## Restore procedure (outline)

1. Declare incident / maintenance window; notify practice owner.
2. Identify restore point (timestamp or snapshot id). **Do not** restore over production without a written go/no-go.
3. Restore into an **isolated** staging database first when possible.
4. Validate:
   - row counts for patients / appointments / notes
   - one known patient chart opens
   - RLS policies still present (`prisma/rls.sql`)
   - app health `/api/health`
5. If cutover is required: freeze writes, restore, rotate credentials if needed, smoke-test login + MFA + one encounter.
6. Record restore test in EyeQ and audit the change.
7. Document any data gap (RPO) for the practice.

## Rollback guidance after bad CSV import

CSV migration is **not** full EHR conversion. Prefer:

1. Soft-delete or archive imported patients tagged with import batch audit metadata.
2. If restore is required, restore from pre-import snapshot rather than “undo CSV” in app.
3. See `docs/PILOT_MIGRATION_GUIDE.md`.

## Manual / blocked

- EyeQ does not schedule or verify cloud backups.
- Point-in-time restore remains a host-console / ops task.
- Legal retention and BAAs for backup vendors are outside the app UI.
