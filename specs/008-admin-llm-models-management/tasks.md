# Tasks: 008 - Admin LLM Model Catalog and Scenario Routing

**Input**: Design documents from `/specs/008-admin-llm-models-management/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/
**Documentation Gate**: Read and follow `docs/codestyle/base.md` before any code changes. Also read:

- `docs/architecture/README.md`
- `docs/api/endpoints.md`
- `docs/api/schemas.md`
- `docs/architecture/security-privacy.md`

**Tests**: Included. The spec explicitly requires unit/integration/e2e coverage for resolver and
admin endpoints.

**Organization**: Tasks are grouped by user story for independent implementation and testing.

## User Stories

- **US1 (P1)**: Admin model catalog CRUD (`/llm/models`)
- **US2 (P2)**: Admin scenario routing + role overrides (`/llm/routing`)
- **US3 (P3)**: Runtime model resolution by scenario/role in parse/generate workflows
- **US4 (P4)**: BYOK removal and platform-only cleanup across API/admin/site

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Parallelizable (different files, no dependency on incomplete tasks)
- **[Story]**: User story label (US1..US4)
- Every task includes file path(s)

---

## Phase 1: Setup (Shared Contracts and Baseline)

**Purpose**: Prepare shared schema contracts and translations used by all stories.

- [x] T001 [P] Add LLM model schemas (`LlmModelSchema`, create/update inputs, status enum) in `packages/schema/schemas/llm-model.ts` (package: `@int/schema`)
- [x] T002 [P] Add LLM routing schemas (`LlmScenarioKey`, routing assignment, override payloads) in `packages/schema/schemas/llm-routing.ts` (package: `@int/schema`)
- [x] T003 Extend shared enums/types for scenario keys and model status in `packages/schema/constants/enums.ts` and `packages/schema/schemas/enums.ts` (package: `@int/schema`)
- [x] T004 Export new schemas from `packages/schema/index.ts` (package: `@int/schema`) and add admin i18n namespace skeleton for LLM pages in `apps/admin/i18n/locales/en.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core DB, repositories, and shared API foundations required before all user stories.

**CRITICAL**: No user story work starts before this phase is complete.

- [x] T005 Update DB schema with new LLM tables and BYOK removals in `packages/nuxt-layer-api/server/data/schema.ts` (package: `@int/api`): add `llm_models`, `llm_scenarios`, `llm_scenario_models`, `llm_role_scenario_overrides`; remove `llm_keys`; remove `role_settings.byok_enabled`
- [x] T006 Generate and adjust migration files in `packages/nuxt-layer-api/server/data/migrations/` and update `packages/nuxt-layer-api/server/data/migrations/meta/_journal.json` (package: `@int/api`) for new tables, seeds, BYOK removals
- [x] T007 [P] Implement model catalog repository in `packages/nuxt-layer-api/server/data/repositories/llm-model.ts` (package: `@int/api`)
- [x] T008 [P] Implement routing repository in `packages/nuxt-layer-api/server/data/repositories/llm-routing.ts` (package: `@int/api`)
- [x] T009 Export new repositories and remove llm-key export in `packages/nuxt-layer-api/server/data/repositories/index.ts` (package: `@int/api`)
- [x] T010 Add startup seed logic for required scenario keys and baseline models in migration SQL under `packages/nuxt-layer-api/server/data/migrations/` (package: `@int/api`)
- [x] T011 [P] Add shared runtime resolver helper for scenario/role lookup in `packages/nuxt-layer-api/server/services/llm/routing.ts` (package: `@int/api`)
- [x] T012 Wire resolver helper into service barrel imports in `packages/nuxt-layer-api/server/services/llm/index.ts` (package: `@int/api`) without changing endpoint behavior yet

**Checkpoint**: DB + repositories + resolver foundation are ready.

---

## Phase 3: User Story 1 - Admin Model Catalog CRUD (Priority: P1) 🎯 MVP

**Goal**: Super admin can list/create/update/deactivate provider models on `/llm/models`.

**Independent Test**: As `super_admin`, open `/llm/models`, create a model, edit pricing/flags,
deactivate model, reload page, and verify persisted changes.

### Tests for User Story 1

- [x] T013 [P] [US1] Add integration tests for model repository CRUD in `packages/nuxt-layer-api/tests/integration/services/llm-model-repository.test.ts` (package: `@int/api`)
- [x] T014 [P] [US1] Add endpoint tests for model CRUD auth/validation in `packages/nuxt-layer-api/tests/integration/services/admin-llm-models-api.test.ts` (package: `@int/api`)

