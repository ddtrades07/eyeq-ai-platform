# Pre-Public Demo QA Checklist

Use before connecting the public website Live Demo button to a custom domain. This is **not** a live PHI production launch checklist.

## Entry path

- [ ] Marketing site Live Demo → `/demo`
- [ ] `/demo` shows role cards (Owner / Provider / Staff / Patient) with time estimates
- [ ] Badges: Synthetic demo data only, No live PHI, Clinical AI is provider-review only
- [ ] Feature cards include Google Reviews and Eye Health Library
- [ ] Staff roles land on `/provider/demo-walkthrough` (not a cold dashboard dump)
- [ ] Patient role lands on `/patient/home`

## Reputation (critical)

- [ ] Owner sidebar shows Reputation section: Google Reviews, Google Questions, Reply Drafts, Review Analytics
- [ ] Dashboard Reputation card shows counts + Open Reputation Inbox
- [ ] Walkthrough step 11 opens `/provider/reputation`
- [ ] Seed shows 5-star / 3-star / negative / DRAFT / DEMO_PUBLISHED
- [ ] Questions seed: appointments, insurance, CL exams, one answered (DEMO_PUBLISHED)
- [ ] Approve & publish in demo → DEMO_PUBLISHED label (not "Published to Google")
- [ ] No auto-publish
- [ ] Provider without permission sees locked message (not stack trace)

## Walkthrough (15 steps)

- [ ] Dashboard
- [ ] Schedule / patient flow
- [ ] Patient chart
- [ ] Encounter / SOAP
- [ ] Rx
- [ ] Imaging
- [ ] AI Image Analysis
- [ ] Eye Health Library
- [ ] Patient portal
- [ ] Secure messages
- [ ] Google Reviews / reputation
- [ ] Optical / inventory
- [ ] Billing drafts
- [ ] PHI / vendor readiness
- [ ] Audit / support

## Seed data smoke

- [ ] Owner, provider, staff, patient portal users
- [ ] 5 synthetic patients
- [ ] Today appointments: walk-in, checked-in, ready for provider, completed
- [ ] Unsigned + signed SOAP
- [ ] Glasses + CL Rx
- [ ] Imaging + AI draft
- [ ] Eye Health recommendation
- [ ] Portal message
- [ ] Optical order + low-stock item
- [ ] Invoice draft
- [ ] Care gap
- [ ] Support ticket
- [ ] Audit events after actions

## Safety

- [ ] Demo banner visible; recording mode `?recording=true` works
- [ ] Demo reset never runs on non-demo orgs
- [ ] PHI readiness stays fail-closed for demo org
- [ ] Secrets not shown in UI or client bundles
- [ ] AI disclaimers present on clinical / imaging AI surfaces

## Performance (presenter laptop)

- [ ] Dashboard usable within a few seconds after warm login
- [ ] Walkthrough prefetches next step
- [ ] Imaging list does not load full viewer on first paint
- [ ] Reputation inbox limited (take 40)

## Deploy readiness (demo hosting)

- [ ] `FEATURE_DEMO_MODE=true` (or `DEMO_MODE=true`) on demo host only
- [ ] `ALLOW_SEED_DATA` only on demo / non-PHI hosts
- [ ] Custom domain docs followed (`CUSTOM_DOMAIN_DEPLOYMENT.md`)
- [ ] Env secrets in Vercel / host only (`GITHUB_AND_VERCEL_DEPLOYMENT.md`)

## Sign-off

| Check | Result | Notes |
|-------|--------|-------|
| Typecheck | | |
| Unit tests | | |
| Production build | | |
| Playwright smoke | | |
| Ready for website Live Demo domain | Yes / No | |
