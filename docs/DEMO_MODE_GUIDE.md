# Demo Mode Guide

## Entering demo

1. Click **Live Demo** on the marketing site or login page.
2. Land on `/demo` (intro + role picker).
3. Start Owner, Provider, Staff, or Patient Portal demo.
4. Staff roles open `/provider/demo-walkthrough`.
5. Patient role opens `/patient/home`.

Demo organization slug: `eyeq-demo` (EyeQ Vision Center).

## What demo includes

- Seeded synthetic patients, appointments, imaging, messages, Google reviews
- Clear demo banner (Demo mode · Synthetic data · No live PHI)
- Role switcher for sales walkthroughs
- Guided walkthrough page + floating coach marks
- Safety labels retained (AI drafts, not a diagnosis, provider review required)
- Reset demo (demo org only, audited)

## Recording mode

Add `?recording=true` to any provider URL once.

Effects:

- Sets cookie `eyeq_recording_mode=1`
- Compact demo banner
- Hides reset/exit chrome noise and floating guide clutter for cleaner video
- Keeps demo + clinical safety labels
- Hides Ask EyeQ floating trigger noise for cleaner video

Turn off with `?recording=false`.

## Labels and honesty

Every demo surface should show:

- Demo mode
- Synthetic data
- No live PHI

Vendor-dependent features:

- Demo mode
- Not configured
- Connected
- Blocked
- BAA required

Google Reviews: live publish only if connected; otherwise `DEMO_PUBLISHED`.

Reminders: demo-sent only in demo org; production send blocked unless vendor, BAA, and consent are ready.

AI: demo_mock / disabled / openai depending on config; clinical PHI blocked unless readiness passes.

## Rules

- Never label demo as production
- Never claim live PHI processing in demo
- Never claim full EHR/RCM replacement
- Reset between sales calls with the demo banner reset action (hidden in recording mode)
- See `EYEQ_OPTOMETRIST_DEMO_GUIDE.md` and `DEMO_WALKTHROUGH_FLOW.md`
