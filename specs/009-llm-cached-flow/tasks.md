# Tasks: 009 - Cached Two-Step Resume Adaptation Scoring

**Input**: Design documents from `/specs/009-llm-cached-flow/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/
**Documentation Gate**: Read and follow `docs/codestyle/base.md` before any code changes. Also read:

- `docs/architecture/README.md`
- `docs/api/endpoints.md`
- `docs/api/schemas.md`
- `docs/architecture/security-privacy.md`

**Tests**: Included. The spec explicitly requires unit/integration regression coverage for generation,
routing, caching behavior, and BYOK-removal cleanup.

**Organization**: Tasks are grouped by user story for independent implementation and testing.

## User Stories

- **US1 (P1)**: Two-step vacancy generation (adaptation + scoring) with non-blocking fallback
- **US2 (P2)**: Mullion shared-context orchestration with explicit Gemini cached-content reuse
- **US3 (P3)**: Admin routing supports scoring scenario and groups it under adaptation UX
- **US4 (P4)**: Full BYOK purge and platform-only provider-type normalization

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Parallelizable (different files, no dependency on incomplete tasks)
- **[Story]**: User story label (US1..US4)
- Every task includes file path(s)

---

## Phase 1: Setup (Shared Dependencies and Config)

**Purpose**: Prepare workspace dependencies and runtime config used by all stories.

- [x] T001 Add Mullion and AI SDK npm dependencies in `packages/nuxt-layer-api/package.json` and lock entries in `pnpm-lock.yaml`
- [x] T002 [P] Add runtime config/env defaults for Mullion/Gemini cache settings in `packages/nuxt-layer-api/nuxt.config.ts` and `.env.example`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared schema and data-layer baseline required before all user stories.

**⚠️ CRITICAL**: No user story work starts before this phase is complete.

- [x] T003 Update scenario/usage/provider enums for scoring and BYOK removal in `packages/schema/constants/enums.ts` and `packages/schema/schemas/enums.ts` (package: `@int/schema`)
- [x] T004 [P] Update schema contracts/exports for new enums in `packages/schema/schemas/llm-routing.ts`, `packages/schema/schemas/usage.ts`, and `packages/schema/index.ts` (package: `@int/schema`)
- [x] T005 Update Drizzle enum/table usage for scoring context and platform-only provider type in `packages/nuxt-layer-api/server/data/schema.ts` (package: `@int/api`)
- [x] T006 Create migration for scenario seed + provider-type normalization in `packages/nuxt-layer-api/server/data/migrations/` and `packages/nuxt-layer-api/server/data/migrations/meta/_journal.json` (package: `@int/api`)
- [x] T007 [P] Extend routing repository support for `resume_adaptation_scoring` in `packages/nuxt-layer-api/server/data/repositories/llm-routing.ts` (package: `@int/api`)
- [x] T008 [P] Refactor usage aggregation to platform-only breakdown in `packages/nuxt-layer-api/server/data/repositories/usage-log.ts` (package: `@int/api`)

**Checkpoint**: Enums, DB schema, and repositories are ready for feature stories.

---

## Phase 3: User Story 1 - Two-Step Generation with Fallback (Priority: P1) 🎯 MVP

**Goal**: `POST /api/vacancies/:id/generate` executes adaptation and scoring as separate calls and still
saves generation when scoring fails.

**Independent Test**: Call generation endpoint for an owned vacancy; verify generation is saved with
valid scores on success and also saved with deterministic fallback scores when scoring call is forced
to fail.

### Tests for User Story 1

- [x] T009 [P] [US1] Add integration test for two-step success path in `packages/nuxt-layer-api/tests/integration/services/vacancy-generate-two-step.test.ts`
- [x] T010 [P] [US1] Add integration test for non-blocking scoring-failure fallback path in `packages/nuxt-layer-api/tests/integration/services/vacancy-generate-fallback-score.test.ts`

### Implementation for User Story 1

- [x] T011 [US1] Refactor adaptation prompt to content-only output in `packages/nuxt-layer-api/server/services/llm/prompts/generate.ts`
- [x] T012 [P] [US1] Add scoring prompt module in `packages/nuxt-layer-api/server/services/llm/prompts/generate-score.ts`
- [x] T013 [US1] Split generation service into adaptation/scoring/orchestration APIs in `packages/nuxt-layer-api/server/services/llm/generate.ts`
- [x] T014 [US1] Implement deterministic fallback scoring and score invariants in `packages/nuxt-layer-api/server/services/llm/generate.ts`
- [x] T015 [US1] Update generation endpoint orchestration while preserving response shape in `packages/nuxt-layer-api/server/api/vacancies/[id]/generate.post.ts`
- [x] T016 [US1] Add separate usage logging contexts for adaptation/scoring in `packages/nuxt-layer-api/server/utils/usage.ts` and `packages/nuxt-layer-api/server/api/vacancies/[id]/generate.post.ts`

**Checkpoint**: P1 flow works end-to-end for users and keeps current API contract.

---

## Phase 4: User Story 2 - Mullion Shared Context + Gemini Cached Content (Priority: P2)

**Goal**: The two-step generation flow uses Mullion shared context and explicit Gemini cached-content
reuse for scoring.

**Independent Test**: Generate for same vacancy content with Gemini routing and verify second phase
uses cached-content provider option while fallback to non-cached behavior remains functional.

### Tests for User Story 2

- [x] T017 [P] [US2] Add integration tests for shared-context orchestration behavior in `packages/nuxt-layer-api/tests/integration/services/llm-shared-context.test.ts`
- [x] T018 [P] [US2] Add integration tests for Gemini cached-content handoff/fallback in `packages/nuxt-layer-api/tests/integration/services/llm-gemini-cache.test.ts`

### Implementation for User Story 2

- [x] T019 [US2] Extend LLM request typing for provider options/cache metadata in `packages/nuxt-layer-api/server/services/llm/types.ts`
- [x] T020 [US2] Add Mullion client bootstrap and shared-context helper in `packages/nuxt-layer-api/server/services/llm/index.ts` and `packages/nuxt-layer-api/server/services/llm/mullion.ts`
- [x] T021 [US2] Wire scoring scenario routing and phase-aware model resolution in `packages/nuxt-layer-api/server/services/llm/index.ts` and `packages/nuxt-layer-api/server/services/llm/generate.ts`
- [x] T022 [US2] Implement Gemini cached-content provider option handling in `packages/nuxt-layer-api/server/services/llm/providers/gemini.ts`
- [x] T023 [US2] Align OpenAI provider behavior with shared-context flow (no explicit cached-content) in `packages/nuxt-layer-api/server/services/llm/providers/openai.ts`

**Checkpoint**: Cache-aware orchestration is active and provider-specific behavior is reliable.

---

## Phase 5: User Story 3 - Admin Routing Grouped Adaptation+Scoring (Priority: P3)

**Goal**: Admin can configure scoring scenario while UI groups it under adaptation on both
`/llm/routing` and `/roles/[id]`.

**Independent Test**: Configure adaptation and grouped scoring defaults/overrides from both pages,
reload, and verify values persist and map to distinct backend scenario keys.

### Tests for User Story 3

- [x] T024 [P] [US3] Extend routing API coverage for scoring scenario CRUD in `packages/nuxt-layer-api/tests/integration/services/admin-llm-routing-api.test.ts`
- [x] T025 [P] [US3] Extend runtime routing precedence coverage with scoring scenario in `packages/nuxt-layer-api/tests/integration/services/llm-routing-resolution.test.ts`

### Implementation for User Story 3

- [x] T026 [US3] Seed and expose scoring scenario metadata in `packages/nuxt-layer-api/server/data/migrations/` and `packages/nuxt-layer-api/server/data/repositories/llm-routing.ts`
- [x] T027 [US3] Add i18n keys for grouped adaptation/scoring labels in `apps/admin/i18n/locales/en.json`
- [x] T028 [US3] Implement grouped rendering and save flow on routing page in `apps/admin/layers/llm/app/pages/llm/routing.vue`
- [x] T029 [US3] Extend routing card for grouped adaptation/scoring controls in `apps/admin/layers/llm/app/components/routing/Card.vue`
- [x] T030 [US3] Reuse grouped card and preserve override semantics in `apps/admin/layers/roles/app/components/item/Scenarios.vue` and `apps/admin/layers/roles/app/pages/roles/[role].vue`
- [x] T031 [US3] Update admin routing data layer for grouped UI mapping in `apps/admin/layers/llm/app/infrastructure/admin-llm-routing.api.ts`, `apps/admin/layers/llm/app/composables/useAdminLlmRouting.ts`, and `apps/admin/layers/llm/app/stores/admin-llm-routing.ts`

**Checkpoint**: Admin routing UX is grouped without losing backend scenario separation.

---

## Phase 6: User Story 4 - BYOK Full Removal and Platform-Only Runtime (Priority: P4)

**Goal**: Remove remaining BYOK artifacts from active runtime/schema/docs and keep platform-only
provider semantics.

**Independent Test**: Search and runtime checks confirm no active BYOK execution path; usage/provider
analytics are platform-only and migration normalizes legacy rows.

### Tests for User Story 4

- [x] T032 [P] [US4] Replace BYOK-related integration assertions with platform-only assertions in `packages/nuxt-layer-api/tests/integration/services/limits.test.ts` and `packages/nuxt-layer-api/tests/integration/services/byok-keys.test.ts`
- [x] T033 [P] [US4] Add integration test for usage provider normalization/migration result in `packages/nuxt-layer-api/tests/integration/services/usage-provider-normalization.test.ts`

### Implementation for User Story 4

- [x] T034 [US4] Remove `BYOK` from shared provider type constants and validators in `packages/schema/constants/enums.ts` and `packages/schema/schemas/enums.ts`
- [x] T035 [US4] Update usage schema and server usage plumbing for platform-only provider type in `packages/schema/schemas/usage.ts`, `packages/nuxt-layer-api/server/data/schema.ts`, and `packages/nuxt-layer-api/server/utils/usage.ts`
- [x] T036 [US4] Implement provider-type normalization migration and enum replacement in `packages/nuxt-layer-api/server/data/migrations/` and `packages/nuxt-layer-api/server/data/migrations/meta/_journal.json`
- [x] T037 [US4] Remove BYOK references from LLM/limits/service docs in `packages/nuxt-layer-api/server/services/llm/README.md`, `packages/nuxt-layer-api/server/services/limits/README.md`, and `packages/nuxt-layer-api/server/data/README.md`
- [x] T038 [US4] Remove BYOK references from integration docs and public terms in `packages/nuxt-layer-api/tests/integration/README.md` and `apps/site/layers/static/app/pages/terms.vue`
- [x] T039 [US4] Update architecture/API docs for final platform-only semantics in `docs/api/endpoints.md`, `docs/api/schemas.md`, and `docs/architecture/security-privacy.md`

**Checkpoint**: BYOK is fully removed in active code paths and docs.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final validation across all stories.

- [x] T040 [P] Run `pnpm typecheck` and record/fix notes in `specs/009-llm-cached-flow/quickstart.md`
- [x] T041 [P] Run `pnpm --filter @int/api test` and record/fix notes in `specs/009-llm-cached-flow/quickstart.md`
- [x] T042 Run targeted manual smoke for `/vacancies/[id]/overview`, `/llm/routing`, and `/roles/[id]` and record outcomes in `specs/009-llm-cached-flow/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: starts immediately
- **Foundational (Phase 2)**: depends on Setup; blocks all user stories
- **US1 (Phase 3)**: depends on Foundational
- **US2 (Phase 4)**: depends on US1 service split and Foundational enums
- **US3 (Phase 5)**: depends on Foundational scenario key support
- **US4 (Phase 6)**: depends on Foundational and should land before final regression
- **Polish (Phase 7)**: depends on all story phases

