# Tasks: 011 - Lightweight Score + On-Demand Detailed Scoring

**Input**: Design documents from `/specs/011-detailed-scoring-modes/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/
**Documentation Gate**: Read and follow `docs/codestyle/base.md` before any code changes. Also read:

- `docs/architecture/README.md`
- `docs/api/README.md`
- `docs/codestyle/README.md`

**Tests**: Included. The spec requires unit/integration/UI-smoke coverage for baseline scoring,
detailed scoring on-demand flow, and admin routing overrides.

**Organization**: Tasks are grouped by user story for independent implementation and testing.

## User Stories

- **US1 (P1)**: Fast generation with lightweight baseline score
- **US2 (P1)**: On-demand detailed scoring with reuse/regenerate behavior
- **US3 (P2)**: Admin management of dedicated detailed scoring scenario

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Parallelizable (different files, no dependency on incomplete tasks)
- **[Story]**: User story label (US1..US3)
- Every task includes file path(s)

---

## Phase 1: Setup (Shared Dependencies and Docs)

**Purpose**: Align docs/contracts and prepare implementation baseline.

- [x] T001 Verify clarified requirements in `specs/011-detailed-scoring-modes/spec.md` and align terminology across `Details` / `Regenerate details`
- [x] T002 [P] Validate plan and contract consistency in `specs/011-detailed-scoring-modes/plan.md` and `specs/011-detailed-scoring-modes/contracts/detailed-scoring-api.yaml`
- [x] T003 [P] Confirm existing regeneration-availability source of truth in `apps/site/layers/vacancy/app/stores/index.ts` for reuse in detailed-score gating

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared schema, persistence, and routing foundations required by all user stories.

**⚠️ CRITICAL**: No user story work starts before this phase is complete.

- [x] T004 Add dedicated scenario enum key in `packages/schema/constants/enums.ts` and export updates in `packages/schema/index.ts` (package: `@int/schema`)
- [x] T005 [P] Extend enum validators in `packages/schema/schemas/enums.ts` for detailed scoring scenario key (package: `@int/schema`)
- [x] T006 [P] Extend routing schemas in `packages/schema/schemas/llm-routing.ts` for detailed scoring scenario support (package: `@int/schema`)
- [x] T007 Add detailed scoring payload schema in `packages/schema/schemas/generation.ts` and export via `packages/schema/index.ts` (package: `@int/schema`)
- [x] T008 Extend DB schema for detailed scoring persistence in `packages/nuxt-layer-api/server/data/schema.ts` (package: `@int/api`)
- [x] T009 Create migration for detailed scoring persistence in `packages/nuxt-layer-api/server/data/migrations/` and migration journal (package: `@int/api`)
- [x] T010 [P] Implement repository for detailed scoring persistence in `packages/nuxt-layer-api/server/data/repositories/generation-score-detail.ts` and export from `packages/nuxt-layer-api/server/data/repositories/index.ts` (package: `@int/api`)
- [x] T011 [P] Extend routing resolver support for new scenario key in `packages/nuxt-layer-api/server/services/llm/routing.ts` and `packages/nuxt-layer-api/server/data/repositories/llm-routing.ts` (package: `@int/api`)
- [x] T012 Add API typing for detailed scoring payload in `packages/nuxt-layer-api/types/vacancies.ts` (package: `@int/api`)

**Checkpoint**: Shared contracts, persistence, and routing are ready for story implementation.

---

## Phase 3: User Story 1 - Fast Generation with Baseline Score (Priority: P1) 🎯 MVP

**Goal**: Generation remains fast and always returns baseline `before/after` scores without mandatory detailed scoring run.

**Independent Test**: Generate from `/vacancies/[id]/overview`, confirm generation succeeds with baseline
scores and no detailed-scoring dependency.

### Tests for User Story 1

- [x] T013 [P] [US1] Add integration test for baseline-only generation contract in `packages/nuxt-layer-api/tests/integration/services/vacancy-generate-baseline-score.test.ts`
- [x] T014 [P] [US1] Add unit tests for lightweight baseline score invariants in `packages/nuxt-layer-api/tests/unit/services/llm/baseline-scoring.test.ts`

### Implementation for User Story 1

- [x] T015 [US1] Refactor generation orchestration to baseline-score path in `packages/nuxt-layer-api/server/services/llm/generate.ts`
- [x] T016 [US1] Add/adjust baseline scoring utility in `packages/nuxt-layer-api/server/services/llm/scoring/index.ts`
- [x] T017 [US1] Update generation endpoint mapping in `packages/nuxt-layer-api/server/api/vacancies/[id]/generate.post.ts`
- [x] T018 [US1] Ensure generation repository write path remains baseline-compatible in `packages/nuxt-layer-api/server/data/repositories/generation.ts`
- [x] T019 [US1] Keep usage logging consistent for baseline mode in `packages/nuxt-layer-api/server/services/llm/index.ts` and `packages/nuxt-layer-api/server/utils/usage.ts`
- [x] T020 [US1] Update vacancy overview data assembly to keep existing score rendering stable in `packages/nuxt-layer-api/server/api/vacancies/[id]/overview.get.ts`
- [x] T021 [US1] Verify site overview/resume pages remain contract-compatible in `apps/site/layers/vacancy/app/pages/vacancies/[id]/overview.vue` and `apps/site/layers/vacancy/app/pages/vacancies/[id]/resume.vue`

**Checkpoint**: Fast generation path works independently with baseline score fields.

---

## Phase 4: User Story 2 - On-Demand Detailed Scoring (Priority: P1)

**Goal**: Eligible users can run/view detailed scoring on demand, with default reuse and gated regeneration.

**Independent Test**: Click `Details` on resume page -> sync endpoint returns details and redirects to
preparation; repeated click reuses existing; `Regenerate details` appears only when vacancy text changed.

### Tests for User Story 2

- [x] T022 [P] [US2] Add integration test for details endpoint reuse flow in `packages/nuxt-layer-api/tests/integration/services/vacancy-score-details-reuse.test.ts`
- [x] T023 [P] [US2] Add integration test for regenerate gate condition in `packages/nuxt-layer-api/tests/integration/services/vacancy-score-details-regenerate-gate.test.ts`
- [x] T024 [P] [US2] Add integration test for preparation payload with/without details in `packages/nuxt-layer-api/tests/integration/services/vacancy-preparation-details.test.ts`

### Implementation for User Story 2

- [x] T025 [US2] Implement detailed scoring orchestration service in `packages/nuxt-layer-api/server/services/llm/score-details.ts`
- [x] T026 [US2] Reuse scoring extraction/mapping utilities in `packages/nuxt-layer-api/server/services/llm/scoring/` and prompt modules under `packages/nuxt-layer-api/server/services/llm/prompts/`
- [x] T027 [US2] Implement sync endpoint `POST /score-details` in `packages/nuxt-layer-api/server/api/vacancies/[id]/generations/[generationId]/score-details.post.ts`
- [x] T028 [US2] Implement preparation read endpoint enrichment in `packages/nuxt-layer-api/server/api/vacancies/[id]/preparation.get.ts`
- [x] T029 [US2] Add repository read-through/upsert logic in `packages/nuxt-layer-api/server/data/repositories/generation-score-detail.ts`
- [x] T030 [US2] Add client API methods in `apps/site/layers/vacancy/app/infrastructure/generation.api.ts` and `apps/site/layers/vacancy/app/infrastructure/vacancy.api.ts`
- [x] T031 [US2] Add store actions/state for details and regenerate in `apps/site/layers/vacancy/app/stores/index.ts`
- [x] T032 [US2] Implement `Details` and `Regenerate details` UX states in `apps/site/layers/vacancy/app/pages/vacancies/[id]/resume.vue`
- [x] T033 [US2] Render detailed payload and empty/error states in `apps/site/layers/vacancy/app/pages/vacancies/[id]/preparation.vue`

**Checkpoint**: Detailed scoring flow works independently end-to-end.

---

## Phase 5: User Story 3 - Admin Detailed Scoring Scenario Management (Priority: P2)

**Goal**: Admin manages default and role override model routing for dedicated detailed scoring scenario.

**Independent Test**: Save detailed scoring model in `/llm/routing`, override in `/roles/[id]`, and verify runtime resolver precedence.

### Tests for User Story 3

- [x] T034 [P] [US3] Add integration test for new scenario key resolution precedence in `packages/nuxt-layer-api/tests/integration/services/llm-routing-resolution.test.ts`
- [x] T035 [P] [US3] Add admin routing API integration test for detailed scenario default/override in `packages/nuxt-layer-api/tests/integration/services/admin-llm-routing-api.test.ts`

### Implementation for User Story 3

- [x] T036 [US3] Extend admin routing validation/handlers for detailed scenario in `packages/nuxt-layer-api/server/api/admin/llm/routing/index.get.ts`, `packages/nuxt-layer-api/server/api/admin/llm/routing/[scenarioKey]/default.put.ts`, and `packages/nuxt-layer-api/server/api/admin/llm/routing/[scenarioKey]/roles/[role].put.ts`
- [x] T037 [US3] Extend admin routing infra and store mapping in `apps/admin/layers/llm/app/infrastructure/admin-llm-routing.api.ts`, `apps/admin/layers/llm/app/stores/admin-llm-routing.ts`, and `apps/admin/layers/llm/app/composables/useAdminLlmRouting.ts`
- [x] T038 [US3] Add dedicated scenario card config in `apps/admin/layers/llm/app/pages/llm/routing.vue` and `apps/admin/layers/llm/app/components/routing/Scenarios/index.vue`
- [x] T039 [US3] Apply role override UI for detailed scenario in `apps/admin/layers/roles/app/components/item/Scenarios.vue` and `apps/admin/layers/roles/app/pages/roles/[role].vue`
- [x] T040 [US3] Add i18n labels/messages for detailed scenario and regenerate semantics in `apps/admin/i18n/locales/en.json` and corresponding site locales if needed
- [x] T041 [US3] Ensure role eligibility exposure for `Details` CTA is driven by runtime-resolved scenario config in `apps/site/layers/vacancy/app/stores/index.ts` and relevant API payloads

**Checkpoint**: Admin can manage dedicated detailed scoring scenario defaults and overrides end-to-end.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final validation, docs sync, and regression safety.

- [x] T042 [P] Update API documentation in `docs/api/endpoints.md` and `docs/api/schemas.md` for baseline/detailed split
- [x] T043 [P] Update LLM service notes in `packages/nuxt-layer-api/server/services/llm/README.md`
- [x] T044 [P] Update architecture notes for scoring flow in `docs/architecture/data-flow.md` and `docs/architecture/security-privacy.md`
- [x] T045 Run validation commands (`pnpm typecheck`, `pnpm lint`, targeted tests) and record results in `specs/011-detailed-scoring-modes/quickstart.md`
- [x] T046 Run manual smoke on `/vacancies/[id]/resume`, `/vacancies/[id]/preparation`, `/llm/routing`, `/roles/[id]` and record outcomes in `specs/011-detailed-scoring-modes/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: starts immediately.
- **Foundational (Phase 2)**: depends on Setup; blocks all user stories.
- **US1 (Phase 3)**: depends on Foundational.
- **US2 (Phase 4)**: depends on US1 baseline generation contract stability + Foundational.
- **US3 (Phase 5)**: depends on Foundational routing/schema updates.
- **Polish (Phase 6)**: depends on all story phases.

