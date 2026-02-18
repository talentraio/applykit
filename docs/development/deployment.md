# Deployment

Both apps (`apps/site` and `apps/admin`) are deployed to **Vercel** via **GitHub Actions**.
Vercel Git integration is not used — all deploys are triggered exclusively from CI workflows.

## Architecture

```
PR opened/updated ──► .github/workflows/preview.yml
                       ├── pnpm install
                       ├── DB migrate (preview)
                       ├── vercel pull → build → deploy (site, preview)
                       ├── vercel pull → build → deploy (admin, preview)
                       └── Sticky PR comment with URLs

Push to main ────────► .github/workflows/production.yml
                       ├── pnpm install
                       ├── DB migrate (production)
                       ├── vercel pull → build → deploy --prod (site)
                       └── vercel pull → build → deploy --prod (admin)
```

Key guarantees:

- Migrations run **before** deploy — if migration fails, deploy is blocked.
- Production deploys are serialized via concurrency group (never cancels in-progress).
- Preview deploys cancel previous runs for the same PR.

## Initial Setup

### 1. Neon Database

1. Create a project at [console.neon.tech](https://console.neon.tech) (e.g. `applykit`).
2. Copy the `main` branch connection string — this is the production DB.
3. Create a branch called `preview` from `main`.
4. Copy the `preview` branch connection string — this is the shared preview DB.

Connection string format: `postgresql://user:pass@ep-xxx.region.neon.tech/neondb?sslmode=require`

### 2. Vercel Projects

Since the repo is in a GitHub Org on the Hobby plan, Git integration is unavailable.
Create projects manually:

1. Go to [Vercel Dashboard](https://vercel.com/dashboard) → "Add New" → "Project" → "Other".
2. Create **applykit-site**: Root Directory = `apps/site`, Framework = Nuxt.js.
3. Create **applykit-admin**: Root Directory = `apps/admin`, Framework = Nuxt.js.
4. For each project: Settings → Functions → enable **Fluid Compute**.
5. Note the **Project ID** and **Org ID** from Settings → General.

### 3. Vercel Environment Variables

For **each** project (`applykit-site` and `applykit-admin`), go to
Settings → Environment Variables and add:

| Variable                          |     Production     |        Preview        | Notes                                             |
| --------------------------------- | :----------------: | :-------------------: | ------------------------------------------------- |
| `NUXT_DATABASE_URL`               | Neon `main` string | Neon `preview` string | Different per environment                         |
| `NUXT_SESSION_PASSWORD`           |        same        |         same          | Min 32 chars. Generate: `openssl rand -base64 32` |
| `NUXT_OAUTH_GOOGLE_CLIENT_ID`     |        same        |         same          | Google OAuth                                      |
| `NUXT_OAUTH_GOOGLE_CLIENT_SECRET` |        same        |         same          | Google OAuth                                      |
| `NUXT_LLM_OPENAI_API_KEY`         |        same        |         same          | OpenAI                                            |
| `NUXT_LLM_GEMINI_API_KEY`         |        same        |         same          | Gemini                                            |
| `NUXT_PUBLIC_APP_URL`             |   production URL   |    _(leave empty)_    | Vercel sets `VERCEL_URL` for preview              |
| `NUXT_PUBLIC_SITE_URL`            |   site prod URL    |   site preview URL    | Used in invite email copy and CTA context         |
| `NUXT_EMAIL_RESEND_API_KEY`       |        same        |         same          | Resend email provider                             |

`NUXT_STORAGE_BLOB_READ_WRITE_TOKEN` is auto-detected on Vercel — no manual setup needed.

For `applykit-admin`, set `NUXT_PUBLIC_SITE_URL` to the **site app URL** (not admin URL), so
admin-triggered invite emails mention the correct destination website.

### 4. Vercel API Token

1. Go to [vercel.com/account/tokens](https://vercel.com/account/tokens).
2. Create a token (e.g. `github-actions-deploy`), scope: Full Account.

### 5. GitHub Secrets

Go to the repo → Settings → Secrets and variables → Actions → New repository secret:

| Secret                    | Value                                   |
| ------------------------- | --------------------------------------- |
| `VERCEL_TOKEN`            | Vercel API token from step 4            |
| `VERCEL_ORG_ID`           | From Vercel project Settings → General  |
| `VERCEL_SITE_PROJECT_ID`  | From `applykit-site` project settings   |
| `VERCEL_ADMIN_PROJECT_ID` | From `applykit-admin` project settings  |
| `PROD_DATABASE_URL`       | Neon `main` branch connection string    |
| `PREVIEW_DATABASE_URL`    | Neon `preview` branch connection string |

### 6. OAuth Redirect URLs

Add Vercel URLs to the OAuth provider's allowed redirect URIs:

- `https://applykit-site.vercel.app/api/auth/google/callback`
- `https://applykit-admin.vercel.app/api/auth/google/callback`

For preview deployments, add `*.vercel.app` as a wildcard if the provider supports it.

## Day-to-Day Usage

### Preview

1. Open a PR against `main`.
2. GitHub Actions builds and deploys both apps to Vercel preview.
3. A sticky comment with preview URLs appears on the PR.
4. Push more commits — the comment updates automatically.

### Production

1. Merge a PR to `main`.
2. GitHub Actions runs migrations, then deploys both apps to production.
3. If migration fails, deploy is blocked — fix and push again.

### Rollback

- **Code**: Vercel Dashboard → Deployments → select a previous deployment → "Promote to Production".
- **Database**: Migrations are forward-only. Write a new migration to revert changes.

## Maintenance

| What               | Where                                            | Limit                   |
| ------------------ | ------------------------------------------------ | ----------------------- |
| Neon compute hours | [Neon Console](https://console.neon.tech)        | 190 h/month (free tier) |
| Vercel Fluid CPU   | [Vercel Dashboard](https://vercel.com/dashboard) | 4 h/month (Hobby)       |
| Vercel deploys     | Vercel Dashboard                                 | 100/day (Hobby)         |

**Preview DB drift**: if the preview database accumulates stale migrations from many PRs,
reset it by deleting the `preview` branch in Neon and recreating it from `main`.

## Repo Files

| File                               | Purpose                                          |
| ---------------------------------- | ------------------------------------------------ |
| `.github/workflows/production.yml` | Production deploy (push to `main`)               |
| `.github/workflows/preview.yml`    | Preview deploy (PR against `main`)               |
| `apps/site/vercel.json`            | Site: Fluid Compute + cron config                |
| `apps/admin/vercel.json`           | Admin: Fluid Compute config                      |
| `.vercelignore`                    | Excludes non-essential files from Vercel uploads |
