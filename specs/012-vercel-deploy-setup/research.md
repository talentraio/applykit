# Research: 012 — Vercel Deploy Setup

## Decision 1: Vercel CLI Workflow for Monorepo

**Decision**: Use `vercel pull` → `vercel build` → `vercel deploy --prebuilt` per app, running from each app directory.

**Rationale**:

- `vercel build` auto-detects Nuxt and produces `.vercel/output/` in Build Output API format
- `vercel deploy --prebuilt` uploads pre-built output, giving CI full control over deploy ordering
- Running from app directory (`cd apps/site`) avoids the buggy `--cwd` flag ([Discussion #10202](https://github.com/vercel/vercel/discussions/10202))
- `vercel pull` downloads env vars from Vercel project settings, so build-time env vars are managed in Vercel Dashboard (single source of truth)
- Do NOT use `pnpm build:site` separately — `vercel build` handles the Nuxt build internally and formats the output correctly

**Alternatives considered**:

- `pnpm build:site` + `vercel deploy` (no `--prebuilt`): Vercel re-builds remotely, losing control over ordering
- `pnpm build:site` + manual Build Output API formatting: complex, fragile, undocumented for Nuxt
- `--cwd` flag: [known bugs in monorepos](https://github.com/vercel/vercel/discussions/10202)

**Exact per-app flow in CI**:

```bash
# Set per-app project ID
export VERCEL_PROJECT_ID=$SITE_PROJECT_ID  # or $ADMIN_PROJECT_ID

# Pull env vars + project config from Vercel
vercel pull --yes --environment=production --token=$VERCEL_TOKEN

# Build (calls nuxt build, creates .vercel/output/)
vercel build --prod --token=$VERCEL_TOKEN

# Deploy pre-built output
vercel deploy --prebuilt --prod --token=$VERCEL_TOKEN
```

For preview: omit `--prod` from build and deploy, use `--environment=preview` for pull.

**Capturing deployment URL**: `vercel deploy --prebuilt` outputs the deployment URL to stdout.

## Decision 2: GitHub Actions Structure

**Decision**: Single job per workflow, sequential build+deploy for both apps. Pin Vercel CLI version.

**Rationale**:

- Only 2 apps — matrix strategy adds complexity for no benefit
- Sequential deploy is simpler to debug and log
- Pin Vercel CLI version to avoid regressions like [#11097](https://github.com/vercel/vercel/issues/11097)

**Key patterns**:

- pnpm caching: `pnpm/action-setup@v4` + `actions/setup-node@v4` with `cache: 'pnpm'`
- Concurrency: `concurrency: { group: production-deploy, cancel-in-progress: false }`
- PR comments: `marocchino/sticky-pull-request-comment@v2` (creates or updates a sticky comment)
- Secrets: pass via `env:` block at step level, never as shell args

**Node.js version**: 20 LTS (matches project's ES2022 target)
**pnpm version**: read from `packageManager` field in `package.json` (currently `pnpm@9.15.4`)

## Decision 3: Neon Database Setup

**Decision**: One Neon project, two branches: `main` (production) and `preview` (shared preview).

**Rationale**:

- Neon free tier: 1 project, 10 branches, 0.5 GB storage, 190 compute hours/month
- Branching is copy-on-write — cheap and fast (~1 second to create)
- `preview` branch is persistent, shared across all PRs (simplest for MVP)
- Both branches receive migrations via `drizzle-kit migrate` (idempotent — tracks applied migrations in `__drizzle_migrations`)
- No IP allowlisting needed — GitHub Actions runners connect directly to Neon

**Connection details**:

- Format: `postgresql://user:pass@ep-xxx.region.neon.tech/dbname?sslmode=require`
- Use **direct (non-pooled)** connection for migrations (pooled connections can cause DDL errors)
- Existing `postgres` (postgres-js) driver works with Neon out of the box — no code changes
- `drizzle.config.ts` reads `NUXT_DATABASE_URL` — just set this env var in CI

**Alternatives considered**:

- Separate Neon projects: exceeds free tier (1 project limit)
- Supabase: heavier than needed, free tier has fewer compute hours
- Per-PR Neon branches (via `neondatabase/create-branch-action`): more complex, not needed for MVP

## Decision 4: Vercel Fluid Compute Configuration

**Decision**: Enable Fluid Compute explicitly (`"fluid": true` in `vercel.json`). No `maxDuration` override needed on Hobby.

**Rationale**:

- Fluid Compute available on ALL plans (Hobby, Pro, Enterprise) since April 2025
- Hobby with Fluid: **300s max duration** (vs 60s without Fluid)
- Default is already 300s on Hobby — no reason to set it explicitly
- Single Vercel function bundles ALL Nuxt routes (SSR + API) — single `maxDuration` applies to all
- No special Nitro preset needed — `vercel` preset is auto-detected

**Configuration**:

- Add `"fluid": true` to root `vercel.json` (explicit opt-in for safety)
- Per-app `vercel.json` in `apps/site/` and `apps/admin/` for cron routes
- Optionally add `nitro.vercel.functions.maxDuration` in `nuxt.config.ts` if needed later

**Key Nuxt caveat**: All routes share one function, so a 120s LLM call and a 2s SSR page share the same timeout. For MVP this is fine (300s is generous).

**`waitUntil`**: Available from `@vercel/functions` for background tasks after response. Useful for logging/analytics but not required for this spec.

## Decision 5: Vercel Project Linking

**Decision**: Pass `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` as env vars in CI. Do NOT commit `.vercel/project.json`.

**Rationale**:

- `.vercel/project.json` is generated by `vercel pull` at runtime in CI
- Each app needs a different `VERCEL_PROJECT_ID`, managed via GitHub secrets
- `VERCEL_ORG_ID` is shared across both apps
- `vercel pull` creates the `.vercel/` directory automatically — no need to commit it
- `.vercel/` should be in `.gitignore`

## Decision 6: PR Comment Strategy

**Decision**: Use `marocchino/sticky-pull-request-comment@v2` for preview URL comments.

**Rationale**:

- Creates a single comment that gets updated on each push (no comment spam)
- Uses a `header` parameter for deduplication
- Simple YAML config, widely used (5k+ stars)
- Since Vercel Git integration is disabled, no Vercel bot comments are available

**Comment format**: Markdown table with site and admin preview URLs + commit SHA.