### User Story Dependencies

- **US1 (P1)**: independent after Foundational
- **US2 (P2)**: depends on US1 two-step orchestration baseline
- **US3 (P3)**: independent after Foundational, but runtime validation benefits from US1/US2
- **US4 (P4)**: independent after Foundational; must complete before release

### Within Each User Story

- Tests should fail before implementation changes
- Prompt/service refactors before endpoint rewiring
- Endpoint/runtime behavior before UI grouping
- Migrations before relying on new enum/runtime constraints

### Parallel Opportunities

- T002 can run in parallel with T001
- T004, T007, and T008 can run in parallel after T003
- T009 and T010 can run in parallel
- T017 and T018 can run in parallel
- T024 and T025 can run in parallel
- T032 and T033 can run in parallel
- T040 and T041 can run in parallel

---

## Parallel Example: User Story 1

```bash
Task: "Add integration test for two-step success path in packages/nuxt-layer-api/tests/integration/services/vacancy-generate-two-step.test.ts"
Task: "Add integration test for non-blocking scoring fallback in packages/nuxt-layer-api/tests/integration/services/vacancy-generate-fallback-score.test.ts"
```

## Parallel Example: User Story 3

```bash
Task: "Extend routing API coverage in packages/nuxt-layer-api/tests/integration/services/admin-llm-routing-api.test.ts"
Task: "Extend routing precedence coverage in packages/nuxt-layer-api/tests/integration/services/llm-routing-resolution.test.ts"
```

## Parallel Example: User Story 4

```bash
Task: "Replace BYOK assertions in packages/nuxt-layer-api/tests/integration/services/limits.test.ts and byok-keys.test.ts"
Task: "Add provider normalization test in packages/nuxt-layer-api/tests/integration/services/usage-provider-normalization.test.ts"
```

---

## Implementation Strategy

### MVP First (US1 only)

1. Complete Phases 1-2.
2. Complete Phase 3 (US1).
3. Validate endpoint behavior independently before moving forward.

### Incremental Delivery

1. Deliver US1 generation split.
2. Deliver US2 cache-aware orchestration.
3. Deliver US3 admin grouping.
4. Deliver US4 cleanup and docs.
5. Run Phase 7 validation gates.

### Parallel Team Strategy

1. Engineer A: schema/migrations/runtime refactor (Phases 2-4).
2. Engineer B: admin grouping UX and routing state (Phase 5).
3. Engineer C: BYOK purge/docs/tests (Phase 6 + Phase 7).
