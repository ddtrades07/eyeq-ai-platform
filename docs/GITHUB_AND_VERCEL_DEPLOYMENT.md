# GitHub and Vercel Deployment

Safe deployment notes for EyeQ demo and pilot hosts. Never commit secrets.

## Repositories

- Application code lives in this repo (`eyeq-ai-platform`)
- Use GitHub Actions or Vercel Git integration for builds
- Protect `main` with required checks (typecheck / build) when possible

## Vercel project split

Prefer **two** Vercel projects (or two environments):

1. **Demo** – public Live Demo, `DEMO_MODE=true`, synthetic seed allowed
2. **Pilot / production** – real practices, `DEMO_MODE=false`, PHI readiness enforced

Do not run public demos against a production database.

## Environment variables

Store secrets only in Vercel / host env (or a secrets manager). Never commit `.env.local`.

See `docs/ENVIRONMENT_VARIABLES.md` for the full list.

Demo project minimum:

- `DATABASE_URL`, `DIRECT_URL`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (demo project only)
- `DEMO_MODE=true` / `FEATURE_DEMO_MODE=true`
- `JOB_PROCESSOR_SECRET`

Pilot project additionally:

- PHI / BAA confirmation flags as required by readiness docs
- Vendor keys only when BAAs are in place
- `DEMO_MODE=false`

## Build

```bash
npm ci
npx prisma generate
npm run typecheck
npm test
npm run build
```

Optional:

```bash
npx playwright test
```

## Migrations

Run Prisma migrations against the target database before promoting a deployment:

```bash
npx dotenv -e .env.local -- prisma migrate deploy
```

For demo seed / reset:

```bash
npm run demo:reset
```

Reset is org-scoped to the demo tenant and must never target production orgs.

## Secret safety

- Rotate keys if they ever appear in chat logs, screenshots, or commits
- Restrict service-role keys to server-only usage
- Public client may only receive `NEXT_PUBLIC_*` values
- Do not expose Google / OpenAI / Twilio secrets to the browser

## Custom domain

See `docs/CUSTOM_DOMAIN_DEPLOYMENT.md` for DNS and Live Demo CTA wiring.