### User Story Dependencies

- **US1 (P1)**: independent after Foundational.
- **US2 (P1)**: depends on US1 baseline response stability.
- **US3 (P2)**: independent after Foundational, but runtime verification benefits from US2 endpoint availability.

### Within Each User Story

- Tests should be added before implementation changes and validated against expected behavior.
- Schemas/repositories before endpoint/UI wiring.
- Runtime logic before docs and smoke verification.

### Parallel Opportunities

- T005, T006, T010, and T011 can run in parallel after T004.
- T013 and T014 can run in parallel.
- T022, T023, and T024 can run in parallel.
- T034 and T035 can run in parallel.
- T042, T043, and T044 can run in parallel.

---

## Parallel Example: User Story 2

```bash
Task: "Add integration test for details endpoint reuse flow in packages/nuxt-layer-api/tests/integration/services/vacancy-score-details-reuse.test.ts"
Task: "Add integration test for regenerate gate condition in packages/nuxt-layer-api/tests/integration/services/vacancy-score-details-regenerate-gate.test.ts"
Task: "Add integration test for preparation payload in packages/nuxt-layer-api/tests/integration/services/vacancy-preparation-details.test.ts"
```

## Parallel Example: User Story 3

```bash
Task: "Add integration test for new scenario key resolution in packages/nuxt-layer-api/tests/integration/services/llm-routing-resolution.test.ts"
Task: "Add admin routing API integration test in packages/nuxt-layer-api/tests/integration/services/admin-llm-routing-api.test.ts"
```

---

## Implementation Strategy

### MVP First (US1 only)

1. Complete Phases 1-2.
2. Complete Phase 3 (US1).
3. Validate generation independently before moving forward.

### Incremental Delivery

1. Deliver fast baseline generation score (US1).
2. Deliver on-demand detailed scoring flow (US2).
3. Deliver admin detailed scenario management (US3).
4. Run cross-cutting validation and docs sync (Phase 6).

### Parallel Team Strategy

1. Engineer A: schema/persistence/runtime APIs (Phases 2-4).
2. Engineer B: site UI integration (Phase 4).
3. Engineer C: admin routing and role override UX (Phase 5).
4. Engineer D: tests/docs/regressions (Phases 3-6).
