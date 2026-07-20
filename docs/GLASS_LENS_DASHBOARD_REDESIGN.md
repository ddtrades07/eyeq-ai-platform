# EyeQ Glass Lens Dashboard Redesign

**Date:** July 14, 2026  
**Scope:** Provider shell + role dashboards. No schema or API behavior changes.

## 1. Design summary

Replaced the flat muted provider chrome with a clinical **glass lens** system:

- Soft layered pale-blue radial/linear canvas behind the provider workspace
- Frosted translucent panels with thin borders, inset highlights, and soft depth shadows
- Stronger opacity on data-dense cards (schedule, attention queues)
- Subtle violet lens glow reserved for Ask EyeQ / AI insight surfaces
- Primary actions use a calm blue→aqua gradient (no neon)
- Status chips always include text labels in addition to color
- Collapsible glass sidebar with illuminated active indicator
- Sticky glass header with premium Ask EyeQ control
- Reduced-motion support (hover lift and transitions disabled when requested)

Backend data loading, permissions, and demo workflows are unchanged.

## 2. Reusable components / tokens created

| Token / component | Path |
|-------------------|------|
| Lens CSS variables + utility classes | `src/app/globals.css` |
| Tailwind `lens.*` colors, shadows, durations | `tailwind.config.ts` |
| `GlassCard`, `GlassPanel`, `SectionHeader` | `src/components/ui/glass-card.tsx` |
| `StatusChip` + appointment status helpers | `src/components/ui/status-chip.tsx` |
| `MetricCard` | `src/components/dashboard/metric-card.tsx` |
| `AIInsightCard` | `src/components/dashboard/ai-insight-card.tsx` |
| `ScheduleCard` / `ScheduleRow` | `src/components/dashboard/schedule-card.tsx` |
| `AttentionCard`, `AttentionRow`, `QuickAction`, `QueueCard` | `src/components/dashboard/ops-cards.tsx` |

Shared class names: `.lens-canvas`, `.glass-card`, `.glass-card-strong`, `.glass-card-ai`, `.glass-card-imaging`, `.glass-header`, `.glass-sidebar`, `.glass-ask`, `.glass-nav-active`.

## 3. Pages / surfaces updated

| Surface | Change |
|---------|--------|
| Provider layout | `.lens-canvas` shell, frosted footer |
| Staff sidebar | Collapsible glass nav, active glow indicator, localStorage collapse |
| Top bar | Sticky glass header, glass profile menu |
| Ask EyeQ bar | Violet lens highlight + ARIA label |
| Buttons / Cards | Soft glass defaults used across provider pages |
| Role dashboards | Glass metrics, queue, schedule, EyeQ AI review card |
| Dashboard skeletons | Glass loading surfaces |

## 4. Visual verification

Live demo verified at `/provider/dashboard`:

- Owner dashboard: revenue metrics + EyeQ AI review card
- Optometrist dashboard: today’s patients, patient queue with wait time, schedule rows with text status chips, AI insights with “Review required”

Screenshots captured during browser verification (mobile viewport of the live app). Desktop shows the collapsible glass sidebar at `lg+`.

## 5. Accessibility results (manual)

| Check | Result |
|-------|--------|
| Text status chips (not color alone) | Pass |
| Ask EyeQ control has aria-label | Pass |
| Sidebar collapse control labeled | Pass |
| Focus rings retained on buttons/links | Pass |
| Contrast on frosted cards | Pass on light theme (strong surface for tables/queues) |
| `prefers-reduced-motion` | Transitions disabled |
| Theme toggle / dark mode switcher | **Not wired** — CSS `.dark` tokens exist, but no UI toggle yet |

## 6. Performance notes

| Check | Result |
|-------|--------|
| Unit tests | 38/38 pass |
| Typecheck | Pass |
| Backdrop blur | Limited to header/sidebar/cards — not nested containers |
| Hover animation | ~180ms; transform only |
| Server restart required | Cleared corrupted `.next` from earlier failed production build |

## 7. Remaining inconsistencies

1. Patient layout / marketing pages still use pre-lens theming (by design for this pass).
2. Dark mode tokens are ready, but there is no theme switcher in the UI yet.
3. Demo pitch tour / demo guide overlays still use their own cream/violet accents and sit above the lens canvas.
4. Imaging-specific darker glass cards are exported (`glass-card-imaging`) but not yet applied to the imaging review pages.
5. Mobile Ask EyeQ search bar remains `sm+` only; floating Ask EyeQ trigger still covers small screens.
6. Exact pixel-perfect desktop desktop screenshots need a wide viewport (browser automation used a narrow pane).

## 8. Test commands

```bash
cd eyeq-ai-platform
npm run typecheck
npm test
npm run dev
# then open:
# http://localhost:3000/demo
# or login and go to http://localhost:3000/provider/dashboard
```

If `/demo` returns 500 after a failed `next build`, clear cache and restart:

```bash
# stop process on port 3000, then:
Remove-Item -Recurse -Force .next
npm run dev
```