### Implementation for User Story 1

- [x] T015 [US1] Implement `GET`/`POST` model endpoints in `packages/nuxt-layer-api/server/api/admin/llm/models/index.get.ts` and `packages/nuxt-layer-api/server/api/admin/llm/models/index.post.ts` (package: `@int/api`)
- [x] T016 [US1] Implement `PUT`/`DELETE` model endpoints in `packages/nuxt-layer-api/server/api/admin/llm/models/[id].put.ts` and `packages/nuxt-layer-api/server/api/admin/llm/models/[id].delete.ts` (package: `@int/api`)
- [x] T017 [P] [US1] Add admin client API layer for model CRUD in `packages/nuxt-layer-api/app/infrastructure/admin-llm-models.api.ts` (package: `@int/api`)
- [x] T018 [P] [US1] Add model composable/store in `packages/nuxt-layer-api/app/composables/useAdminLlmModels.ts` and `packages/nuxt-layer-api/app/stores/admin-llm-models.ts` (package: `@int/api`)
- [x] T019 [US1] Implement admin model page in `apps/admin/app/pages/llm/models.vue` (admin app) with table/form actions for CRUD
- [x] T020 [US1] Add navigation links for model page in `apps/admin/app/layouts/default.vue`, quick action button in `apps/admin/app/pages/index.vue`, and labels/messages in `apps/admin/i18n/locales/en.json`

**Checkpoint**: Model catalog CRUD fully works from admin UI.

---

## Phase 4: User Story 2 - Scenario Routing and Role Overrides (Priority: P2)

**Goal**: Super admin can set scenario default model and per-role overrides on `/llm/routing`.

**Independent Test**: As `super_admin`, open `/llm/routing`, set default for `resume_parse`,
override for `friend`, reload page, and verify settings persist.

### Tests for User Story 2

- [x] T021 [P] [US2] Add endpoint tests for routing read/update/delete in `packages/nuxt-layer-api/tests/integration/services/admin-llm-routing-api.test.ts` (package: `@int/api`)
- [x] T022 [P] [US2] Add repository tests for precedence data retrieval in `packages/nuxt-layer-api/tests/integration/services/llm-routing-repository.test.ts` (package: `@int/api`)

### Implementation for User Story 2

- [x] T023 [US2] Implement routing read/default update endpoints in `packages/nuxt-layer-api/server/api/admin/llm/routing/index.get.ts` and `packages/nuxt-layer-api/server/api/admin/llm/routing/[scenarioKey]/default.put.ts` (package: `@int/api`)
- [x] T024 [US2] Implement role override endpoints in `packages/nuxt-layer-api/server/api/admin/llm/routing/[scenarioKey]/roles/[role].put.ts` and `packages/nuxt-layer-api/server/api/admin/llm/routing/[scenarioKey]/roles/[role].delete.ts` (package: `@int/api`)
- [x] T025 [P] [US2] Add admin client routing API layer in `packages/nuxt-layer-api/app/infrastructure/admin-llm-routing.api.ts` (package: `@int/api`)
- [x] T026 [P] [US2] Add routing composable/store in `packages/nuxt-layer-api/app/composables/useAdminLlmRouting.ts` and `packages/nuxt-layer-api/app/stores/admin-llm-routing.ts` (package: `@int/api`)
- [x] T027 [US2] Implement routing page in `apps/admin/app/pages/llm/routing.vue` and add page-specific i18n keys in `apps/admin/i18n/locales/en.json`

**Checkpoint**: Admin routing configuration works independently from runtime parse/generate wiring.

---

## Phase 5: User Story 3 - Runtime Scenario/Role Model Resolution (Priority: P3)

**Goal**: Parse/generate operations resolve model from DB routing (role override > scenario default >
provider fallback).

**Independent Test**: Configure routing in admin, call parse and generate flows for two roles, verify
runtime selects expected model and falls back safely when mapping is missing/inactive.

### Tests for User Story 3

- [x] T028 [P] [US3] Add resolver precedence unit tests in `packages/nuxt-layer-api/tests/integration/services/llm-routing-resolution.test.ts` (package: `@int/api`)
- [x] T029 [P] [US3] Add parse/generate integration tests with scenario mapping in `packages/nuxt-layer-api/tests/integration/services/llm-scenario-selection.test.ts` (package: `@int/api`)

