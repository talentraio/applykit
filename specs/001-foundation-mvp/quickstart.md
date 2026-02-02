# Quickstart: Foundation MVP

> **Feature**: 001-foundation-mvp
> **Date**: 2026-01-22

This guide provides step-by-step setup instructions for developing the Foundation MVP.

---

## Prerequisites

- **Node.js**: 20.x LTS
- **pnpm**: 9.x (`npm install -g pnpm`)
- **Docker**: For local PostgreSQL (recommended)
- **Git**: Version control

### Accounts Needed

- **Google Cloud Console**: OAuth credentials
- **Supabase** or **Neon**: PostgreSQL database (production)
- **Vercel**: Deployment (optional for local dev)
- **OpenAI**: API key for LLM parsing/generation
- **Google AI Studio**: Gemini API key (optional fallback)

---

## 1. Clone and Install

```bash
# Clone repository
git clone <repo-url>
cd resume-editor

# Install dependencies
pnpm install
```

---

## 2. Environment Setup

Create `.env` files for each app:

### Root `.env` (shared secrets)

> Nuxt reads environment variables via `runtimeConfig` using the `NUXT_` / `NUXT_PUBLIC_` prefixes.
> Avoid bare names like `DATABASE_URL` in this repo.

```bash
# Database (defaults to local Postgres if unset)
NUXT_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/resume_editor"

# Google OAuth
NUXT_OAUTH_GOOGLE_CLIENT_ID="your-google-client-id"
NUXT_OAUTH_GOOGLE_CLIENT_SECRET="your-google-client-secret"

# Session secret (generate: openssl rand -hex 32)
NUXT_SESSION_PASSWORD="your-session-secret"

# LLM Providers (platform keys)
NUXT_LLM_OPENAI_API_KEY="sk-..."
NUXT_LLM_GEMINI_API_KEY="..." # Optional, for Gemini Flash

# Storage (Vercel Blob)
NUXT_STORAGE_BLOB_READ_WRITE_TOKEN="vercel_blob_..."

# Base URL (for OAuth callbacks)
NUXT_PUBLIC_BASE_URL="http://localhost:3000"
```

### apps/site/.env

```bash
# Extends root .env
# Add site-specific overrides if needed
```

### apps/admin/.env

```bash
# Extends root .env
NUXT_PUBLIC_BASE_URL="http://localhost:3001"
```

---

## 3. Database Setup

### Option A: Local PostgreSQL with Docker (recommended)

```bash
# Start PostgreSQL
pnpm db:up

# Run migrations
pnpm db:migrate
```

### Option B: Local PostgreSQL (system install)

```bash
# Ensure PostgreSQL is running, then:
export NUXT_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/resume_editor"

# Run migrations
pnpm db:migrate
```

### Option C: Remote PostgreSQL (Supabase/Neon)

1. Create project on Supabase or Neon
2. Copy connection string to `NUXT_DATABASE_URL`
3. Run migrations: `pnpm db:migrate`

---

## 4. Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project or select existing
3. Enable **Google+ API** (or People API)
4. Go to **Credentials** → **Create Credentials** → **OAuth Client ID**
5. Application type: **Web application**
6. Add authorized redirect URIs:
   - `http://localhost:3000/auth/google/callback` (site)
   - `http://localhost:3001/auth/google/callback` (admin)
7. Copy **Client ID** and **Client Secret** to `.env`

---

## 5. Running Development Servers

### Start All Apps

```bash
# Start site (port 3000) and admin (port 3001)
pnpm dev
```

### Start Individual Apps

```bash
# Site only
pnpm --filter @apps/site dev

# Admin only
pnpm --filter @apps/admin dev
```

### Start Specific Layer Playground

```bash
# UI layer playground (isolated component testing)
pnpm --filter @int/ui dev:playground

# API layer playground (endpoint testing)
pnpm --filter @int/api dev:playground
```

---

## 6. Project Structure

```
resume-editor/
├── apps/
│   ├── site/              # User-facing app (port 3000)
│   └── admin/             # Admin app (port 3001)
├── packages/
│   ├── nuxt-layer-schema/ # @int/schema - Zod schemas
│   ├── nuxt-layer-api/    # @int/api - API layer
│   └── nuxt-layer-ui/     # @int/ui - UI components
├── specs/                 # Feature specifications
├── tests/                 # Test suites
├── docs/                  # Documentation
└── pnpm-workspace.yaml
```

---

## 7. Key Commands

### Development

