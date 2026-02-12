# 012 — Vercel Deploy Setup (MVP CI/CD)

## Overview

Set up MVP deployment for both monorepo apps (`apps/site` and `apps/admin`) on Vercel, fully orchestrated through GitHub Actions. Two environments: **Preview** (per-PR) and **Production** (main branch). Database migrations run in CI **before** production deploy to guarantee schema-code consistency.

## Clarifications

### Session 2026-02-12

- Q: Vercel plan — Hobby or Pro? → A: Hobby. Repo is in a GitHub Org so Git integration is unavailable (Hobby limitation). Projects created manually; deploy exclusively via Vercel CLI (token + project/org IDs). Target Vercel Fluid Compute: prefer streaming/background patterns for long-running work; configure `maxDuration` on serverless functions instead of assuming a hard 10s cap.
- Q: Database provider? → A: Neon (serverless PostgreSQL). Free tier (0.5 GB, 190 compute hours). Standard `postgres://` connection string with `?sslmode=require`. Drizzle-compatible via existing `postgres` driver. DB branching available for preview environments.
- Q: Should preview workflow run DB migrations against preview DB? → A: Yes. Preview workflow runs `db:migrate` before deploy to ensure every preview is functional, including PRs with schema changes.
- Q: Concurrency control for production deploys? → A: Single. Use GitHub Actions `concurrency` group — second deploy queues until first completes. Prevents migration race conditions.
- Q: Custom domains for MVP? → A: No. Use Vercel default `*.vercel.app` URLs. Configure OAuth providers with Vercel URLs. Custom domains can be added later without CI/CD changes.

## Goals

- Deploy both `apps/site` and `apps/admin` to Vercel as separate projects
- Preview deployments for every PR (both apps), with a dedicated preview database
- Production deployments on merge to `main`, with a dedicated production database
- Database migrations executed in CI before production deploy (never after)
- All deploys triggered **only** from GitHub Actions (Vercel git integration disabled)
- Zero-downtime production deploys (Vercel atomic deployments)
- Fast rollback via Vercel instant rollback (code-level); DB migrations are forward-only and backward-compatible
- Clear documentation of secrets, env vars, and maintenance procedures

## Non-goals

- Staging environment (Hobby plan — only Preview + Production)
- Custom domains setup (can be added later)
- Monitoring / alerting / APM integration (separate feature)
- E2E tests in CI (can be added later as a gate before deploy)
- Automated DB rollback scripts (forward-only migrations for MVP)
- Edge runtime (stick with Node.js serverless for MVP)
- Vercel cron migration (keep existing `vercel.json` crons as-is for now)

## Scope

### In scope

- GitHub Actions workflows for Preview (PR) and Production (main) deployments
- Per-app Vercel project configuration (site + admin)
- Vercel project settings to disable git-triggered deploys
- DB migration step in production CI pipeline
- Environment variable documentation and setup guide
- `.vercelignore` for both projects
- Minimal `vercel.json` updates (per-project, if needed)

### Out of scope

- Changes to application code, business logic, or DB schema
- Vercel Edge/ISR config (default SSR is fine for MVP)
- Branch protection rules (recommended but not enforced by this spec)
- Cost optimization or scaling

## Roles & limits

This feature is **infrastructure-only** — no user-facing changes. Relevant roles:

- **Repo admin / DevOps**: Configures Vercel projects, GitHub secrets, branch protection
- **Developer**: Opens PRs and gets Preview URLs; merges to main for production deploy
- No changes to super_admin / friend / public roles or BYOK policy

## User flows

### Flow 1: PR Preview Deploy

```
Developer opens PR
  → GitHub Actions: "preview" workflow triggers
  → Install deps (pnpm install)
  → Build site + admin
  → Deploy site to Vercel (preview)
  → Deploy admin to Vercel (preview)
  → Post PR comment with preview URLs for both apps
```

- Preview deployments use the **preview database** connection string
- Each PR gets unique preview URLs (Vercel handles URL generation)
- Subsequent pushes to the same PR re-trigger the workflow and update the preview

### Flow 2: Production Deploy (merge to main)

```
PR merged to main
  → GitHub Actions: "production" workflow triggers
  → Install deps (pnpm install)
  → Run DB migrations against production database
  → Build site + admin
  → Deploy site to Vercel (production, --prod)
  → Deploy admin to Vercel (production, --prod)
```

