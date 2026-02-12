# Implementation Plan: 012 — Vercel Deploy Setup

**Branch**: `feature/012-vercel-deploy-setup` | **Date**: 2026-02-12 | **Spec**: `specs/012-vercel-deploy-setup/spec.md`
**Input**: Feature specification from `/specs/012-vercel-deploy-setup/spec.md`

## Summary

Set up MVP CI/CD for both monorepo apps (`apps/site`, `apps/admin`) on Vercel Hobby plan, orchestrated exclusively through GitHub Actions. Two environments (Preview + Production) with separate Neon PostgreSQL databases. Migrations run in CI before deploy. Uses `vercel pull` → `vercel build` → `vercel deploy --prebuilt` per app, Fluid Compute for extended function duration, and `marocchino/sticky-pull-request-comment` for preview URLs on PRs.

## Technical Context

**Language/Version**: TypeScript 5.7 (Nuxt 4 / Node.js 20 LTS)
**Primary Dependencies**: Vercel CLI (pinned version), GitHub Actions, Neon (serverless PostgreSQL), Drizzle ORM
**Storage**: PostgreSQL via Neon (free tier: 1 project, 10 branches, 0.5 GB, 190 compute hours)
**Testing**: Manual workflow validation + `actionlint` for YAML syntax
**Target Platform**: Vercel Hobby plan (Node.js serverless, Fluid Compute enabled)
**Project Type**: Monorepo (pnpm workspaces) — 2 Nuxt apps, 4 shared layer packages
**Performance Goals**: Deploy completes in <10 minutes (build + upload), preview available within 5 min of PR push
**Constraints**: Vercel Hobby limits (1 concurrent build, 100 deploys/day, 4h Fluid CPU/month), Neon free tier (190 compute hours/month), no Git integration (GitHub Org constraint)
**Scale/Scope**: 2 apps, ~15 migration files, ~6 GitHub secrets, 2 workflow files

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                    | Status   | Notes                                                            |
| ---------------------------- | -------- | ---------------------------------------------------------------- |
| I. Documentation Is Binding  | PASS     | No code changes — only CI/CD config and docs                     |
| II. Nuxt Stack Invariants    | PASS     | No framework changes; Vercel auto-detects Nuxt preset            |
| III. Schema-First Contracts  | N/A      | No new schemas or types                                          |
| IV. Store/Action Data Flow   | N/A      | No UI/store changes                                              |
| V. i18n and SSR Requirements | N/A      | No UI changes                                                    |
| Formatting (Prettier/ESLint) | PASS     | YAML files not covered by Prettier; no conflict                  |
| Tests for risky logic        | DEFERRED | Manual validation for MVP; automated CI tests can be added later |

**Post-design re-check**: All gates still pass. No constitution violations.

## Project Structure

### Documentation (this feature)

```text
specs/012-vercel-deploy-setup/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0: research findings
├── quickstart.md        # Phase 1: setup guide
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
.github/
└── workflows/
    ├── preview.yml          # PR preview deploy workflow
    └── production.yml       # Production deploy workflow (push to main)

apps/
├── site/
│   └── vercel.json          # Per-app Vercel config (crons, fluid)
└── admin/
    └── vercel.json          # Per-app Vercel config (fluid)

vercel.json                  # Root — keep existing crons (backward compat)
.vercelignore                # Root-level ignore for Vercel uploads
.gitignore                   # Add .vercel/ to gitignore
```

**Structure Decision**: Infrastructure-only feature. New files are GitHub Actions workflows (`.github/workflows/`), per-app `vercel.json` configs, and `.vercelignore`. No application code changes.

## Implementation Phases

### Phase 1: Repository Configuration

**Goal**: Prepare the repo for Vercel CLI deploys.

1. **Add `.vercel/` to `.gitignore`** — `vercel pull` creates this directory at runtime in CI; must not be committed.

2. **Create per-app `vercel.json`** — Each app needs its own config for Fluid Compute. The root `vercel.json` stays for backward compatibility.

   `apps/site/vercel.json`:

   ```json
   {
     "$schema": "https://openapi.vercel.sh/vercel.json",
     "fluid": true,
     "crons": [
       {
         "path": "/api/tasks/cleanup",
         "schedule": "0 2 * * *"
       }
     ]
   }
   ```

   `apps/admin/vercel.json`:

   ```json
   {
     "$schema": "https://openapi.vercel.sh/vercel.json",
     "fluid": true
   }
   ```

3. **Create `.vercelignore`** at repo root:

   ```
   .git
   .github
   specs
   docs
   tests
   scripts
   .specify
   .claude
   *.md
   docker-compose*.yml
   ```

4. **Install Vercel CLI as dev dependency** (pinned version for reproducibility):
   ```bash
   pnpm add -D vercel -w
   ```

