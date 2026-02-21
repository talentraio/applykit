# Tasks: 015 - Cover Letter Generation MVP

**Input**: Design documents from `/specs/015-cover-letter-generation/`
**Prerequisites**: plan.md (required), spec.md (required)
**Documentation Gate**: Follow `docs/codestyle/base.md` and relevant architecture/API docs.

**Tests**: Required. Include API/service tests and basic E2E smoke verification.

**Organization**: Tasks are grouped by user story for independent implementation and validation.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Parallelizable
- **[Story]**: User story label (`US1`, `US2`, `US3`)

---

## Phase 1: Setup & Foundations

- [ ] T001 Create feature docs (`spec.md`, `plan.md`, `tasks.md`) in `specs/015-cover-letter-generation/`
- [ ] T002 Add cover-letter contracts in `packages/schema/constants/enums.ts`, `packages/schema/schemas/cover-letter.ts`, `packages/schema/index.ts`
- [ ] T003 [P] Extend API DB schema with `cover_letters` in `packages/nuxt-layer-api/server/data/schema.ts`
- [ ] T004 Add migration for `cover_letters` table + cover scenario `response_format=json` adjustment in `packages/nuxt-layer-api/server/data/migrations/`
- [ ] T005 [P] Implement `coverLetterRepository` and export in `packages/nuxt-layer-api/server/data/repositories/`
- [ ] T006 [P] Extend API shared vacancy types for cover-letter payloads in `packages/nuxt-layer-api/types/vacancies.ts`

**Checkpoint**: Shared contracts + persistence ready.

---

## Phase 2: User Story 1 - Generate Cover Draft (Priority: P1) 🎯 MVP

**Goal**: Generate and persist cover letter/message from latest tailored resume + vacancy.

**Independent Test**: Call generate endpoint for a vacancy with generation and verify persisted cover output.

### Tests (US1)

- [ ] T007 [P] [US1] Add service/unit test for cover-letter JSON parsing/validation in `packages/nuxt-layer-api/tests/unit/services/llm/cover-letter.test.ts`
- [ ] T008 [P] [US1] Add integration test for generate endpoint behavior in `packages/nuxt-layer-api/tests/integration/services/vacancy-cover-letter-generate.test.ts`

### Implementation (US1)

- [ ] T009 [US1] Add cover-letter prompt pack in `packages/nuxt-layer-api/server/services/llm/prompts/cover-letter.ts`
- [ ] T010 [US1] Add cover-letter LLM service in `packages/nuxt-layer-api/server/services/llm/cover-letter.ts`
- [ ] T011 [US1] Implement `POST /api/vacancies/:id/cover-letter/generate` in `packages/nuxt-layer-api/server/api/vacancies/[id]/cover-letter/generate.post.ts`
- [ ] T012 [US1] Implement `GET /api/vacancies/:id/cover-letter` in `packages/nuxt-layer-api/server/api/vacancies/[id]/cover-letter.get.ts`

**Checkpoint**: Cover generation + fetch works end-to-end.

---

## Phase 3: User Story 2 - Edit and Persist Incrementally (Priority: P1)

**Goal**: User edits content/settings and changes persist through PATCH autosave.

**Independent Test**: PATCH existing cover letter and verify persisted result is returned by GET.

### Tests (US2)

- [ ] T013 [P] [US2] Add integration test for PATCH endpoint ownership/partial updates in `packages/nuxt-layer-api/tests/integration/services/vacancy-cover-letter-patch.test.ts`

### Implementation (US2)

- [ ] T014 [US2] Implement `PATCH /api/cover-letters/:id` in `packages/nuxt-layer-api/server/api/cover-letters/[id].patch.ts`
- [ ] T015 [US2] Add site client API methods in `apps/site/layers/vacancy/app/infrastructure/cover-letter.api.ts`
- [ ] T016 [US2] Extend vacancy store with cover-letter state/actions in `apps/site/layers/vacancy/app/stores/index.ts`
- [ ] T017 [US2] Replace cover placeholder page with MVP editor/preview flow in `apps/site/layers/vacancy/app/pages/vacancies/[id]/cover.vue`
- [ ] T018 [US2] Add i18n keys for cover page UX in `apps/site/i18n/locales/en.json`

**Checkpoint**: Edit/preview/autosave flow functional.

---

## Phase 4: User Story 3 - Copy and PDF Output (Priority: P2)

**Goal**: User can copy plain text and download cover-letter PDF from dedicated endpoints.

**Independent Test**: Prepare+download PDF for generated cover letter and open preview route.

### Tests (US3)

- [ ] T019 [P] [US3] Add integration tests for cover-letter PDF prepare/payload lifecycle in `packages/nuxt-layer-api/tests/integration/services/cover-letter-pdf-cache.test.ts`

### Implementation (US3)

- [ ] T020 [US3] Implement cover-letter PDF payload store in `packages/nuxt-layer-api/server/utils/cover-letter-pdf-store.ts`
- [ ] T021 [US3] Implement `/api/cover-letter/pdf/prepare`, `/payload`, `/file` in `packages/nuxt-layer-api/server/api/cover-letter/pdf/`
- [ ] T022 [US3] Implement cover-letter PDF preview route in `apps/site/layers/_base/app/pages/cover-letter/pdf/preview.vue`
- [ ] T023 [US3] Wire copy plain-text and PDF download actions in `apps/site/layers/vacancy/app/pages/vacancies/[id]/cover.vue`

**Checkpoint**: Output actions work end-to-end.

---

## Phase 5: Validation & Completion

- [ ] T024 Run `pnpm typecheck`
- [ ] T025 Run `pnpm lint`
- [ ] T026 Run relevant tests (`pnpm test` or targeted suites)
- [ ] T027 Run Playwright basic smoke for cover flow and record result
- [ ] T028 Mark completed tasks in this file with real status

---

## Implementation Strategy

1. Complete foundations and API contracts first.
2. Deliver generate + fetch (US1), then PATCH editing flow (US2).
3. Add dedicated cover-letter PDF export and final UI wiring (US3).
4. Run full validation and update task statuses.