```bash
pnpm dev              # Start all apps
pnpm build            # Build all apps
pnpm typecheck        # Run TypeScript checks
pnpm lint             # Run ESLint
pnpm lint:fix         # Fix linting issues
```

### Database

```bash
pnpm db:generate      # Generate Drizzle migrations
pnpm db:migrate       # Run migrations
pnpm db:push          # Push schema (dev only, no migration)
pnpm db:studio        # Open Drizzle Studio
```

### Testing

```bash
pnpm test             # Run all tests
pnpm test:unit        # Unit tests only
pnpm test:integration # Integration tests only
pnpm test:e2e         # E2E tests (Playwright)
```

### Utilities

```bash
pnpm clean            # Remove node_modules and build artifacts
pnpm deps:update      # Update dependencies interactively
```

---

## 8. Development Workflow

### Creating a New Feature

1. Create feature branch: `git checkout -b 002-feature-name`
2. Run `/speckit.specify` to create spec
3. Run `/speckit.clarify` for questions
4. Run `/speckit.plan` for design artifacts
5. Run `/speckit.tasks` for task breakdown
6. Implement tasks

### Adding a New API Endpoint

1. Define Zod schema in `packages/nuxt-layer-schema/schemas/`
2. Export types from `packages/nuxt-layer-schema/index.ts`
3. Add repository function in `packages/nuxt-layer-api/server/data/repositories/`
4. Create endpoint in `packages/nuxt-layer-api/server/api/`
5. Add composable in `packages/nuxt-layer-api/app/composables/` (if needed)
6. Write tests

### Adding a New UI Component

1. Create component in `packages/nuxt-layer-ui/app/components/`
2. Follow NuxtUI v4 patterns (check MCP docs)
3. Add to playground for testing
4. Export from layer if shared

---

## 9. Testing the Happy Path

### Manual Testing Checklist

1. **Auth**: Visit `/login`, sign in with Google
2. **Profile**: Go to `/profile`, fill required fields
3. **Resume**: Go to `/resumes/new`, upload DOCX
4. **View Resume**: Check parsed JSON in editor
5. **Vacancy**: Go to `/vacancies/new`, create vacancy
6. **Generate**: Click "Generate Tailored Resume"
7. **View**: Check ATS and Human views
8. **Export**: Download PDF

### E2E Test

```bash
# Run full happy path E2E test
pnpm test:e2e -- --grep "happy path"
```

---

## 10. Troubleshooting

### Common Issues

**"Module not found: @int/schema"**

- Run `pnpm install` from root
- Check `pnpm-workspace.yaml` includes packages

**OAuth callback error**

- Verify redirect URI in Google Console matches exactly
- Check `NUXT_PUBLIC_BASE_URL` is correct

**Database connection failed**

- Ensure PostgreSQL is running (`pnpm db:up` or local service)
- Check `NUXT_DATABASE_URL` format and credentials

**LLM parsing fails**

- Verify `NUXT_LLM_OPENAI_API_KEY` is set and valid
- Check rate limits on OpenAI dashboard

**PDF export timeout**

- Playwright needs Chromium; run `npx playwright install chromium`
- Check serverless function timeout (increase if needed)

### Getting Help

- Check `docs/` folder for architecture decisions
- Review `specs/001-foundation-mvp/` for feature details
- Use MCP docs for Nuxt/NuxtUI specifics

---

## 11. Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy site
cd apps/site
vercel

# Deploy admin (separate project)
cd apps/admin
vercel
```

### Environment Variables on Vercel

Set these in Vercel project settings:

- `NUXT_DATABASE_URL` (PostgreSQL connection string)
- `NUXT_OAUTH_GOOGLE_CLIENT_ID`
- `NUXT_OAUTH_GOOGLE_CLIENT_SECRET`
- `NUXT_SESSION_PASSWORD`
- `NUXT_LLM_OPENAI_API_KEY`
- `NUXT_LLM_GEMINI_API_KEY` (optional)
- `NUXT_STORAGE_BLOB_READ_WRITE_TOKEN`
- `NUXT_PUBLIC_BASE_URL` (production URL)

### Vercel Cron Jobs

Add to `vercel.json` for background tasks:

```json
{
  "crons": [
    {
      "path": "/api/tasks/cleanup",
      "schedule": "0 0 * * *"
    }
  ]
}
```

---

## Next Steps

After setup:

1. Run `/speckit.tasks` to generate implementation tasks
2. Start with infrastructure tasks (monorepo setup, DB schema)
3. Proceed through tasks in dependency order
4. Test each feature as you complete it
