# UI Polish Guide

EyeQ launch UI standards for multi-office demos and pilots.

## Principles

- Premium clinical SaaS, not a school demo
- Glass-lens surfaces with soft borders and clear hierarchy
- Every card routes somewhere useful or explains what is missing
- Never weaken PHI fail-closed gates
- Never fake production / vendor readiness
- Keep safety labels; recording mode only hides noisy chrome

## Visual system

- Use `GlassCard`, `SectionHeader`, `PageHeader`, `EmptyState`, `Badge`
- Prefer light glass over heavy gradients
- Compact cards with readable counts and one primary action
- Skeleton loaders on list pages (`loading.tsx`)
- Consistent button sizes (`sm` in dense toolbars, default for primary CTAs)

## Empty states

Each major empty state should answer:

1. What this section is for
2. What to do next
3. One clear action button

Examples: no patients, no appointments today, no imaging, no messages, Google not connected, AI not configured, reminders not configured, billing not configured, no staff invited.

## Role clarity

- Provider dashboards emphasize flow + clinical work + AI drafts
- Owner/admin dashboards add launch readiness and subscription usage
- Never dump admin clutter onto OD / tech / front desk views

## Recording mode

Append `?recording=true` once. Cookie `eyeq_recording_mode=1` persists.

- Compact demo banner
- Hides demo reset / guide launcher / noisy warnings
- Keeps demo + AI safety labels
