# Performance Audit

Internal report of EyeQ performance work (Jul 2026). PHI gates, RBAC, RLS, MFA, and demo/live separation were not weakened.

## Slow pages found

| Route | Likely cause | Fix applied | Remaining risk |
|---|---|---|---|
| `/provider/dashboard` | Admin path skipped count cache; pilot launch loaded all staff + vendors | Always cache critical/secondary counts; merge launch via 30s `cachedPilotLaunchSummary`; slim pilot query to flags + counts; role dashboards fetch metrics in same `Promise.all` | Secondary widgets still one wave after critical inside uncached loader (then cached 20s) |
| `/provider/patients/[id]` | Overview shipped full SOAP + message bodies | Overview notes metadata only; Notes/Visits tabs Suspense-load `listPatientNotesPage`; message previews omit bodies | Assessment still on overview for intelligence snippets |
| `/provider/patients` | Full Patient rows; sequential merge query | Narrow `select`; parallel merge candidates | Search still ILIKE on email/phone |
| `/provider/appointments` | Large take + create lists | Prior: take 120; create lists gated | Week dense schedules may truncate |
| `/provider/imaging` | List included AI notes/flags | List metadata + urgency only; viewer `dynamic()` import | Viewer page still loads analyses on open |
| `/provider/imaging/[id]` | Static ImagingViewer in server graph | `next/dynamic` + skeleton | Signed URL fetch still sequential |
| `/provider/encounters/.../exam` | Full patient/appointment include + static workspace | Narrow select; dynamic ExamChartWorkspace | `getOrCreateExamChart` write on first open |
| `/provider/reputation` | Unbounded reviews with full includes | `take: 40` + `select`; questions/drafts/analytics sub-routes | Older reviews need pagination UI |
| `/provider/messages` | Per-thread unread counts | Prior: take 40 + preview | Denormalize unread still open |
| `/provider/demo-walkthrough` | No loading UI; light prefetch | Route `loading.tsx`; prefetch dashboard/schedule/chart/imaging/messages/reputation/eye-health | First demo provision still cold |
| Provider layout | Duplicate location + notifications | Prior: React.cache + 15s notification cache | — |

## Expensive queries / duplicates

- Command center: appointment `groupBy` + counts (parallel). Launch no longer blocks uncached full dashboard.
- Chart overview vs Notes tab: SOAP deferred (removed duplicate full bodies on first paint).
- Patients list + merge: now parallel.
- Role dashboard: metrics no longer waterfalled after first `Promise.all`.

## Large client / heavy imports

| Component | Change |
|---|---|
| `ImagingViewer` | dynamic import, `ssr: false` |
| `ExamChartWorkspace` | dynamic import, `ssr: false` |
| Copilot / CommandBar | already idle-deferred in lazy client shell |

## Indexes

- `20260720180000_performance_indexes` (appointments, encounters, imaging, messages, notes, scribe)
- `20260720190000_performance_indexes_v2`: MessageThread inbox, Appointment org+provider+startsAt, GoogleReview status, ClinicalNote/ImagingCase patient timelines, SupportTicket

## Caching (safe)

| Cache | Key | TTL | Contents |
|---|---|---|---|
| Dashboard counts | org + location | 20s | Aggregate DTOs only |
| Pilot launch summary | org | 30s | Checklist flags (no PHI) |
| Notifications | org + role | 15s | Titles/counts |
| Org display | org | 60s | Display settings |

**Never cached:** patient charts, SOAP, message bodies, imaging blobs, auth/session. Keys always include organizationId.

## Loading states

Added/updated skeletons: reputation, demo-walkthrough, encounter exam, patient chart (`PatientChartSkeleton`), dashboard (existing).

## Demo walkthrough speed

- Prefetches current + next step and core demo routes
- `PrefetchLink` on step CTAs
- Avoids loading vendor test suites on walkthrough page itself

## Observability

`withPerfLog` on command-center and patient-chart-overview. Emits `{ type, route, durationMs, slow, organizationId, role, meta }` with no PHI.

## Remaining risks

1. Cursor pagination UI for messages / reputation / notes history beyond take windows
2. Denormalize unread onto MessageThread
3. Dynamic-import ScribeWorkspace
4. Parallel signed URL + prior study on imaging viewer
5. Middleware matcher narrowing

## Acceptance

- Typecheck / unit tests / Playwright smoke expected green after this pass
- Live PHI fail-closed; caches org-scoped and non-PHI
- Demo mode and recording mode labels retained
- No fake loading content
