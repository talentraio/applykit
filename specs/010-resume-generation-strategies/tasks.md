# Tasks: 010 - Strategy-Based Resume Adaptation and Deterministic Scoring

**Input**: Design documents from `/specs/010-resume-generation-strategies/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/
**Documentation Gate**: Read and follow `docs/codestyle/base.md` before any code changes. Also read:

- `docs/architecture/README.md`
- `docs/api/README.md`
- `docs/codestyle/README.md`

**Tests**: Included. The spec explicitly requires unit/integration coverage for strategy resolution,
adaptation retry, deterministic scoring, and admin routing persistence.

**Organization**: Tasks are grouped by user story for independent implementation and testing.

## User Stories

- **US1 (P1)**: Role-aware strategy execution for resume generation
- **US2 (P1)**: Deterministic, explainable scoring pipeline
- **US3 (P2)**: Admin strategy + adaptation retry configurability

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Parallelizable (different files, no dependency on incomplete tasks)
- **[Story]**: User story label (US1..US3)
- Every task includes file path(s)

---

## Phase 1: Setup (Shared Dependencies and Docs)

**Purpose**: Prepare feature docs/contracts and ensure implementation prerequisites are explicit.

- [x] T001 Verify and align feature docs with latest decisions in `specs/010-resume-generation-strategies/spec.md`, `specs/010-resume-generation-strategies/research.md`, and `specs/010-resume-generation-strategies/plan.md`
- [x] T002 [P] Validate contract draft consistency with runtime conventions in `specs/010-resume-generation-strategies/contracts/llm-routing-strategy.yaml` and `docs/api/endpoints.md`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Schema/migration/runtime foundations required by all user stories.

**⚠️ CRITICAL**: No user story work starts before this phase is complete.

- [x] T003 Add strategy enum/constants and exports in `packages/schema/constants/enums.ts` and `packages/schema/index.ts` (package: `@int/schema`)
- [x] T004 [P] Extend shared enum validators for strategy key in `packages/schema/schemas/enums.ts` (package: `@int/schema`)
- [x] T005 [P] Extend LLM routing schemas with optional strategy key in `packages/schema/schemas/llm-routing.ts` (package: `@int/schema`)
- [x] T006 Add score breakdown schema/contracts in `packages/schema/schemas/generation.ts` and export via `packages/schema/index.ts` (package: `@int/schema`)
- [x] T007 Extend Drizzle schema for strategy fields and generation score breakdown in `packages/nuxt-layer-api/server/data/schema.ts` (package: `@int/api`)
- [x] T008 Create migration for strategy fields and score breakdown backfill in `packages/nuxt-layer-api/server/data/migrations/` and `packages/nuxt-layer-api/server/data/migrations/meta/_journal.json` (package: `@int/api`)
- [x] T009 [P] Update generation repository CRUD typing for score breakdown in `packages/nuxt-layer-api/server/data/repositories/generation.ts` (package: `@int/api`)
- [x] T010 [P] Update routing repository DTO mapping for strategy-aware assignments in `packages/nuxt-layer-api/server/data/repositories/llm-routing.ts` (package: `@int/api`)

**Checkpoint**: Shared contracts, DB schema, and repositories are ready for story implementation.

---

## Phase 3: User Story 1 - Role-Aware Strategy Execution (Priority: P1) 🎯 MVP

**Goal**: Runtime uses `economy`/`quality` strategy with precedence `role override -> default -> fallback` while preserving current generate API contract.

**Independent Test**: Configure different strategy defaults/overrides and verify generation chooses the correct strategy and keeps response shape unchanged.

### Tests for User Story 1

- [x] T011 [P] [US1] Add strategy precedence integration test in `packages/nuxt-layer-api/tests/integration/services/llm-routing-resolution.test.ts`
- [x] T012 [P] [US1] Add generation strategy selection integration test in `packages/nuxt-layer-api/tests/integration/services/llm-scenario-selection.test.ts`

### Implementation for User Story 1

- [x] T013 [US1] Add strategy types/interfaces for generation flow in `packages/nuxt-layer-api/server/services/llm/types.ts`
- [x] T014 [US1] Create strategy resolver module for grouped adaptation/scoring flow in `packages/nuxt-layer-api/server/services/llm/routing.ts`
- [x] T015 [US1] Add strategy prompt-pack orchestration in `packages/nuxt-layer-api/server/services/llm/prompts/generate.ts` and `packages/nuxt-layer-api/server/services/llm/prompts/shared-context.ts`
- [x] T016 [US1] Implement strategy-aware adaptation call entrypoint in `packages/nuxt-layer-api/server/services/llm/generate.ts`
- [x] T017 [US1] Wire adaptation retry behavior (adaptation-only) in `packages/nuxt-layer-api/server/services/llm/generate.ts` and `packages/nuxt-layer-api/server/services/llm/index.ts`
- [x] T018 [US1] Ensure endpoint contract compatibility while using strategy resolution in `packages/nuxt-layer-api/server/api/vacancies/[id]/generate.post.ts`

**Checkpoint**: Generation flow is strategy-aware and contract-compatible.

---

## Phase 4: User Story 2 - Deterministic Explainable Scoring (Priority: P1)

**Goal**: Replace judge-only scoring with structured extraction/mapping plus deterministic computation and breakdown persistence.

**Independent Test**: Run generation twice with same inputs and verify stable deterministic outputs and persisted breakdown data.

### Tests for User Story 2

- [x] T019 [P] [US2] Add unit tests for deterministic scoring math/invariants in `packages/nuxt-layer-api/tests/unit/services/llm/deterministic-scoring.test.ts`
- [x] T020 [P] [US2] Add integration test for extract/map scoring success path in `packages/nuxt-layer-api/tests/integration/services/vacancy-generate-two-step.test.ts`
- [x] T021 [P] [US2] Add integration test for non-blocking scoring fallback with breakdown defaults in `packages/nuxt-layer-api/tests/integration/services/vacancy-generate-fallback-score.test.ts`

### Implementation for User Story 2

- [x] T022 [US2] Add domain-agnostic signal/evidence Zod schemas in `packages/nuxt-layer-api/server/services/llm/generate.ts` and/or `packages/schema/schemas/generation.ts`
- [x] T023 [US2] Create deterministic scorer utility module in `packages/nuxt-layer-api/server/services/llm/scoring/index.ts`
- [x] T024 [US2] Refactor scoring prompts for `extractSignals` and `mapEvidence` in `packages/nuxt-layer-api/server/services/llm/prompts/generate-score.ts`
- [x] T025 [US2] Implement scoring pipeline orchestration in `packages/nuxt-layer-api/server/services/llm/generate.ts`
- [x] T026 [US2] Persist score breakdown on generation records in `packages/nuxt-layer-api/server/data/repositories/generation.ts` and `packages/nuxt-layer-api/server/api/vacancies/[id]/generate.post.ts`
- [x] T027 [US2] Update usage/cost logging compatibility for scoring pipeline in `packages/nuxt-layer-api/server/utils/usage.ts` and `packages/nuxt-layer-api/server/services/llm/index.ts`

**Checkpoint**: Scoring is deterministic, explainable, and persisted for audits.

---

## Phase 5: User Story 3 - Admin Strategy and Retry Configurability (Priority: P2)

**Goal**: Admin can manage strategy + adaptation retry in grouped routing UI (`/llm/routing` and `/roles/[id]`) with persistent defaults/overrides.

**Independent Test**: Save strategy/retry at global and role level, reload both pages, and verify runtime resolution honors saved values.

### Tests for User Story 3

- [x] T028 [P] [US3] Extend routing API integration test for strategy fields in `packages/nuxt-layer-api/tests/integration/services/admin-llm-routing-api.test.ts`
- [x] T029 [P] [US3] Add integration test for role override strategy precedence in `packages/nuxt-layer-api/tests/integration/services/llm-routing-resolution.test.ts`

### Implementation for User Story 3

- [x] T030 [US3] Extend admin routing API layer for strategy payload mapping in `apps/admin/layers/llm/app/infrastructure/admin-llm-routing.api.ts`
- [x] T031 [US3] Extend admin routing store and composables for strategy state in `apps/admin/layers/llm/app/stores/admin-llm-routing.ts` and `apps/admin/layers/llm/app/composables/useAdminLlmRouting.ts`
- [x] T032 [US3] Extend grouped card component to edit strategy and adaptation retry without layout shift in `apps/admin/layers/llm/app/components/routing/Card.vue`
- [x] T033 [US3] Apply grouped strategy controls on `/llm/routing` in `apps/admin/layers/llm/app/pages/llm/routing.vue`
- [x] T034 [US3] Reuse grouped controls on `/roles/[role]` overrides in `apps/admin/layers/roles/app/components/item/Scenarios.vue` and `apps/admin/layers/roles/app/pages/roles/[role].vue`
- [x] T035 [US3] Add/adjust i18n labels for strategy and adaptation retry fields in `apps/admin/i18n/locales/en.json`

**Checkpoint**: Admin can configure defaults and role overrides for strategy/retry end-to-end.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final consistency, docs, and regression validation.

- [x] T036 [P] Update API docs for strategy and scoring breakdown behavior in `docs/api/endpoints.md` and `docs/api/schemas.md`
- [x] T037 [P] Update architecture/security notes for strategy routing and deterministic scoring in `docs/architecture/security-privacy.md` and `docs/architecture/data-flow.md`
- [x] T038 [P] Update LLM service docs for strategy workflow in `packages/nuxt-layer-api/server/services/llm/README.md`
- [x] T039 Run `pnpm typecheck` and capture outcomes in `specs/010-resume-generation-strategies/quickstart.md`
- [x] T040 Run `pnpm --filter @int/api test` and capture outcomes in `specs/010-resume-generation-strategies/quickstart.md`
- [x] T041 Run admin+site manual smoke (`/llm/routing`, `/roles/[id]`, `/vacancies/[id]/overview`) and record outcomes in `specs/010-resume-generation-strategies/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: starts immediately.
- **Foundational (Phase 2)**: depends on Setup; blocks all user stories.
- **US1 (Phase 3)**: depends on Foundational.
- **US2 (Phase 4)**: depends on US1 strategy resolution + Foundational schema baseline.
- **US3 (Phase 5)**: depends on Foundational routing schema/repository support.
- **Polish (Phase 6)**: depends on all story phases.