### Implementation for User Story 3

- [x] T030 [US3] Extend LLM request options with scenario key and platform-only execution path in `packages/nuxt-layer-api/server/services/llm/types.ts` and `packages/nuxt-layer-api/server/services/llm/index.ts` (package: `@int/api`)
- [x] T031 [US3] Apply scenario keys inside LLM workflows in `packages/nuxt-layer-api/server/services/llm/parse.ts` and `packages/nuxt-layer-api/server/services/llm/generate.ts` (package: `@int/api`)
- [x] T032 [US3] Update parse/generate endpoints to use new runtime options in `packages/nuxt-layer-api/server/api/resume/index.post.ts`, `packages/nuxt-layer-api/server/api/resumes/index.post.ts`, and `packages/nuxt-layer-api/server/api/vacancies/[id]/generate.post.ts` (package: `@int/api`)
- [x] T033 [US3] Refactor OpenAI/Gemini providers to keep hardcoded pricing as fallback only in `packages/nuxt-layer-api/server/services/llm/providers/openai.ts` and `packages/nuxt-layer-api/server/services/llm/providers/gemini.ts` (package: `@int/api`)
- [x] T034 [US3] Recompute usage cost from model catalog pricing where available in `packages/nuxt-layer-api/server/services/llm/index.ts` and ensure logging path remains in `packages/nuxt-layer-api/server/utils/usage.ts` (package: `@int/api`)
- [x] T035 [US3] Sync generated contracts/types with runtime payloads in `packages/schema/schemas/llm-model.ts`, `packages/schema/schemas/llm-routing.ts`, and `packages/schema/index.ts` (package: `@int/schema`)

**Checkpoint**: Runtime model selection is DB-driven and deterministic.

---

## Phase 6: User Story 4 - BYOK Removal and Platform-Only Cleanup (Priority: P4)

**Goal**: Remove BYOK functionality from API/runtime/admin/site and keep platform-only behavior.

**Independent Test**: No `/api/keys/*` endpoints available, no BYOK controls in admin/site UI, parse/
generate still work with platform keys, admin usage view no longer exposes active BYOK dimension.

### Tests for User Story 4

- [x] T036 [P] [US4] Replace BYOK-focused integration coverage by platform-only tests in `packages/nuxt-layer-api/tests/integration/services/limits.test.ts` and remove obsolete assertions in `packages/nuxt-layer-api/tests/integration/services/byok-keys.test.ts` (package: `@int/api`)

### Implementation for User Story 4

- [x] T037 [US4] Remove llm key schema exports and BYOK-specific role field from shared schemas in `packages/schema/schemas/llm-key.ts`, `packages/schema/schemas/role-settings.ts`, and `packages/schema/index.ts` (package: `@int/schema`)
- [x] T038 [US4] Remove key repository and key endpoints in `packages/nuxt-layer-api/server/data/repositories/llm-key.ts`, `packages/nuxt-layer-api/server/api/keys/index.get.ts`, `packages/nuxt-layer-api/server/api/keys/index.post.ts`, and `packages/nuxt-layer-api/server/api/keys/[id].delete.ts` (package: `@int/api`)
- [x] T039 [US4] Remove BYOK client layer in `packages/nuxt-layer-api/app/infrastructure/keys.api.ts`, `packages/nuxt-layer-api/app/stores/keys.ts`, and `packages/nuxt-layer-api/app/composables/useKeys.ts` (package: `@int/api`)
- [x] T040 [US4] Remove BYOK toggle from admin role management in `packages/nuxt-layer-api/server/api/admin/roles/[role].put.ts`, `packages/nuxt-layer-api/server/data/repositories/role-settings.ts`, `apps/admin/layers/roles/app/pages/roles/[role].vue`, and `apps/admin/layers/roles/app/components/RoleCard.vue`
- [x] T041 [US4] Remove BYOK profile UI from `apps/site/layers/profile/app/pages/settings.vue` and `apps/site/layers/profile/app/components/KeyManager.vue`
- [x] T042 [US4] Normalize admin usage provider view to platform-only in `packages/nuxt-layer-api/server/api/admin/usage/index.get.ts`, `packages/nuxt-layer-api/server/data/repositories/usage-log.ts`, `packages/nuxt-layer-api/app/infrastructure/admin-system.api.ts`, and `apps/admin/layers/system/app/components/UsageStats.vue`, with copy updates in `apps/admin/i18n/locales/en.json`

