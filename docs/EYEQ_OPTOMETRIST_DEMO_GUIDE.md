# EyeQ Optometrist Demo Guide

This guide matches the Live Demo button on the public site and the in-app walkthrough at `/provider/demo-walkthrough`.

## Canonical path

1. Marketing site → **Live Demo** → `/demo`
2. Choose role (Owner / Provider / Staff / Patient)
3. Staff roles land on `/provider/demo-walkthrough`
4. Patient role lands on `/patient/home`
5. Follow steps, then explore real pages from the sidebar

## Badges to say out loud

- Synthetic demo data only
- No live PHI
- Clinical AI is provider-review only
- Google replies in demo are DEMO_PUBLISHED (not live Google posts)

## Owner 12-minute path

1. Dashboard Reputation card (1 min)
2. Schedule / patient flow (1 min)
3. Michael chart + SOAP (2 min)
4. Imaging + AI review support (2 min)
5. Eye Health Library (1 min)
6. Google Reviews draft reply (DEMO_PUBLISHED) (2 min)
7. PHI readiness + audit / support (2 min)

## Full walkthrough (15 steps)

Follow all steps on `/provider/demo-walkthrough`:

1. Dashboard
2. Schedule / patient flow
3. Patient chart
4. Encounter / SOAP
5. Rx
6. Imaging
7. AI Image Analysis
8. Eye Health Library
9. Patient portal
10. Secure messages
11. Google Reviews / reputation
12. Optical / inventory
13. Billing drafts
14. PHI / vendor readiness
15. Audit / support

## Reputation talking points

Click: Walkthrough → Reputation (sidebar: Google Reviews, Questions, Reply Drafts, Analytics).

Say:

- Draft thank-yous and escalate negatives
- Approve before publish
- Demo marks DEMO_PUBLISHED; live Google connection required for real publishing
- Never auto-posts; never paste PHI into public replies

Expected: pending reviews, one draft awaiting approval, one DEMO_PUBLISHED example, unanswered questions.

## Honest answers

**Does EyeQ replace my full EHR/RCM?**  
No. EyeQ is a modern optometry OS with strong workflows; billing is draft-oriented and not a full clearinghouse replacement claim.

**Does AI diagnose?**  
No. Clinical and imaging AI outputs are drafts for provider review only.

**Does the demo post to Google?**  
Only when Google Business is connected for a real practice. In demo, replies are DEMO_PUBLISHED.

**Is this live PHI?**  
No. Live Demo uses synthetic data only. Live PHI stays fail-closed until readiness and BAAs are complete.

## Demo credentials (local / seeded)

Org slug: `eyeq-demo`  
Password (seeded roles): `EyeQDemo!2026`  
Prefer role entry from `/demo` rather than sharing passwords on stage.

## Ready checklist

- Multi-role Live Demo entry
- Guided walkthrough with Reputation + Eye Health Library
- Reputation visible in nav, dashboard, seed, and intro
- Demo banners and honesty labels intact
