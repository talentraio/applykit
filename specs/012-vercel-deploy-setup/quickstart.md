# Quickstart: Vercel Deploy Setup

## Prerequisites

1. **Vercel account** (Hobby plan) — [vercel.com](https://vercel.com)
2. **Neon account** (free tier) — [neon.tech](https://neon.tech)
3. **GitHub repository** in an organization

## One-Time Setup

### 1. Create Neon Database

1. Go to [Neon Console](https://console.neon.tech)
2. Create a new project (e.g., `applykit`)
3. Note the connection string (production): `postgresql://user:pass@ep-xxx.region.neon.tech/neondb?sslmode=require`
4. Create a branch called `preview` from `main`
5. Note the preview branch connection string

### 2. Create Vercel Projects

Since Git integration is unavailable (Hobby + GitHub Org), create projects manually:

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Create project `applykit-site`:
   - Click "Add New" → "Project"
   - Select "Other" (not import from Git)
   - Set Root Directory to `apps/site`
   - Framework: Nuxt.js (auto-detected)
3. Create project `applykit-admin`:
   - Same flow, Root Directory: `apps/admin`
4. For each project, go to Settings → Functions → ensure **Fluid Compute** is enabled
5. Note the Project IDs and Org ID from Settings → General

### 3. Set Vercel Environment Variables

For **each** Vercel project (`applykit-site` and `applykit-admin`):

Go to Settings → Environment Variables and add:

**Production environment:**

| Variable                          | Value                                                  |
| --------------------------------- | ------------------------------------------------------ |
| `NUXT_DATABASE_URL`               | Neon `main` branch connection string                   |
| `NUXT_SESSION_PASSWORD`           | `openssl rand -base64 32` (min 32 chars)               |
| `NUXT_OAUTH_GOOGLE_CLIENT_ID`     | Google OAuth client ID                                 |
| `NUXT_OAUTH_GOOGLE_CLIENT_SECRET` | Google OAuth client secret                             |
| `NUXT_LLM_OPENAI_API_KEY`         | OpenAI API key                                         |
| `NUXT_LLM_GEMINI_API_KEY`         | Gemini API key                                         |
| `NUXT_PUBLIC_APP_URL`             | `https://applykit-site.vercel.app` (site) or admin URL |
| `NUXT_EMAIL_RESEND_API_KEY`       | Resend API key                                         |

**Preview environment:**

Same as production, except:

- `NUXT_DATABASE_URL` → Neon `preview` branch connection string
- `NUXT_PUBLIC_APP_URL` → leave empty (Vercel sets `VERCEL_URL`)

### 4. Create Vercel API Token

1. Go to [Vercel Tokens](https://vercel.com/account/tokens)
2. Create a new token (e.g., `github-actions-deploy`)
3. Scope: Full Account

### 5. Set GitHub Secrets

Go to GitHub repo → Settings → Secrets and variables → Actions:

| Secret                    | Value                                      |
| ------------------------- | ------------------------------------------ |
| `VERCEL_TOKEN`            | Vercel API token from step 4               |
| `VERCEL_ORG_ID`           | From Vercel Dashboard → Settings → General |
| `VERCEL_SITE_PROJECT_ID`  | From applykit-site project settings        |
| `VERCEL_ADMIN_PROJECT_ID` | From applykit-admin project settings       |
| `PROD_DATABASE_URL`       | Neon `main` branch connection string       |
| `PREVIEW_DATABASE_URL`    | Neon `preview` branch connection string    |

### 6. Configure OAuth Redirect URLs

Add Vercel production URLs to OAuth provider allowed redirect URIs:

- **Google OAuth**: `https://applykit-site.vercel.app/api/auth/google/callback`
- **Google OAuth (admin)**: `https://applykit-admin.vercel.app/api/auth/google/callback`

For preview: add `*.vercel.app` as a wildcard redirect URI (if the provider supports it).

## Workflow

### Preview (every PR)

1. Open a PR against `main`
2. GitHub Actions runs the preview workflow
3. Both apps are built and deployed to Vercel preview
4. A sticky comment with preview URLs is posted on the PR
5. Push additional commits to update the preview

### Production (merge to main)

1. Merge PR to `main`
2. GitHub Actions runs the production workflow:
   - Migrates production database
   - Builds and deploys both apps to production
3. Both apps are live at their production URLs

### Rollback

- **Code**: Vercel Dashboard → Deployments → click previous deployment → "Promote to Production"
- **Database**: Migrations are forward-only. Write a new migration to revert if needed.

## Maintenance

- **Neon compute hours**: Monitor in Neon Console. Free tier: 190 hours/month.
- **Vercel Fluid CPU**: Monitor in Vercel Dashboard. Hobby: 4 hours/month active CPU.
- **Preview DB drift**: If preview DB gets out of sync, delete the `preview` branch in Neon and recreate it from `main`.
