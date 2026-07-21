# Marketing page animations

## Approach

EyeQ marketing motion uses **CSS + IntersectionObserver** (existing `FadeIn` pattern). **framer-motion is not a dependency** and was not added — keeps the marketing bundle small and avoids blocking first paint.

## Components

| Component | Role |
| --- | --- |
| `GlassLensBg` | Lazy-mounted hero glass-lens blobs (`requestIdleCallback`); CSS keyframes `landing-lens-drift` |
| `FadeIn` | Fade + slight lift + optional blur-to-clear; SSR stays visible; failsafe reveal at 2s |
| `Stagger` | Incremental delay wrapper for children |
| `StickyPanel` | CSS `position: sticky` for solution copy on large screens |

## Sections (homepage)

1. Hero — Live Demo + Schedule Demo + pricing link; glass lens background  
2. Problem — five friction cards  
3. Solution — sticky intro + connected platform list  
4. Feature cards — staggered Dashboard → Practice Readiness  
5. AI safety — drafts only, provider review, not a diagnosis, PHI/BAAs  
6. Demo CTA — free Live Demo for owners/providers/staff/patients  
7. Pricing preview — Pilot / Practice / Growth / Enterprise from `src/lib/billing/saas-plans.ts`

## Accessibility

- `prefers-reduced-motion: reduce` disables lens animation and FadeIn transitions (`globals.css` + JS early return).
- Content remains readable without JS (SSR visible).

## Live Demo CTA

All Live Demo links use `publicLiveDemoHref()` from the page server component — no payment gate.
