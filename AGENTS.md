# Repository Guidelines

## Project Structure & Module Organization

- `apps/site` and `apps/admin` are Nuxt 4 applications.
- `packages/nuxt-layer-api`, `packages/nuxt-layer-ui`, and `packages/schema` are shared layers and contracts published as `@int/*`.
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

## Coding Style & Naming Conventions

- TypeScript + Vue SFCs; keep code typed end-to-end.
- Formatting: 2-space indent, single quotes, no semicolons, 100-character print width.
- Prefer workspace package names like `@int/schema`, `@int/api`, and `@int/ui`.
- Use `*.test.ts` or `*.spec.ts` for unit tests (Vitest includes both).

## Testing Guidelines

- Unit tests live in `tests/unit` and `packages/*/tests`; keep fixtures in `tests/fixtures`.
- E2E tests live in `tests/e2e`; Playwright starts `pnpm dev:site` and expects `http://localhost:3000`.
- Use `pnpm test:coverage` for HTML/JSON coverage reports.

## Commit & Pull Request Guidelines

- Commit messages follow Conventional Commits with ticket IDs when available, e.g. `feat: add resume upload (T070-T084)`.
- PRs should include a short summary, linked issue or ticket, and test results; add screenshots for UI changes.

## Configuration & Secrets

- Copy `.env.example` to `.env` and fill required values (OAuth, DB, storage).
- `DATABASE_URL` is optional for local development (SQLite is used if unset).
