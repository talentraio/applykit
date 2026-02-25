# Development Guide

This section is a practical onboarding path for new contributors.

## Recommended reading order

1. [Local setup](./local-setup.md)
2. [Daily workflow](./workflow.md)
3. [Speckit flow (simplified + full)](./speckit.md)
4. [Testing guide](./testing.md)
5. [Database and migrations](./database-migrations.md)
6. [Deployment (Vercel + GitHub Actions)](./deployment.md)
7. [Maintenance checklist](./maintenance.md)
8. [Cover-letter locale/market onboarding](./cover-letter-locale-market-onboarding.md)
9. [Cover-letter locale/market PR checklist](./cover-letter-locale-market-checklist.md)

## Quick commands

```bash
pnpm install
cp .env.example .env
pnpm db:up
pnpm --filter @int/api db:migrate
pnpm dev:site
```

Optional admin app in parallel:

```bash
PORT=3001 pnpm dev:admin
```
