# EyeQ AI. Imaging Implementation Plan

**Audit date:** May 2026  
**Stack:** Next.js 15 App Router · Prisma · PostgreSQL (Supabase) · Supabase Auth/Storage · Zustand · Server Actions

## Phase 1 Audit Summary

| Area | Finding |
|------|---------|
| Framework | Next.js 15 (not Vite) |
| Router | App Router `(staff)` / `(portal)` |
| Database | Prisma + PostgreSQL |
| Auth | Supabase SSR + `User`/`Role` RBAC |
| Storage | Supabase private buckets + signed URLs |
| State | Zustand (patient/copilot), server components for data |
| Imaging model | Flat `ImagingCase`: no child assets/analysis/findings |
| Current analysis | **Problem:** mock findings from patient chart context; GPT-4o Vision fallback when OpenAI key set (general LLM, not validated imaging model) |
| Quality gate | Metadata heuristics only: exists but not persisted |
| Dashboard | 6 stat cards + duplicate insight widgets (TodayInsights + ProactiveAlerts + RecentPatients) |
| Tests | None configured |
| Location | Switcher + `UserLocationAccess` already implemented |

## Critical gaps vs spec

1. Mock/invented clinical findings when no validated provider configured
2. Silent fallback from failed vision API to mock disease-like templates
3. No persisted quality/analysis/findings/review records
4. No model registry or provider modes
5. Portal may show raw `providerNote` not approved `patientSummary`
6. Dashboard cluttered with overlapping intelligence widgets

## Implementation strategy (incremental, minimal breaking)

### A. Data model
- **Evolve `ImagingCase` as imaging study** (avoid rename migration)
- Add: `locationId`, `laterality`, `checksum`, `studyStatus`, `patientSummary`, `patientSummaryApprovedAt`
- Add child models: `ImagingAsset`, `ImageQualityAssessment`, `ImagingAnalysis`, `ImagingFinding`, `ProviderImagingReview`, `ModelRegistry`, `ImagingAuditEvent`
- Expand enums; map legacy `ImagingStatus` ↔ `studyStatus` in orchestrator

### B. Services (`src/lib/imaging/services/`)
- `imagingOrchestrator`: upload → quality → provider → persist → revalidate
- `imagingProviderInterface` + `manualReviewProvider`, `externalValidatedProvider`, `developmentMockProvider`
- `modelRegistryService`, `imageQualityService` (enhanced), `resultNormalizer`, `uncertaintyService`, `auditService`
- **Remove** chart-context mock findings from production path

### C. Provider modes (env)
- `IMAGING_ANALYSIS_MODE`: `manual` | `external` | `custom` | `development-mock`
- `IMAGING_DEV_MOCK=true` only in development
- External: `IMAGING_ANALYSIS_ENDPOINT` + `IMAGING_ANALYSIS_API_KEY` (server-only)
- Production default: **manual**: store image, no automated findings

### D. UI
- `ImagingViewer` client component (zoom/pan, quality banner, disclaimer)
- Update detail page + structured review to show mode badge
- Dashboard: Today's Schedule, Provider Attention Queue, Morning Huddle, Falling Through Cracks, Workflow Health

### E. Sync
- `revalidateImagingViews()` on upload/quality/analysis/review/sign-off

### F. Tests
- Vitest unit tests for quality rules, normalization, scope control, sign-off gates

### G. Docs
- `CLINICAL_VALIDATION_READINESS.md`, update `.env.example`, installation page

## Execution order

1. Schema + env
2. Services + orchestrator rewrite
3. Server actions + revalidation
4. UI (viewer, detail, dashboard)
5. Portal patient-summary gate
6. Tests + build verification

## Out of scope (documented placeholders)

- DICOM viewer, malware scanning, real thumbnail generation (metadata placeholder)
- FDA-cleared model integrations (registry slots only)
- WebSocket real-time (revalidation sufficient for pilot)
