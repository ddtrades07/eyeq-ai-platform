# Demo Performance Notes

Goal: clicking through the Live Demo should feel fast and polished.

## Demo-flow targets

Dashboard, schedule, patient chart, encounter, SOAP, Rx, imaging, AI, messages, portal, reputation, billing, readiness.

## Techniques in place

- RSC pages with focused query helpers (command center, chart overview)
- Route `loading.tsx` skeletons (dashboard, patient chart, reputation, walkthrough, exam)
- Walkthrough prefetches current + next step and core demo routes (dashboard, schedule, chart, imaging, messages, reputation)
- `PrefetchLink` for hover/focus prefetch on walkthrough CTAs
- Lazy client shell for non-critical provider chrome
- Imaging viewer and exam workspace dynamically imported (`ssr: false`)
- Chart overview omits full SOAP bodies; Notes tab Suspense-loads paginated notes
- Imaging list shows metadata only (no AI note arrays)
- Command-center counts cached 20s; pilot launch summary cached 30s (admin)
- Demo reset returns to walkthrough with a clean synthetic dataset

## Safe caching rules

- Cache only demo-org-safe static settings and short TTL aggregates already used by dashboard helpers
- Never cache live PHI across organizations
- Demo org slug gating (`eyeq-demo`) must remain the boundary
- Production PHI fail-closed gates are unchanged

## Recording mode tips

Use `?recording=true` to reduce layout noise while keeping safety labels. Prefer skeleton loaders over blank screens during captures.

## What not to do

- Do not prefetch authenticated PHI pages for anonymous visitors
- Do not disable demo / diagnosis / readiness labels for speed
- Do not invent empty-state “success” metrics to hide slow queries