- Migrations run **before** build+deploy to guarantee schema consistency
- If migration fails, the workflow stops — no deploy happens
- Vercel atomic swap means zero-downtime on the production URLs

### Flow 3: Rollback (emergency)

```
Issue detected in production
  → Option A: Vercel Dashboard → Instant Rollback to previous deployment
  → Option B: git revert + push to main → triggers new production deploy
```

- Code rollback is instant via Vercel
- DB migrations are **not** automatically rolled back — they must be forward-compatible so old code still works with new schema

## UI/pages

No UI changes. This is infrastructure-only.

## Data model

No schema changes. Existing Drizzle schema in `packages/nuxt-layer-api/server/data/schema.ts` (package: `@int/api`) is unchanged.

Migration tooling reference:

- Schema: `packages/nuxt-layer-api/server/data/schema.ts`
- Migrations dir: `packages/nuxt-layer-api/server/data/migrations/`
- Config: `packages/nuxt-layer-api/drizzle.config.ts`
- Run command: `pnpm --filter @int/api db:migrate`

## API surface

No new endpoints. Existing API in `packages/nuxt-layer-api/` (package: `@int/api`) is unchanged.

The existing cron endpoint `/api/tasks/cleanup` (defined in `vercel.json`) remains as-is.

## LLM workflows

No changes. LLM features are unaffected by this deployment setup.

## Limits & safety

- **Migration safety**: All migrations must be forward-only and backward-compatible. This means:
  - Adding columns: use `DEFAULT` or allow `NULL`
  - Renaming columns: add new column → migrate data → remove old column (across multiple PRs)
  - Dropping columns: only after verifying no code references them
- **Deploy ordering**: Migrations always run before deploy. If migration fails, deploy is blocked.
- **Preview isolation**: Preview environment uses a separate database to prevent contamination of production data.
- **Secret management**: All secrets stored in GitHub Actions secrets (encrypted). Never committed to repo.

## Security & privacy

- **Secrets in CI**: All sensitive values (DB URLs, API keys, Vercel tokens) stored as GitHub Actions encrypted secrets
- **Vercel environment variables**: Set per-project, per-environment (Preview vs Production) in Vercel dashboard
- **No secrets in code**: `.env` files are gitignored; `.env.example` documents required vars without values
- **Vercel token**: Scoped to the specific Vercel team/account; stored as `VERCEL_TOKEN` in GitHub secrets
- **Database access**: CI runner connects to DB only during migration step; connection string is a secret
- **Preview DB**: Separate from production to prevent data leaks during testing

## i18n keys

No new i18n keys. This is infrastructure-only.

## Monorepo/layers touchpoints

### Vercel project mapping

Each app becomes a separate Vercel project:

| App   | Repo path     | Vercel project name (suggested) |
| ----- | ------------- | ------------------------------- |
| Site  | `apps/site/`  | `applykit-site`                 |
| Admin | `apps/admin/` | `applykit-admin`                |

### Layers consumed at build time

Both apps extend shared layers. These are resolved at build time by Nuxt and do not need separate Vercel projects:

- `packages/nuxt-layer-api/` (package: `@int/api`) — REST endpoints, DB, LLM
- `packages/nuxt-layer-ui/` (package: `@int/ui`) — shared UI components, theme
- `packages/nuxt-layer-utils/` (package: `@int/utils`) — shared utilities
- `packages/schema/` (package: `@int/schema`) — Zod schemas, types

### Build commands

- Site: `pnpm build:site` (runs `pnpm --filter site build`)
- Admin: `pnpm build:admin` (runs `pnpm --filter admin build`)
- DB migrate: `pnpm --filter @int/api db:migrate`

### Output directories

- Site: `apps/site/.output/`
- Admin: `apps/admin/.output/`

## CI/CD architecture

### GitHub Actions workflows

#### 1. `.github/workflows/preview.yml` — PR Preview

**Trigger**: `pull_request` (opened, synchronize, reopened) targeting `main`

**Steps**:

1. Checkout code
2. Setup Node.js + pnpm (with dependency caching)
3. `pnpm install --frozen-lockfile`
4. **Run DB migrations** against preview DB: `pnpm --filter @int/api db:migrate` (using `PREVIEW_DATABASE_URL`)
5. Build site: `pnpm build:site`
6. Build admin: `pnpm build:admin`
7. Deploy site to Vercel (preview): `vercel deploy --prebuilt`
8. Deploy admin to Vercel (preview): `vercel deploy --prebuilt`
9. Comment on PR with preview URLs

