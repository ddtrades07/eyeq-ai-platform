# GitHub and Vercel Deployment

Safe deployment notes for EyeQ demo and pilot hosts. Never commit secrets.

**Critical:** Vercel must **Import** a connected GitHub repository so the project has a `repoId`. Deploying without that Git connection causes:

`Invalid request: gitSource missing required property repoId`

Do not use a disconnected / CLI-only project when you need Git-based deploys and previews.

## Demo vs pilot (project split)

Prefer **two** Vercel projects (or clearly separated environments):

1. **Demo** - public Live Demo, `DEMO_MODE=true` / `FEATURE_DEMO_MODE=true`, synthetic seed allowed
2. **Pilot / production** - real practices, `DEMO_MODE=false`, PHI readiness enforced

Do not run public demos against a production database. Do not weaken PHI gates for convenience.

See also: [`CUSTOM_DOMAIN_DEPLOYMENT.md`](./CUSTOM_DOMAIN_DEPLOYMENT.md) for demo hostname / Live Demo CTA wiring.

## Prerequisites

- Private GitHub repo for this app (recommended)
- Vercel account with permission to install the **Vercel GitHub App**
- Env values ready (placeholders in `.env.example`; full list in [`ENVIRONMENT_VARIABLES.md`](./ENVIRONMENT_VARIABLES.md))

## Path A. New private GitHub repo

If the GitHub remote does not exist yet:

1. Create a **private** repository on GitHub (e.g. `eyeq-ai-platform`). Do not initialize with a README if you already have local code.
2. In the project root:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<org-or-user>/eyeq-ai-platform.git
git push -u origin main
```

3. Confirm `.env.local` and other secrets are **not** staged (`git status`). Only `.env.example` should be trackable among env files.

## Path B. Repo already exists (this project)

This repo already has a private remote, for example:

`https://github.com/ddtrades07/eyeq-ai-platform`

If code is already pushed to `main`:

1. Confirm remote: `git remote -v`
2. Pull/push as needed so GitHub matches what you want Vercel to build
3. Skip `git init` / `remote add`: go straight to **Import into Vercel** below

Never force-push secrets or `.env.local`. If a secret was ever committed, rotate it.

## Import the GitHub repo into Vercel (provides `repoId`)

This step is what fixes `gitSource missing required property repoId`.

1. Open [Vercel Dashboard](https://vercel.com/dashboard) → **Add New…** → **Project**
2. Choose **Import Git Repository** (not a blank/disconnected project)
3. Install / authorize the **Vercel GitHub App** if prompted
4. Grant access to the **private** repo (`eyeq-ai-platform` or your org’s copy)
5. Select the repository and click **Import**
6. Framework preset: **Next.js** (recommended)
7. Root directory: leave default unless the app lives in a monorepo subfolder
8. Do **not** deploy until env vars are set (next section), or expect a failed first build

After import, Vercel stores a Git `repoId` and can create production + preview deployments from pushes and PRs.

### If you already created a broken / disconnected Vercel project

- Prefer **delete** that project and **Import** the GitHub repo cleanly, **or**
- In project **Settings → Git**, connect the GitHub repository through the Vercel GitHub App

A project without a linked Git source will keep failing requests that expect `gitSource.repoId`.

## Install / authorize the Vercel GitHub App

For private repos:

1. Vercel → account/team → **Integrations** / Git connection, or follow the prompt during Import
2. Authorize the Vercel GitHub App for your user or org
3. Under **Repository access**, include this private repo (or “All repositories” if appropriate)
4. Confirm the Vercel project **Settings → Git** shows the connected repository

Without App access, Import cannot complete and `repoId` will be missing.

## Environment variables in Vercel

Store secrets only in Vercel project settings (Production / Preview / Development as needed). Never commit `.env.local`.

See [`ENVIRONMENT_VARIABLES.md`](./ENVIRONMENT_VARIABLES.md) and copy names from `.env.example`.

### Demo project minimum

- `DATABASE_URL`, `DIRECT_URL`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (demo Supabase project only: not production)
- `DEMO_MODE=true` / `FEATURE_DEMO_MODE=true`
- `APP_ENV=demo` (or non-production)
- `JOB_PROCESSOR_SECRET`

### Pilot / production project

- Same core DB + Supabase vars, pointed at the **pilot** project
- `DEMO_MODE=false` / `FEATURE_DEMO_MODE=false`
- `APP_ENV=production`
- PHI / BAA confirmation flags as required by readiness docs
- Vendor keys only when BAAs are in place
- Do not enable `ALLOW_SEED_DATA` or simulated payment/claim flags

## Custom domain

Attach domains in the Vercel project (**Settings → Domains**), then set `NEXT_PUBLIC_APP_URL` to the public HTTPS origin.

For Live Demo hostnames and marketing CTA wiring, see [`CUSTOM_DOMAIN_DEPLOYMENT.md`](./CUSTOM_DOMAIN_DEPLOYMENT.md).

## Build

Local / CI smoke:

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

Vercel with the Next.js preset runs the framework build; ensure `prisma generate` runs via your `postinstall` or build script if the project expects it.

## Migrations

Run Prisma migrations against the **target** database before promoting a deployment:

```bash
npx dotenv -e .env.local -- prisma migrate deploy
```

For demo seed / reset:

```bash
npm run demo:reset
```

Reset is org-scoped to the demo tenant and must never target production orgs.

## Secret safety

- `.gitignore` blocks `.env`, `.env.*` (except `.env.example`), `.vercel`, `node_modules`, `.next`, and common credential file patterns
- Rotate keys if they ever appear in chat logs, screenshots, or commits
- Restrict service-role keys to server-only usage
- Public client may only receive `NEXT_PUBLIC_*` values
- Do not expose Google / OpenAI / Twilio / Stripe / SendGrid secrets to the browser
- Do not weaken PHI gates (`AI_ALLOW_PHI`, BAA flags, demo isolation) to make a deploy “succeed”

## Troubleshooting: `gitSource missing required property repoId`

| Cause | Fix |
|-------|-----|
| Project created without Importing a Git repo | Create a new project via **Import Git Repository**, or connect Git under **Settings → Git** |
| Vercel GitHub App not installed / not authorized | Install and authorize the Vercel GitHub App for the account/org |
| App lacks access to the private repo | Grant repository access to `eyeq-ai-platform` (or your private fork) |
| Wrong account/org selected during Import | Re-import under the team that owns the GitHub connection |
| Deploy API / CLI used with empty `gitSource` | Use the dashboard Import flow or pass a full Git source that includes `repoId` from a connected repo: do not invent a `repoId` |

**Bottom line:** push to GitHub first, then **Import that repo into Vercel** so Vercel assigns `repoId`. Never deploy a production/preview Git workflow without that connection.

## Repositories checklist

- [ ] Private GitHub remote exists and `main` is pushed
- [ ] `.env.local` is ignored and not committed
- [ ] Vercel project created by **Importing** the GitHub repo (Next.js preset)
- [ ] Vercel GitHub App can access the private repo
- [ ] Env vars set for demo vs pilot correctly (`DEMO_MODE`)
- [ ] Custom domain + `NEXT_PUBLIC_APP_URL` updated if applicable
- [ ] PHI gates unchanged for pilot (`DEMO_MODE=false`, BAAs as required)
