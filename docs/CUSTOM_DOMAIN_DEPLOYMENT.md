# Custom Domain Deployment (Demo Host)

Connect a marketing site Live Demo button to an EyeQ demo host (for example `demo.eyeqai.app`). This path is for **synthetic demo** traffic, not live PHI production.

## Recommended topology

| Host | Purpose | Demo mode |
|------|---------|-----------|
| Marketing site | Live Demo CTA → `/demo` | N/A (static / marketing) |
| `demo.*` app | EyeQ Next.js app | `DEMO_MODE=true` |
| Pilot / prod app | Real practices | `DEMO_MODE=false`, PHI gates on |

Do not point public Live Demo at a tenant that has live PHI enabled.

## DNS

1. Add a CNAME (or A records from Vercel) for your demo hostname.
2. Attach the domain in the Vercel project used for the **demo** deployment.
3. Wait for TLS to become active.
4. Set `NEXT_PUBLIC_APP_URL` to `https://your-demo-host`.

## Environment (demo host)

Required:

- `NEXT_PUBLIC_APP_URL=https://your-demo-host`
- `DEMO_MODE=true` or `FEATURE_DEMO_MODE=true`
- `APP_ENV=demo` (or `development` for local)
- Database + Supabase auth vars for the **demo** project
- `ALLOW_SEED_DATA=true` only if you intentionally allow reset/seed on this host

Must stay off / fail-closed for demo:

- Do not set live PHI pilot flags that open production PHI
- Do not reuse production `SUPABASE_SERVICE_ROLE_KEY` or production DB
- Do not ship OpenAI / Google keys that write to customer production accounts unless intentionally demo-scoped

Google Reviews on demo:

- Seed uses `demoMode=true` connections
- Publish → `DEMO_PUBLISHED` only
- Live Google keys optional; not required for the public demo story

## Website Live Demo button

Point the marketing CTA to:

```text
https://your-demo-host/demo
```

Or same-origin `/demo` if marketing and app share the host.

Flow must remain: Live Demo → `/demo` intro → role → walkthrough → pages.

## After DNS cutover

1. Open `/demo` anonymously
2. Start Owner Demo
3. Confirm walkthrough + Reputation sidebar
4. Confirm demo banner and no live PHI claims
5. Run `docs/PRE_PUBLIC_DEMO_QA_CHECKLIST.md`