### Phase 2: Production Workflow

**Goal**: Create `.github/workflows/production.yml` that deploys both apps on push to `main`.

**Workflow structure**:

```yaml
name: Production Deploy
on:
  push:
    branches: [main]

concurrency:
  group: production-deploy
  cancel-in-progress: false

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      # 1. Checkout
      - uses: actions/checkout@v4

      # 2. Setup pnpm + Node.js (with caching)
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm

      # 3. Install dependencies
      - run: pnpm install --frozen-lockfile

      # 4. Run DB migrations (production)
      - name: Run database migrations
        run: pnpm --filter @int/api db:migrate
        env:
          NUXT_DATABASE_URL: ${{ secrets.PROD_DATABASE_URL }}

      # 5. Build + Deploy site
      - name: Pull Vercel config (site)
        run: cd apps/site && pnpm vercel pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_SITE_PROJECT_ID }}

      - name: Build site
        run: cd apps/site && pnpm vercel build --prod --token=${{ secrets.VERCEL_TOKEN }}
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_SITE_PROJECT_ID }}

      - name: Deploy site (production)
        id: deploy-site
        run: |
          URL=$(cd apps/site && pnpm vercel deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }})
          echo "url=$URL" >> $GITHUB_OUTPUT
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_SITE_PROJECT_ID }}

      # 6. Build + Deploy admin
      - name: Pull Vercel config (admin)
        run: cd apps/admin && pnpm vercel pull --yes --environment=production --token=${{ secrets.VERCEL_TOKEN }}
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_ADMIN_PROJECT_ID }}

      - name: Build admin
        run: cd apps/admin && pnpm vercel build --prod --token=${{ secrets.VERCEL_TOKEN }}
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_ADMIN_PROJECT_ID }}

      - name: Deploy admin (production)
        id: deploy-admin
        run: |
          URL=$(cd apps/admin && pnpm vercel deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }})
          echo "url=$URL" >> $GITHUB_OUTPUT
        env:
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_ADMIN_PROJECT_ID }}
```

**Key decisions**:

- `vercel` called via `pnpm vercel` (uses workspace-installed version, pinned)
- `cd apps/<app>` avoids buggy `--cwd` flag
- Migration runs first with `NUXT_DATABASE_URL` from GitHub secret
- `vercel pull` downloads env vars from Vercel project settings for build
- Concurrency group ensures sequential deploys (never cancels in-progress)

### Phase 3: Preview Workflow

**Goal**: Create `.github/workflows/preview.yml` that deploys preview on PR.

**Workflow structure**: Similar to production but:

- Trigger: `pull_request` (opened, synchronize, reopened) targeting `main`
- Migrations run against preview DB (`PREVIEW_DATABASE_URL`)
- `vercel pull --environment=preview`, `vercel build` (no `--prod`), `vercel deploy --prebuilt` (no `--prod`)
- Sticky PR comment with preview URLs using `marocchino/sticky-pull-request-comment@v2`

**PR comment step**:

```yaml
- name: Comment preview URLs on PR
  uses: marocchino/sticky-pull-request-comment@v2
  with:
    header: vercel-preview
    message: |
      ### Preview Deployments

      | App | URL |
      |-----|-----|
      | Site | ${{ steps.deploy-site.outputs.url }} |
      | Admin | ${{ steps.deploy-admin.outputs.url }} |

      **Commit**: ${{ github.sha }}
```

### Phase 4: Documentation & Cleanup

**Goal**: Setup guide and repo hygiene.

1. **Update root `.gitignore`** — add `.vercel/` entry
2. **Verify `.env.example` files** — ensure all Vercel env vars are documented
3. **Update `docs/development/` if needed** — add deployment docs reference
4. **Move root `vercel.json` crons to per-app config** — the cron runs on `/api/tasks/cleanup` which is a site route, so it belongs in `apps/site/vercel.json`

## Risk Assessment

| Risk                                      | Likelihood | Impact | Mitigation                                            |
| ----------------------------------------- | ---------- | ------ | ----------------------------------------------------- |
| `vercel build` fails in monorepo context  | Medium     | High   | Pin Vercel CLI version; test locally first            |
| Neon free tier limits exceeded            | Low        | Medium | Monitor compute hours; preview DB shared, not per-PR  |
| Hobby concurrent build limit (1)          | Low        | Low    | Concurrency group already serializes deploys          |
| Preview DB migration conflicts across PRs | Low        | Medium | Reset preview branch if drift accumulates             |
| OAuth callback URLs for preview           | Medium     | Medium | Use wildcard redirect URIs where provider supports it |

## Complexity Tracking

No constitution violations. All new files are infrastructure config (YAML, JSON). No application code changes, no new schemas, no UI changes.