**Checkpoint**: BYOK path is removed end-to-end.

---

## Phase 7: Polish and Cross-Cutting Concerns

**Purpose**: Documentation sync, quality gates, and end-to-end validation.

- [x] T043 [P] Update API docs for new admin LLM routes and removed BYOK routes in `docs/api/endpoints.md`
- [x] T044 [P] Update schema docs for model/routing entities and role-settings changes in `docs/api/schemas.md`
- [x] T045 [P] Update architecture/security docs for platform-only model in `docs/architecture/security-privacy.md`
- [x] T046 Run full typecheck from repo root with `pnpm typecheck` and fix any errors in touched files
- [x] T047 Run automated tests (`pnpm test`) and targeted integration checks for `@int/api`
- [x] T048 Run e2e/smoke validation for admin pages and parse/generate flows (`pnpm e2e` or targeted specs under `tests/e2e/`) and verify acceptance criteria from `specs/008-admin-llm-models-management/spec.md`

---

## Dependencies and Execution Order

### Phase dependencies

- **Phase 1 (Setup)**: starts immediately
- **Phase 2 (Foundational)**: depends on Phase 1 and blocks all user stories
- **Phase 3 (US1)**: depends on Phase 2
- **Phase 4 (US2)**: depends on Phase 2, best after US1 APIs are stable
- **Phase 5 (US3)**: depends on Phase 2 and benefits from US2 routing endpoints
- **Phase 6 (US4)**: depends on Phase 2; should land after US3 runtime refactor to avoid merge churn
- **Phase 7 (Polish)**: depends on all story phases

### User story dependencies

- **US1**: independent after foundational
- **US2**: independent after foundational, but UI integration assumes nav/i18n work from US1
- **US3**: depends on routing entities from US2 for full validation
- **US4**: can start after foundational but safest after US3 runtime branch changes

### Parallel opportunities

- T001 and T002 can run in parallel
- T007 and T008 can run in parallel
- T017 and T018 can run in parallel
- T025 and T026 can run in parallel
- T028 and T029 can run in parallel
- T043, T044, and T045 can run in parallel

---

## Parallel Example: User Story 1

```bash
# Parallel backend/client preparation for model catalog:
T017 "Add admin model API infrastructure in packages/nuxt-layer-api/app/infrastructure/admin-llm-models.api.ts"
T018 "Add model composable/store in packages/nuxt-layer-api/app/composables/useAdminLlmModels.ts and packages/nuxt-layer-api/app/stores/admin-llm-models.ts"
```

## Parallel Example: User Story 2

```bash
# Parallel routing client state wiring:
T025 "Add routing API infrastructure in packages/nuxt-layer-api/app/infrastructure/admin-llm-routing.api.ts"
T026 "Add routing composable/store in packages/nuxt-layer-api/app/composables/useAdminLlmRouting.ts and packages/nuxt-layer-api/app/stores/admin-llm-routing.ts"
```

## Parallel Example: User Story 3

```bash
# Parallel coverage for resolver behavior:
T028 "Add resolver precedence tests in packages/nuxt-layer-api/tests/integration/services/llm-routing-resolution.test.ts"
T029 "Add parse/generate scenario selection tests in packages/nuxt-layer-api/tests/integration/services/llm-scenario-selection.test.ts"
```

## Parallel Example: User Story 4

```bash
# Parallel BYOK client/server removal:
T038 "Remove server keys repo/endpoints in packages/nuxt-layer-api/server/data/repositories/llm-key.ts and packages/nuxt-layer-api/server/api/keys/*"
T039 "Remove client keys layers in packages/nuxt-layer-api/app/infrastructure/keys.api.ts, stores/keys.ts, composables/useKeys.ts"
```

---

## Implementation Strategy

### MVP first (US1 only)

1. Finish Phases 1-2.
2. Deliver Phase 3 (US1 model catalog CRUD).
3. Validate independently with super-admin workflow.

### Incremental delivery

1. Add US2 routing UI/API.
2. Add US3 runtime resolver integration.
3. Add US4 BYOK removal cleanup.
4. Run Phase 7 quality and documentation gates.

### Team parallelization

1. One engineer: DB/repositories/runtime (Phases 2 + 5).
2. One engineer: Admin UI/API (Phases 3 + 4).
3. One engineer: BYOK removal sweep + docs/tests (Phases 6 + 7).
