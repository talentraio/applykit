# Quickstart: 011 Lightweight Score + On-Demand Detailed Scoring

## Prerequisites

- Branch: `codex/feature/011-detailed-scoring-modes`
- Env configured for API layer (`packages/nuxt-layer-api/.env`)
- Database up and reachable

## 1) Apply schema/migration changes

```bash
cd /Users/kolobok/WebstormProjects/_My/resume-editor
pnpm --filter @int/api db:generate
pnpm --filter @int/api db:push
```

If migration SQL needs manual edits (recommended), run `db:generate`, edit migration, then run:

```bash
pnpm --filter @int/api db:migrate
```

## 2) Run type/lint checks during implementation

```bash
cd /Users/kolobok/WebstormProjects/_My/resume-editor
pnpm typecheck
pnpm lint
```

## 3) Run targeted tests

```bash
cd /Users/kolobok/WebstormProjects/_My/resume-editor
pnpm test -- --runInBand tests/integration/services
```

(Adjust path/filter according to newly added test files.)

## 4) Manual verification (site)

1. Start site and api runtime.
2. Open `/vacancies/[id]/resume`.
3. Trigger generation and confirm baseline score appears.
4. Click `Details` and verify redirect to `/vacancies/[id]/preparation`.
5. Click `Details` again and verify reuse path (no forced regeneration).
6. Edit vacancy text in fields covered by existing re-generation availability logic.
7. Confirm `Regenerate details` appears and works.

## 5) Manual verification (admin)

1. Open `/llm/routing` and verify dedicated detailed scoring scenario card.
2. Save default model for detailed scoring.
3. Open `/roles/[id]` and set override for detailed scoring.
4. Re-test site with user of that role to confirm runtime model resolution precedence.

## 6) Regression checks

- Existing generation endpoint response still includes baseline score fields.
- Non-eligible roles do not see/trigger `Details`.
- No BYOK UI/API/runtime path reappears.

## 7) Execution log (2026-02-11)

### Validation commands

- `pnpm typecheck` ✅ passed
- `pnpm lint` ✅ passed
- `pnpm test -- packages/nuxt-layer-api/tests/unit/services/llm/baseline-scoring.test.ts packages/nuxt-layer-api/tests/unit/services/llm/deterministic-scoring.test.ts packages/nuxt-layer-api/tests/integration/services/vacancy-generate-baseline-score.test.ts packages/nuxt-layer-api/tests/integration/services/vacancy-generate-fallback-score.test.ts packages/nuxt-layer-api/tests/integration/services/llm-scenario-selection.test.ts packages/nuxt-layer-api/tests/integration/services/llm-routing-resolution.test.ts packages/nuxt-layer-api/tests/integration/services/admin-llm-routing-api.test.ts packages/nuxt-layer-api/tests/integration/services/vacancy-score-details-reuse.test.ts packages/nuxt-layer-api/tests/integration/services/vacancy-preparation-details.test.ts` ✅ passed (9 files, 16 tests)

### DB migration note

- During smoke, the previous single migration `0015_detailed_scoring_modes.sql` failed on Postgres with:
  `unsafe use of new value "...resume_adaptation_scoring_detail" of enum type llm_scenario_key`.
- Fixed by splitting migration into:
  - `0015_detailed_scoring_modes.sql` (enum additions only)
  - `0016_detailed_scoring_storage.sql` (scenario seed + defaults + details table)
- Re-applied with `pnpm --filter @int/api db:migrate` ✅

### Manual smoke outcomes

- Admin: `http://localhost:3001/llm/routing` ✅ opens, no console errors after reload.
- Admin: `http://localhost:3001/roles/friend` ✅ opens, no console errors.
- Site: created smoke user via `/api/auth/register` and vacancy via `/api/vacancies`.
  - Created vacancy id: `940f1b4f-6504-4959-b470-36949789a51c`.
- Site: `http://localhost:3002/vacancies/940f1b4f-6504-4959-b470-36949789a51c/resume` ✅ opens (`No Generated Resume` state), no console errors.
- Site: `http://localhost:3002/vacancies/940f1b4f-6504-4959-b470-36949789a51c/preparation` ✅ opens (`No Generation Found` state), no console errors.