**Environment variables for preview builds**: Set in Vercel project settings under "Preview" environment. The preview DB connection string (`NUXT_DATABASE_URL`) points to the preview database.

#### 2. `.github/workflows/production.yml` — Production Deploy

**Trigger**: `push` to `main` branch
**Concurrency**: `concurrency: { group: production-deploy, cancel-in-progress: false }` — queues subsequent runs; never cancels an in-progress deploy (protects migrations).

**Steps**:

1. Checkout code
2. Setup Node.js + pnpm (with dependency caching)
3. `pnpm install --frozen-lockfile`
4. **Run DB migrations**: `pnpm --filter @int/api db:migrate` (using production `NUXT_DATABASE_URL`)
5. Build site: `pnpm build:site`
6. Build admin: `pnpm build:admin`
7. Deploy site to Vercel (production): `vercel deploy --prebuilt --prod`
8. Deploy admin to Vercel (production): `vercel deploy --prebuilt --prod`

**Critical**: Step 4 (migrations) must succeed before steps 5-8. If it fails, the entire workflow fails and no deploy happens.

### Vercel CLI usage

Both workflows use `vercel` CLI with `--prebuilt` flag, meaning:

1. We build locally in CI (not on Vercel's build infrastructure)
2. We use `vercel build` to create the `.vercel/output` directory
3. We use `vercel deploy --prebuilt` to upload the pre-built output

This gives us full control over build order and environment.

### Vercel project linking

Each app directory needs a `.vercel/project.json` (or use `--token` + `--scope` + project ID flags). The recommended approach:

- Run `vercel link` once per app directory to generate `.vercel/project.json`
- Commit the project link files (they contain only project/org IDs, no secrets)
- Alternatively, pass `VERCEL_PROJECT_ID` and `VERCEL_ORG_ID` as env vars in CI

### No Vercel Git integration (Hobby + GitHub Org constraint)

Vercel Hobby plan does not support Git integration for repositories in a GitHub Organization. This is a hard constraint, not a preference:

- Vercel projects are created **manually** via Dashboard (not imported from GitHub)
- All deploys go through `vercel deploy` CLI calls from GitHub Actions using `VERCEL_TOKEN` + `VERCEL_ORG_ID` + `VERCEL_PROJECT_ID`
- No Vercel bot comments on PRs (we handle PR comments via GitHub Actions)

### Vercel Fluid Compute

Both apps target Vercel Fluid Compute for serverless functions:

- Configure `maxDuration` in Nuxt/Nitro config (e.g., 60s for LLM-heavy routes)
- Prefer streaming responses for long-running LLM operations
- Default function timeout on Hobby is 10s; Fluid Compute allows extending via `maxDuration`
- This does NOT require code changes in this spec — just awareness for Nitro config if needed

## Environment variables & secrets

### GitHub Actions secrets (required)

| Secret                    | Description                                                   |
| ------------------------- | ------------------------------------------------------------- |
| `VERCEL_TOKEN`            | Vercel API token for CLI authentication                       |
| `VERCEL_ORG_ID`           | Vercel team/org ID                                            |
| `VERCEL_SITE_PROJECT_ID`  | Vercel project ID for site app                                |
| `VERCEL_ADMIN_PROJECT_ID` | Vercel project ID for admin app                               |
| `PROD_DATABASE_URL`       | Production Neon connection string (for production migrations) |
| `PREVIEW_DATABASE_URL`    | Preview Neon connection string (for preview migrations)       |

### Vercel environment variables (per-project, per-environment)

Set these in Vercel Dashboard → Project → Settings → Environment Variables:

**Production environment:**

| Variable                             | Required | Notes                                                           |
| ------------------------------------ | -------- | --------------------------------------------------------------- |
| `NUXT_DATABASE_URL`                  | Yes      | Production PostgreSQL connection string                         |
| `NUXT_SESSION_PASSWORD`              | Yes      | Min 32 chars, same for site+admin                               |
| `NUXT_OAUTH_GOOGLE_CLIENT_ID`        | Yes      | Google OAuth credentials                                        |
| `NUXT_OAUTH_GOOGLE_CLIENT_SECRET`    | Yes      | Google OAuth credentials                                        |
| `NUXT_LLM_OPENAI_API_KEY`            | Yes      | OpenAI API key                                                  |
| `NUXT_LLM_GEMINI_API_KEY`            | Yes      | Google Gemini API key                                           |
| `NUXT_STORAGE_BLOB_READ_WRITE_TOKEN` | Auto     | Auto-detected on Vercel                                         |
| `NUXT_PUBLIC_APP_URL`                | Yes      | Vercel production URL (e.g. `https://applykit-site.vercel.app`) |
| `NUXT_EMAIL_RESEND_API_KEY`          | Yes      | Resend email provider key                                       |
| `NUXT_OAUTH_LINKEDIN_CLIENT_ID`      | Optional | LinkedIn OAuth                                                  |
| `NUXT_OAUTH_LINKEDIN_CLIENT_SECRET`  | Optional | LinkedIn OAuth                                                  |

**Preview environment:**

Same variables as production, but:

- `NUXT_DATABASE_URL` → preview database connection string
- `NUXT_PUBLIC_APP_URL` → can be left empty (Vercel sets `VERCEL_URL`)
- OAuth callback URLs may need to include Vercel preview domains

### Database setup (Neon)

Two PostgreSQL databases on **Neon** (free tier):

1. **Production DB**: A Neon project with a `main` branch. Used by production deploys and the migration step in CI.
2. **Preview DB**: A separate Neon project (or a Neon branch off the production project). Used by all preview deployments; shared across PRs.

Connection string format: `postgresql://<user>:<pass>@<host>.neon.tech/<dbname>?sslmode=require`

No special SDK or driver changes needed — the existing `postgres` (postgres-js) driver in `@int/api` works with Neon out of the box.

## Acceptance criteria

1. **PR creates preview deploys**: Opening a PR against `main` triggers GitHub Actions that deploy both site and admin to Vercel preview. Preview URLs are posted as a PR comment.
2. **Main deploys to production**: Merging to `main` triggers GitHub Actions that first run DB migrations, then deploy both apps to Vercel production.
3. **Migration-before-deploy guarantee**: If DB migration fails, production deploy does not happen.
4. **No Vercel git-triggered deploys**: All deploys are orchestrated exclusively through GitHub Actions.
5. **Separate databases**: Preview and Production use different database connection strings.
6. **Secrets not in code**: All secrets are stored in GitHub Actions secrets or Vercel environment variables. No secrets committed to the repository.
7. **Rollback works**: A previous production deployment can be instantly restored via Vercel Dashboard.
8. **Documentation complete**: A setup guide documents all required secrets, environment variables, and one-time configuration steps.

## Edge cases

- **Migration fails on production deploy**: Workflow stops. Developer must fix the migration and push again. No partial deploy.
- **Preview DB drift**: Preview DB may accumulate migrations from multiple PRs. Periodically reset or use a migration-on-deploy strategy for preview too.
- **Concurrent production deploys**: Handled by `concurrency` group — second run queues until first completes. Never cancels in-progress to protect migrations.
- **Large monorepo build times**: Both apps are built in a single CI run. If build times become excessive, consider parallelizing with a matrix strategy.
- **Vercel function size limits**: Nuxt SSR output must stay under Vercel's serverless function size limit (50 MB compressed). Monitor during initial deploys.
- **Preview migration failure**: If a preview migration fails (e.g., conflicting migrations from concurrent PRs), the preview deploy is blocked. Developer must fix the migration or reset the preview DB.
- **Session conflicts**: Site and admin share `nuxt-session` cookie name in production. If deployed to different domains, this is fine. If same domain (subpaths), cookie name collision may occur. Current config uses same name for both in prod.

## Testing plan

1. **Workflow syntax validation**: Use `actionlint` or GitHub's workflow editor to validate YAML syntax
2. **Dry-run preview deploy**: Open a test PR, verify both preview deployments are created and URLs are posted
3. **Dry-run production deploy**: Merge test PR to main, verify migrations run and both apps deploy to production
4. **Migration failure test**: Intentionally create a failing migration, verify production deploy is blocked
5. **Rollback test**: After a production deploy, use Vercel Dashboard to roll back to previous deployment and verify the app works
6. **Env var verification**: Verify all required environment variables are set in both Vercel projects for both environments

## Open questions / NEEDS CLARIFICATION

1. **Branch protection**: Should we enforce branch protection rules on `main` (require PR, require CI pass) as part of this feature? (Low impact — can be deferred to post-MVP.)
2. **Vercel project names**: Confirm the suggested project names (`applykit-site`, `applykit-admin`) or provide preferred names. (Low impact — can proceed with suggested defaults.)
