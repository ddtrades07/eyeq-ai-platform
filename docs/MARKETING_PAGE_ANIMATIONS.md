# Marketing page animations

## Approach

EyeQ marketing motion uses **CSS + IntersectionObserver** via `ScrollReveal`. **framer-motion is not a dependency** and was not added: keeps the marketing bundle small and avoids blocking first paint.

## Components

| Component | Role |
| --- | --- |
| `GlassLensBg` | Lazy-mounted hero glass-lens blobs (`requestIdleCallback`); CSS keyframes `landing-lens-drift` |
| `ScrollReveal` | Fade + lift (~20px) + optional blur-to-clear; SSR stays visible; client with motion hides after hydration until in view (or `animateOnMount` for hero) |
| `ScrollStagger` | Incremental delay wrapper for children |
| `StickyPanel` | CSS `position: sticky` for solution copy on large screens |

## Sections (homepage)

1. Hero: Live Demo + Request Practice Demo + Start Practice Setup; glass lens background; mount stagger
2. Choose how you use EyeQ: Patient / Staff / Owner / Live Demo path cards
3. Problem: five friction cards
4. Solution: sticky intro + connected platform list
5. Feature cards: staggered Dashboard through Practice Readiness
6. AI safety: drafts only, provider review, not a diagnosis, PHI/BAAs
7. Built for Modern Optometry Practices: capabilities + owner CTAs (no public prices)
8. Demo CTA: free Live Demo for owners/providers/staff/patients
9. Patient benefits + trust

## Accessibility

- `prefers-reduced-motion: reduce` disables lens animation and ScrollReveal motion (`globals.css` + JS early return).
- SSR content remains fully visible for SEO; motion clients animate after hydration.
- Failsafe reveal at 3.5s if IntersectionObserver never fires.

## Live Demo CTA

All Live Demo links use `publicLiveDemoHref()` from the page server component: no payment gate.

## Verify locally

1. `npm run dev` and open `/` while logged out.
2. Hard refresh with reduced motion **off** in OS/browser settings.
3. Scroll slowly: problem cards, features, AI safety, path cards, and practice CTA should fade/lift in once.
4. Hero headline/CTAs should animate once on load.
5. Toggle prefers-reduced-motion: content should stay fully visible with no hide/show.
