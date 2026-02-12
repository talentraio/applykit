# Data Model: 012 — Vercel Deploy Setup

This feature has no application data model changes. The "data model" below documents the infrastructure configuration entities.

## GitHub Actions Secrets

| Secret                    | Scope                                   | Used By                              |
| ------------------------- | --------------------------------------- | ------------------------------------ |
| `VERCEL_TOKEN`            | Vercel API token                        | All workflows (pull, build, deploy)  |
| `VERCEL_ORG_ID`           | Vercel team/org identifier              | All workflows                        |
| `VERCEL_SITE_PROJECT_ID`  | Vercel project ID for `apps/site`       | Both workflows (site deploy steps)   |
| `VERCEL_ADMIN_PROJECT_ID` | Vercel project ID for `apps/admin`      | Both workflows (admin deploy steps)  |
| `PROD_DATABASE_URL`       | Neon `main` branch connection string    | Production workflow (migration step) |
| `PREVIEW_DATABASE_URL`    | Neon `preview` branch connection string | Preview workflow (migration step)    |

## Vercel Environment Variables (per-project)

Managed in Vercel Dashboard → Project → Settings → Environment Variables.

### Production Environment

| Variable                             | Both Projects | Notes                                  |
| ------------------------------------ | :-----------: | -------------------------------------- |
| `NUXT_DATABASE_URL`                  |      Yes      | Neon `main` branch connection string   |
| `NUXT_SESSION_PASSWORD`              |      Yes      | Min 32 chars, shared across site+admin |
| `NUXT_OAUTH_GOOGLE_CLIENT_ID`        |      Yes      | Google OAuth                           |
| `NUXT_OAUTH_GOOGLE_CLIENT_SECRET`    |      Yes      | Google OAuth                           |
| `NUXT_LLM_OPENAI_API_KEY`            |      Yes      | OpenAI (may not be needed for admin)   |
| `NUXT_LLM_GEMINI_API_KEY`            |      Yes      | Gemini (may not be needed for admin)   |
| `NUXT_STORAGE_BLOB_READ_WRITE_TOKEN` |      Yes      | Auto-detected on Vercel                |
| `NUXT_PUBLIC_APP_URL`                |    Per-app    | Site URL / Admin URL                   |
| `NUXT_EMAIL_RESEND_API_KEY`          |      Yes      | Resend email provider                  |

### Preview Environment

Same variables, but:

- `NUXT_DATABASE_URL` → Neon `preview` branch connection string
- `NUXT_PUBLIC_APP_URL` → empty (Vercel sets `VERCEL_URL`)

## Neon Database Topology

```
Neon Project: applykit
├── main (branch) ─── Production database
│   └── Connection: postgresql://user:pass@ep-xxx.region.neon.tech/neondb?sslmode=require
└── preview (branch) ─── Preview database (shared across PRs)
    └── Connection: postgresql://user:pass@ep-yyy.region.neon.tech/neondb?sslmode=require
```

## Vercel Project Topology

```
Vercel Org: <org-id>
├── applykit-site (project)
│   ├── Root Directory: apps/site
│   ├── Framework: Nuxt.js (auto-detected)
│   ├── Fluid Compute: enabled
│   └── Git Integration: none (Hobby + Org constraint)
└── applykit-admin (project)
    ├── Root Directory: apps/admin
    ├── Framework: Nuxt.js (auto-detected)
    ├── Fluid Compute: enabled
    └── Git Integration: none (Hobby + Org constraint)
```

## File Artifacts

| File             | Location             | Purpose                                 |
| ---------------- | -------------------- | --------------------------------------- |
| `production.yml` | `.github/workflows/` | Production deploy workflow              |
| `preview.yml`    | `.github/workflows/` | PR preview deploy workflow              |
| `vercel.json`    | `apps/site/`         | Fluid Compute + crons for site          |
| `vercel.json`    | `apps/admin/`        | Fluid Compute for admin                 |
| `.vercelignore`  | repo root            | Exclude non-essential files from deploy |
