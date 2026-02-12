# Local Setup

## Prerequisites

- Node.js (project uses `pnpm` workspaces; use a modern LTS runtime)
- `pnpm` (repo is pinned to `pnpm@9` in `packageManager`)
- Docker Desktop (recommended for local PostgreSQL)

## 1) Install dependencies

```bash
pnpm install
```

## 2) Configure environment

```bash
cp .env.example .env
```

Minimum variables for local start:

- `NUXT_SESSION_PASSWORD`
- `NUXT_DATABASE_URL` (optional if using default local URL)
- at least one provider key for AI scenarios:
  - `NUXT_LLM_OPENAI_API_KEY` or
  - `NUXT_LLM_GEMINI_API_KEY`

## 3) Start database

```bash
pnpm db:up
pnpm db:status
```

## 4) Apply migrations

```bash
pnpm --filter @int/api db:migrate
```

## 5) Start applications

Site app:

```bash
pnpm dev:site
```

Admin app (second terminal):

```bash
PORT=3001 pnpm dev:admin
```

## 6) Verify baseline health

```bash
pnpm typecheck
pnpm lint
pnpm test
```
