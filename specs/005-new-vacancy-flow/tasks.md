# Tasks: Vacancy Detail Page Restructuring

**Input**: Design documents from `/specs/005-new-vacancy-flow/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/
**Documentation Gate**: Read and follow `docs/codestyle/base.md` before any code changes.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4, US5)
- Include exact file paths in descriptions

## Path Conventions

- **Schema layer**: `packages/schema/` (package: @int/schema)
- **API layer**: `packages/nuxt-layer-api/` (package: @int/api)
- **Vacancy layer**: `apps/site/layers/vacancy/`
- **i18n**: `apps/site/i18n/`

---

## Phase 1: Setup (Schema & Migration)

**Purpose**: Add VacancyStatus enum and database migration - foundation for all user stories

- [x] T001 [P] Add `VACANCY_STATUS_MAP` and `VACANCY_STATUS_VALUES` to `packages/schema/constants/enums.ts`
- [x] T002 [P] Add `VacancyStatusSchema` and `VacancyStatus` type to `packages/schema/schemas/enums.ts`
- [x] T003 Update `VacancySchema` to include status field in `packages/schema/schemas/vacancy.ts`
- [x] T004 Export new types from `packages/schema/index.ts`
- [x] T005 Create DB migration to add status column in `packages/nuxt-layer-api/server/database/migrations/`
- [x] T006 Update Drizzle schema in `packages/nuxt-layer-api/server/database/schema/vacancy.ts`
- [x] T007 Run migration and verify status column exists with default 'created'

---

## Phase 2: Foundational (API & Store Updates)

**Purpose**: API and store infrastructure that MUST be complete before UI work

**⚠️ CRITICAL**: No user story UI work can begin until this phase is complete

- [x] T008 Update `PUT /api/vacancies/:id` to handle status field in `packages/nuxt-layer-api/server/api/vacancies/[id].put.ts`
- [x] T009 Update `POST /api/generations` to auto-set status to 'generated' on first generation in `packages/nuxt-layer-api/server/api/generations/index.post.ts`
- [x] T010 Add `updateVacancyStatus` action to `apps/site/layers/vacancy/app/stores/index.ts`
- [x] T011 [P] Create status color utility in `apps/site/layers/vacancy/app/utils/statusColors.ts`
- [x] T012 [P] Create available statuses utility in `apps/site/layers/vacancy/app/utils/availableStatuses.ts`
- [x] T013 [P] Add vacancy status i18n keys to `apps/site/i18n/locales/en.json`

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Navigation & Routing (Priority: P1) 🎯 MVP

**Goal**: Restructure `/vacancies/[id]` into sub-pages with layout wrapper and redirect

**Independent Test**: Navigate to `/vacancies/[id]` → redirects to `/vacancies/[id]/overview`, breadcrumbs work, dropdown shows all sections

### Implementation for User Story 1

- [x] T014 [P] [US1] Create `VacancyDetailBreadcrumbs.vue` component using UBreadcrumb in `apps/site/layers/vacancy/app/components/detail/Breadcrumbs.vue`
- [x] T015 [P] [US1] Create `VacancyDetailNavDropdown.vue` component using UDropdownMenu in `apps/site/layers/vacancy/app/components/detail/NavDropdown.vue`
- [x] T016 [US1] Create `VacancyDetailHeader.vue` thin header component in `apps/site/layers/vacancy/app/components/detail/Header.vue`
- [x] T017 [US1] Modify `/vacancies/[id].vue` to be layout wrapper with header in `apps/site/layers/vacancy/app/pages/vacancies/[id].vue`
- [x] T018 [US1] Create redirect page `/vacancies/[id]/index.vue` that redirects to overview in `apps/site/layers/vacancy/app/pages/vacancies/[id]/index.vue`
- [x] T019 [P] [US1] Add navigation i18n keys to `apps/site/i18n/locales/en.json`

**Checkpoint**: User Story 1 complete - routing and navigation structure works

---

## Phase 4: User Story 2 - Overview Page (Priority: P1)

**Goal**: Create new overview page with redesigned layout showing vacancy details, status, and actions

**Independent Test**: Navigate to `/vacancies/[id]/overview` → shows title, status badge, actions, description, conditional blocks (MatchScore, Notes)

### Implementation for User Story 2

- [x] T020 [US2] Create `/vacancies/[id]/overview.vue` page extracting view logic from current `[id].vue` in `apps/site/layers/vacancy/app/pages/vacancies/[id]/overview.vue`
- [x] T021 [US2] Implement title row with company name, position (smaller font), edit/delete icon buttons in overview.vue
- [x] T022 [US2] Implement meta row with Last Updated, Vacancy page link (conditional), status badge in overview.vue
- [x] T023 [US2] Implement actions row with Generate Tailored Resume and Generate Cover Letter buttons in overview.vue
- [x] T024 [US2] Implement conditional Match Score block (only if generation exists) in overview.vue
- [x] T025 [US2] Implement conditional Expires block (generation expiry) in overview.vue
- [x] T026 [US2] Implement Description and Notes (conditional) blocks in overview.vue
- [x] T027 [US2] Integrate inline edit mode (VacancyForm) toggle in overview.vue
- [x] T028 [P] [US2] Add overview i18n keys to `apps/site/i18n/locales/en.json`

**Checkpoint**: User Story 2 complete - overview page fully functional

---

## Phase 5: User Story 3 - Status Tracking (Priority: P1)

**Goal**: Implement clickable status badge with dropdown for manual status changes and contextual options

**Independent Test**: Click status badge → dropdown shows valid options based on generation existence, select status → updates immediately with correct color

### Implementation for User Story 3

- [x] T029 [US3] Create `VacancyStatusBadge.vue` with UBadge + UDropdownMenu in `apps/site/layers/vacancy/app/components/StatusBadge.vue`
- [x] T030 [US3] Implement status color mapping in StatusBadge (neutral, primary, warning, error, success, violet)
- [x] T031 [US3] Implement contextual options logic based on generation history in StatusBadge
- [x] T032 [US3] Connect status badge to store action for immediate API update
- [x] T033 [US3] Add toast notification on status change success/failure
- [x] T034 [US3] Integrate StatusBadge into overview.vue meta row

**Checkpoint**: User Story 3 complete - status tracking works end-to-end

---

## Phase 6: User Story 4 - Resume Sub-Page with Auto-Save (Priority: P2)

**Goal**: Create resume editing sub-page with ResumeEditorLayout and auto-save via debounced watcher

**Independent Test**: Navigate to `/vacancies/[id]/resume` → loads generation content, edit → auto-saves after 2000ms, undo/redo works

### Implementation for User Story 4

- [x] T035 [US4] Create `useVacancyGeneration.ts` composable with watchDebounced auto-save in `apps/site/layers/vacancy/app/composables/useVacancyGeneration.ts`
- [x] T036 [US4] Create `/vacancies/[id]/resume.vue` page with ResumeEditorLayout in `apps/site/layers/vacancy/app/pages/vacancies/[id]/resume.vue`
- [x] T037 [US4] Remove Back/Cancel/Save header from resume sub-page (clean layout)
- [x] T038 [US4] Integrate undo/redo controls in footer of resume.vue
- [x] T039 [US4] Implement auto-save toast feedback (saving indicator, success, error)
- [x] T040 [US4] Update generation after successful resume generation to redirect to resume sub-page

**Checkpoint**: User Story 4 complete - resume editing with auto-save works

---

## Phase 7: User Story 5 - Placeholder Pages (Priority: P3)

**Goal**: Create Cover and Preparation placeholder pages with "Coming soon" message

**Independent Test**: Navigate to `/vacancies/[id]/cover` and `/vacancies/[id]/preparation` → shows "Coming soon" with consistent header

### Implementation for User Story 5

- [x] T041 [P] [US5] Create `/vacancies/[id]/cover.vue` placeholder page in `apps/site/layers/vacancy/app/pages/vacancies/[id]/cover.vue`
- [x] T042 [P] [US5] Create `/vacancies/[id]/preparation.vue` placeholder page in `apps/site/layers/vacancy/app/pages/vacancies/[id]/preparation.vue`
- [x] T043 [P] [US5] Add placeholder i18n keys to `apps/site/i18n/locales/en.json`

**Checkpoint**: User Story 5 complete - all four sub-pages accessible

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final cleanup, styling, and validation

- [x] T044 Remove old vacancy detail page code that's now in overview.vue
- [x] T045 Final styling pass for thin header (height, spacing, responsive)
- [x] T046 Verify all breadcrumb links work correctly
- [x] T047 Verify dropdown highlights current section
- [x] T048 Verify mobile layout works (same dropdown menu)
- [x] T049 Run quickstart.md validation scenarios
- [x] T050 Code cleanup: remove unused imports and dead code

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies - can start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 completion - BLOCKS all UI work
- **Phases 3-7 (User Stories)**: All depend on Phase 2 completion
  - US1 (Navigation) should complete first (provides layout for other pages)
  - US2-US5 can proceed after US1
- **Phase 8 (Polish)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (Navigation)**: Can start after Phase 2 - No dependencies on other stories
- **US2 (Overview)**: Depends on US1 (needs layout wrapper)
- **US3 (Status)**: Depends on US2 (StatusBadge integrates into overview)
- **US4 (Resume)**: Depends on US1 (needs layout wrapper)
- **US5 (Placeholders)**: Depends on US1 (needs layout wrapper)

### Within Each User Story

- Components before pages (breadcrumbs, dropdown before header)
- Layout wrapper before sub-pages
- Core implementation before integration
- i18n keys in parallel with implementation

### Parallel Opportunities

**Phase 1**:

- T001, T002 can run in parallel (different files)

**Phase 2**:

- T011, T012, T013 can run in parallel (utilities and i18n)

**US1**:

- T014, T015 can run in parallel (different components)

**US5**:

- T041, T042, T043 can ALL run in parallel (completely independent)

---

## Parallel Example: Phase 2 Foundational

```bash
# After T008-T010 complete, launch utilities and i18n together:
Task: "Create status color utility in apps/site/layers/vacancy/app/utils/statusColors.ts"
Task: "Create available statuses utility in apps/site/layers/vacancy/app/utils/availableStatuses.ts"
Task: "Add vacancy status i18n keys to apps/site/i18n/en.json"
```

## Parallel Example: User Story 1

```bash
# Launch breadcrumbs and nav dropdown components together:
Task: "Create VacancyDetailBreadcrumbs.vue in apps/site/layers/vacancy/app/components/detail/Breadcrumbs.vue"
Task: "Create VacancyDetailNavDropdown.vue in apps/site/layers/vacancy/app/components/detail/NavDropdown.vue"
```

---

## Implementation Strategy

### MVP First (US1 + US2 + US3)

1. Complete Phase 1: Setup (schema & migration)
2. Complete Phase 2: Foundational (API & store)
3. Complete Phase 3: US1 - Navigation & Routing
4. Complete Phase 4: US2 - Overview Page
5. Complete Phase 5: US3 - Status Tracking
6. **STOP and VALIDATE**: Test navigation, overview, status changes
7. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Schema ready
2. Add US1 (Navigation) → Routing works
3. Add US2 (Overview) → Overview page complete
4. Add US3 (Status) → Status tracking complete → **MVP READY!**
5. Add US4 (Resume) → Auto-save editing works
6. Add US5 (Placeholders) → All pages accessible
7. Polish → Production ready

### Single Developer Strategy

Execute phases sequentially:

1. Phase 1 → Phase 2 → US1 → US2 → US3 → MVP
2. Then: US4 → US5 → Phase 8

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- All i18n keys should use the structure defined in spec.md
- Follow BEM naming for new components (vacancy-detail-header, vacancy-status-badge, etc.)
- No `any` types - use proper types from @int/schema
