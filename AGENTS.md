# Repository Guidelines

## Project Context

- Nuxt monorepo (pnpm workspaces) for a resume tailoring tool.
- MVP focus: parse resumes (DOCX/PDF) into strict JSON, tailor per vacancy, export ATS/Human PDFs.

## Project Structure & Module Organization

- `apps/site` and `apps/admin` are Nuxt 4 applications.
- `packages/nuxt-layer-api`, `packages/nuxt-layer-ui`, and `packages/schema` are shared layers and
  contracts published as `@int/*` (`@int/api`, `@int/ui`, `@int/schema`).
- `tests/` holds `unit`, `e2e`, and `fixtures`; additional package tests live under `packages/*/tests`.
- `docs/` and `specs/` contain product and technical notes.
- Root configs live in `eslint.config.js`, `vitest.config.ts`, `playwright.config.ts`, and `pnpm-workspace.yaml`.

## Build, Test, and Development Commands

- `pnpm dev:site` / `pnpm dev:admin` start the Nuxt apps locally (`dev:site` serves `http://localhost:3000`).
- `pnpm build:site` / `pnpm build:admin` build production bundles; use `pnpm --filter <pkg> build` for a single workspace.
- `pnpm --filter @int/api db:generate|db:migrate|db:push|db:studio` manage Drizzle schema and migrations.
- Use `db:generate` after schema changes, `db:push` for local dev sync, and `db:migrate` for versioned migrations.
- `pnpm typecheck` runs TypeScript checks across all workspaces.
- `pnpm lint` / `pnpm lint:fix` run ESLint; `pnpm format` / `pnpm format:check` run Prettier.
- `pnpm test` / `pnpm test:watch` / `pnpm test:coverage` run Vitest.
- `pnpm e2e` / `pnpm e2e:ui` run Playwright against the site app.

## Important Rules

- **No unauthorized changes**: Do NOT make business logic changes (like removing auto-save, changing
  core functionality) or global layout changes without explicit user approval.
- **Server cleanup**: After using Playwright or running dev servers for testing, always stop
  servers to free up ports.

## Coding Style & Naming Conventions

- Before any code changes, read `docs/codestyle/base.md` (always-on). Use other
  docs/codestyle/\* as needed.
- TypeScript + Vue SFCs; keep code typed end-to-end.
- **CRITICAL: Type Safety Policy**
  - Avoid `any` and type assertions (`as Type`) - allowed only in exceptional cases
  - Permitted: `as const`, `{} as const`, justified `as unknown as Type`
  - Always find and import proper types from libraries (e.g., `ButtonProps` from `#ui/types`)
  - Never suppress TypeScript errors with `any` - find the root cause and fix it properly
- Avoid client-side generic typing for API calls; import proper types instead.
- Formatting: 2-space indent, single quotes, no semicolons, 100-character print width.
- Date handling: use `date-fns` for formatting/parsing and date arithmetic; avoid `Intl.DateTimeFormat`
  and `toLocale*` for user-facing dates.
- Prefer workspace package names like `@int/schema`, `@int/api`, and `@int/ui`.
- Use `*.test.ts` or `*.spec.ts` for unit tests (Vitest includes both).
- Use Zod validation in LLM/parsing services.
- Pinia stores own data flow; components call store actions.
- **CRITICAL**: Always use `useApi()` for client-side API calls — never `$fetch` directly (see `docs/codestyle/base.md`).
- i18n from the start.
- Use server-side islands rendering for ATS/Human pages.

## Tooling & Docs Policy

- Use latest Nuxt v4 and NuxtUI v4.
- For Nuxt questions, rely on the Nuxt docs MCP server.
  If the Nuxt MCP is needed but not working: stop coding and ask the user to fix MCP.
- For NuxtUI questions, rely on the NuxtUI docs MCP server.
  If the NuxtUI MCP is needed but not working: stop coding and ask the user to fix MCP.
- For other libraries/docs: prefer MCP context7 as the first source.
- Check VueUse first; prefer existing composables over custom ones.

## Testing Guidelines

- Unit tests live in `tests/unit` and `packages/*/tests`; keep fixtures in `tests/fixtures`.
- E2E tests live in `tests/e2e`; Playwright starts `pnpm dev:site` and expects `http://localhost:3000`.
- Use `pnpm test:coverage` for HTML/JSON coverage reports.

## Commit & Pull Request Guidelines

- Commit messages follow Conventional Commits with ticket IDs when available, e.g. `feat: add resume upload (T070-T084)`.
- PRs should include a short summary, linked issue or ticket, and test results; add screenshots for UI changes.

## Configuration & Secrets

- Copy `.env.example` to `.env` and fill required values (OAuth, DB, storage).
- Use `useRuntimeConfig()` for env values; avoid `process.env` in runtime code (except `NODE_ENV`).
- Env vars must use `NUXT_` (server-only) or `NUXT_PUBLIC_` (client-exposed) prefixes; set defaults only in `nuxt.config.ts`.
- `NUXT_DATABASE_URL` is optional for local development (defaults to local Postgres if unset).

## Active Technologies

- TypeScript 5.x (Nuxt 4 / Vue 3) + Nuxt 4, NuxtUI 4, Pinia, Zod, Drizzle ORM, Vercel AI SDK adapters, `@mullion/ai-sdk` (011-detailed-scoring-modes)
- PostgreSQL (Drizzle schema under `packages/nuxt-layer-api/server/data/`) (011-detailed-scoring-modes)

## Recent Changes

- 011-detailed-scoring-modes: Added TypeScript 5.x (Nuxt 4 / Vue 3) + Nuxt 4, NuxtUI 4, Pinia, Zod, Drizzle ORM, Vercel AI SDK adapters, `@mullion/ai-sdk`
