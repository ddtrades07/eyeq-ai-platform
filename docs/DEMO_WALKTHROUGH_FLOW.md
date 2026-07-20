# Demo Walkthrough Flow

Canonical Live Demo path:

```
Marketing (/) 
  → Live Demo button 
  → /demo (intro + role picker)
  → role sign-in
  → /provider/demo-walkthrough (staff)
     or /patient/home (patient)
```

## Walkthrough route

`/provider/demo-walkthrough`

Source of steps: `src/lib/demo/guide-steps.ts` (`DEMO_WALKTHROUGH_STEPS`).

Each step includes:

- title
- what to click
- what to say
- linked page
- expected result
- status (`ready` | `demo-only` | `not-configured` | `blocked`)
- estimated minutes
- next step + prefetch of next href

## Page map

| Step | App route |
|------|-----------|
| 1 Dashboard | `/provider/dashboard` |
| 2 Schedule / flow | `/provider/appointments`, `/provider/patient-flow` |
| 3 Patient chart | `/provider/patients/{michaelId}` |
| 4 Encounter / SOAP | `/provider/patient-flow` + chart notes |
| 5 Rx | patient chart prescriptions |
| 6 Imaging | `/provider/imaging` |
| 7 AI Image Analysis | `/provider/imaging/{imagingId}` |
| 8 Eye Health Library | `/provider/eye-health-library` |
| 9 Patient portal | `/patient/home` |
| 10 Secure messages | `/provider/messages` |
| 11 Google Reviews / reputation | `/provider/reputation` (+ questions / drafts / analytics) |
| 12 Optical / inventory | `/provider/optical`, `/provider/inventory` |
| 13 Billing drafts | `/provider/billing` |
| 14 PHI readiness | `/provider/settings/phi-readiness` |
| 15 Audit / support | `/provider/audit-logs`, `/provider/support` |

## Prefetch

While on the walkthrough page, the client prefetches the current and next step routes via Next.js `router.prefetch` and `PrefetchLink`, including Reputation and Eye Health Library.

## Fail-safe

If walkthrough data fails to load, show `DemoFailSafe` with return links. No raw stacks to presenters.
