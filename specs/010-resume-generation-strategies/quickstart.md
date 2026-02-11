# Quickstart: 010 - Resume Generation Strategies

## Prerequisites

- Install dependencies: `pnpm install`
- Database up and migrated for latest schema
- Env configured in `.env` (platform provider keys)

## 1) Type and lint baseline

```bash
pnpm typecheck
pnpm lint
```

## 2) Run API-focused tests

```bash
pnpm --filter @int/api test
```

Target suites for this feature:

- strategy resolution precedence tests
- deterministic scoring computation tests
- adaptation retry model tests
- grouped routing default/override tests

## 3) Run admin app and verify routing controls

```bash
pnpm --filter admin dev
```

Manual checks:

1. Open `/llm/routing`.
2. For adaptation/scoring card, set strategy to `economy` and save.
3. Set adaptation retry model and save.
4. Ensure save button disables when no pending changes.
5. Open `/roles/[id]`, override to `quality`, save and refresh.
6. Confirm override persists and effective values are shown.

## 4) Run site app and verify generation behavior

```bash
pnpm dev:site
```

Manual checks:

1. Open `/vacancies/[id]/overview`.
2. Generate tailored resume as user with no override -> default strategy applies.
3. Generate as user with role override -> overridden strategy applies.
4. Confirm API response shape remains unchanged for UI.
5. Trigger scoring failure path (test fixture/mocked failure) and verify generation still saves.

## 5) Observability checks

- Confirm usage log entries include adaptation and scoring contexts.
- Confirm per-generation scoring breakdown is persisted and queryable.
- Confirm no BYOK provider type/value appears in runtime logs or DB rows.

## 6) Regression checks

- `/llm/routing` no hydration mismatch in console.
- `/roles/[id]` no hydration mismatch in console.
- `/vacancies/[id]/overview` no console errors during generation flow.

## Execution notes

- 2026-02-11: `pnpm typecheck` -> PASS.
- 2026-02-11: `pnpm exec vitest run packages/schema/tests/generation.test.ts packages/nuxt-layer-api/tests/unit/services/llm/deterministic-scoring.test.ts` -> PASS (9 tests).
- 2026-02-11: `pnpm exec vitest run packages/nuxt-layer-api/tests/integration/services/llm-routing-resolution.test.ts packages/nuxt-layer-api/tests/integration/services/llm-scenario-selection.test.ts packages/nuxt-layer-api/tests/integration/services/vacancy-generate-two-step.test.ts packages/nuxt-layer-api/tests/integration/services/vacancy-generate-fallback-score.test.ts packages/nuxt-layer-api/tests/integration/services/admin-llm-routing-api.test.ts` -> PASS (7 tests).
- 2026-02-11: `pnpm --filter @int/api test` -> package has no `test` script (no-op); executed equivalent `pnpm exec vitest run packages/nuxt-layer-api/tests` -> PASS (9 passed, 42 skipped).
- 2026-02-11: `pnpm --filter @int/api db:migrate` applied migration `0014_generation_strategy_and_score_breakdown.sql` for local smoke environment.
- 2026-02-11: Manual smoke via Playwright:
  - `/llm/routing` -> loads with grouped adaptation+scoring card, no console errors after migration.
  - `/roles/friend` -> role routing/settings page renders correctly (validated before session reset).
  - `/vacancies/17364fd0-cdb6-4228-a145-8aab6cff5b2d/overview` -> overview renders with new actions/meta layout, no console errors.
