# Demo Mode Guide

## Entering demo

Use the public demo entry to land in the EyeQ Vision Center demo organization (`DEMO_ORG_SLUG`).

## What demo includes

- Seeded patients, appointments, imaging, messages, Google reviews
- Clear demo banner
- Role switcher for sales walkthroughs
- Demo guide launcher
- Safety labels retained (AI drafts, no diagnosis claims)

## Recording mode

Add `?recording=true` to any provider URL once.

Effects:

- Sets cookie `eyeq_recording_mode=1`
- Compact demo banner
- Hides reset/exit chrome noise, demo guide, and some warning banners
- Keeps demo + clinical safety labels
- Hides Ask EyeQ floating trigger noise for cleaner video

Turn off with `?recording=false`.

## Rules

- Never label demo as production
- Never claim live PHI processing in demo
- Reset between sales calls with the demo banner reset action (hidden in recording mode)
