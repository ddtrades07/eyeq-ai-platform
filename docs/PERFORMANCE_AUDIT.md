# Performance Audit

Internal report of EyeQ performance work (Jul 2026). PHI gates, RBAC, RLS, MFA, and demo/live separation were not weakened.

## Slow routes found

| Route | Likely cause | Fix applied | Remaining risk |
|---|---|---|---|
| `/provider/dashboard` | ~27 parallel count queries + pilot launch for admins | Collapsed appointment status into `groupBy`; secondary widgets `Promise.allSettled`; short TTL `unstable_cache` for non-admin counts; admin launch still uncached | Pilot launch still heavy for OWNER/ADMIN |
| Provider layout (all pages) | Duplicate location resolution + 8 notification counts | `React.cache` on location helpers (primitive keys); 15s notification cache keyed by org+role | Cache stale up to ~15–20s after writes until tag bust |
| `/provider/patients/[id]` | Megafetch: 50 notes/imaging/appts with full SOAP + AI arrays | `getPatientChartOverview` with capped selects; intelligence reuses preloaded rows | Notes tab still uses overview window (not infinite history yet) |
| `/provider/appointments` | take 200 + always load 100 patients/providers | take 120; patient/provider/location lists only when `appointments:create` | Dialog still SSR-loads create lists for creators |
| `/provider/scheduling` | take 500 | Cap 200 for week view | Dense multi-provider weeks may truncate |
| `/provider/imaging` | Full ImagingCase rows + appointment join for location | `select` metadata only; filter `locationId` directly | Upload dialog still loads patient names when permitted |
| `/provider/messages` | 100 threads with full message bodies | take 40 + select latest preview only | Unread `_count` still per-thread |
| `/provider/messages/[threadId]` | Unbounded history | Last 100 messages only | Older history not paginated in UI yet |
| Client shell | Copilot + CommandBar mounted immediately | Idle deferred mount; DebugPanel prod-gated | First ⌘K before idle may miss until shell ready (~200ms–1.2s) |

## Database indexes added

Migration: `prisma/migrations/20260720180000_performance_indexes/migration.sql`

- Appointment: `(organizationId, locationId, startsAt)`, `(organizationId, status, startsAt)`, `(patientId, startsAt)`
- Encounter: `(organizationId, locationId, status)`, `(organizationId, status, updatedAt)`
- ImagingCase: archived/studyStatus/capturedAt + location compounds
- Message: `(threadId, readStatus)`
- Patient: `(organizationId, archivedAt)`
- ClinicalNote: `(organizationId, status, updatedAt)`
- AmbientScribeSession: `(organizationId, reviewStatus, archivedAt)`

## Caching strategy (safe)

| Cache | Key includes | TTL | Contents |
|---|---|---|---|
| Dashboard counts | orgId + location | 20s | Aggregate counts / DTO only |
| Notifications | orgId + role | 15s | Titles + counts (no message bodies) |
| Invalidation | `revalidateTag(org:{id}:dashboard\|notifications)` on appointment/imaging writes | — | Path revalidate still used |

**Not cached:** patient charts, message bodies, imaging blobs, note SOAP, auth/session.

## Bundle / perceived speed

- Lazy client shell idle-deferred
- Dashboard / support skeletons improved
- Existing route `loading.tsx` retained

## Observability

`withPerfLog` emits JSON `{ type: 'perf', route, durationMs, slow, organizationId, role, meta }` — no patient names or clinical content.

## Remaining work (not blockers)

1. Cursor pagination UI for message threads and notes history
2. Slim `evaluatePilotLaunch` to aggregates
3. Dynamic-import ImagingViewer / ScribeWorkspace / ExamChartWorkspace on their routes
4. Narrow middleware matcher further
5. Denormalize unread count onto MessageThread

## Acceptance check

- Typecheck / unit tests / Playwright public smoke expected green after this pass
- Live PHI still fail-closed; caches are org-scoped and non-PHI
- Demo mode unchanged