### User Story Dependencies

- **US1 (P1)**: independent after Foundational.
- **US2 (P1)**: depends on US1 generation orchestration.
- **US3 (P2)**: independent after Foundational, but runtime validation benefits from US1.

### Within Each User Story

- Tests should fail before implementation changes.
- Schema/repository updates before endpoint/UI wiring.
- Runtime behavior before doc updates.

### Parallel Opportunities

- T004, T005, T009, T010 can run in parallel after T003.
- T011 and T012 can run in parallel.
- T019, T020, and T021 can run in parallel.
- T028 and T029 can run in parallel.
- T036, T037, and T038 can run in parallel.
- T039 and T040 can run in parallel.

---

## Parallel Example: User Story 1

```bash
Task: "Add strategy precedence integration test in packages/nuxt-layer-api/tests/integration/services/llm-routing-resolution.test.ts"
Task: "Add generation strategy selection integration test in packages/nuxt-layer-api/tests/integration/services/llm-scenario-selection.test.ts"
```

## Parallel Example: User Story 2

```bash
Task: "Add unit tests for deterministic scoring math in packages/nuxt-layer-api/tests/unit/services/llm/deterministic-scoring.test.ts"
Task: "Add integration test for scoring fallback in packages/nuxt-layer-api/tests/integration/services/vacancy-generate-fallback-score.test.ts"
```

## Parallel Example: User Story 3

```bash
Task: "Extend routing API integration test for strategy fields in packages/nuxt-layer-api/tests/integration/services/admin-llm-routing-api.test.ts"
Task: "Add role override strategy precedence test in packages/nuxt-layer-api/tests/integration/services/llm-routing-resolution.test.ts"
```

---

## Implementation Strategy

### MVP First (US1 only)

1. Complete Phases 1-2.
2. Complete Phase 3 (US1).
3. Validate generation behavior independently before proceeding.

### Incremental Delivery

1. Deliver strategy-aware generation (US1).
2. Deliver deterministic scoring + persistence (US2).
3. Deliver admin strategy/retry configurability (US3).
4. Run cross-cutting validation gates (Phase 6).

### Parallel Team Strategy

1. Engineer A: schema/migrations/runtime strategy resolution (Phases 2-4).
2. Engineer B: admin routing UX/store updates (Phase 5).
3. Engineer C: tests/docs/regression validation (Phases 4-6).
