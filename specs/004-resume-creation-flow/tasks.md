# Tasks: Resume Creation Flow Refactoring

**Input**: Design documents from `/specs/004-resume-creation-flow/`
**Prerequisites**: plan.md, spec.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, etc.)
- Include exact file paths in descriptions

## Path Conventions (Nuxt Monorepo)

- **Schema package**: `packages/schema/` (package: `@int/schema`)
- **API layer**: `packages/nuxt-layer-api/` (package: `@int/api`)
- **UI layer**: `packages/nuxt-layer-ui/` (package: `@int/ui`)
- **Resume layer**: `apps/site/layers/resume/` (alias: `@site/resume`)
- **Vacancy layer**: `apps/site/layers/vacancy/` (alias: `@site/vacancy`)

## User Stories

| Story | Description                        | Priority |
| ----- | ---------------------------------- | -------- |
| US1   | Single Resume with Version History | P1       |
| US2   | A4 Preview System (FlowCV-style)   | P1       |
| US3   | Resume Page (Upload/Edit/Settings) | P1       |
| US4   | Vacancy Page Enhancement           | P2       |
| US5   | Mobile Support                     | P2       |

---

## Phase 1: Setup (Foundational - BLOCKING)

**Purpose**: Schema, database, and API changes that block all user stories

- [x] T001 Add `ResumeFormatSettingsSchema` to `packages/schema/schemas/resume.ts` with margins, fontSize, lineHeight, blockSpacing fields
- [x] T002 Update `ResumeSchema` in `packages/schema/schemas/resume.ts` to include optional atsSettings and humanSettings
- [x] T003 [P] Export new types from `packages/schema/index.ts`
- [x] T004 Add `resume_versions` table to Drizzle schema in `packages/nuxt-layer-api/server/data/schema.ts`
- [x] T005 Update `resumes` table in `packages/nuxt-layer-api/server/data/schema.ts` with ats_settings and human_settings columns
- [x] T006 Create migration SQL in `packages/nuxt-layer-api/server/data/migrations/003_resume_versions.sql`
- [x] T007 Create `resumeVersionRepository` in `packages/nuxt-layer-api/server/data/repositories/resume-version.ts` with createVersion, getVersions, pruneOldVersions
- [x] T008 Update `resumeRepository` in `packages/nuxt-layer-api/server/data/repositories/resume.ts` to handle settings and single-resume-per-user constraint
- [x] T009 Add `runtimeConfig.resume.maxVersions` to `packages/nuxt-layer-api/nuxt.config.ts`

**Checkpoint**: Schema and database ready for new API endpoints

---

## Phase 2: User Story 1 - Single Resume API (Priority: P1)

**Goal**: Implement `/api/resumes` create/get/update endpoints with version history support

**Independent Test**: Can create resume, update with version history, settings persist

### Implementation for US1

- [x] T010 [US1] Create GET `/api/resumes/:id` endpoint in `packages/nuxt-layer-api/server/api/resumes/[id].get.ts` returning requested resume with settings
- [x] T011 [US1] Create POST `/api/resumes` endpoint in `packages/nuxt-layer-api/server/api/resumes/index.post.ts` for creating resume (file upload or JSON body)
- [x] T012 [US1] Create PUT `/api/resumes/:id` endpoint in `packages/nuxt-layer-api/server/api/resumes/[id].put.ts` for updating content/title with version creation
- [x] T013 [US1] Create PUT `/api/vacancies/[id]/generation` endpoint in `packages/nuxt-layer-api/server/api/vacancies/[id]/generation.put.ts` for updating generation content
- [x] T014 [US1] Remove legacy singular resume endpoints and migrate callers to `/api/resumes/*`
- [x] T015 [US1] [P] Add resume API i18n keys to `packages/nuxt-layer-ui/i18n/locales/en.json` (resume.error._, resume.success._)

**Checkpoint**: API endpoints functional, version history works

---

## Phase 3: User Story 2 - A4 Preview System (Priority: P1)

**Goal**: FlowCV-style A4 preview with zoom scaling and block-based pagination

**Independent Test**: Preview renders A4 pages with zoom scaling, pagination works with keep-with-next rules

### Implementation for US2

- [x] T016 [US2] Create BlockModel and PageModel types in `apps/site/layers/resume/app/types/preview.ts`
- [x] T017 [US2] Create `useResumeBlocks` composable in `apps/site/layers/resume/app/composables/useResumeBlocks.ts` converting ResumeContent to BlockModel[]
- [x] T018 [US2] Create `useBlockMeasurer` composable in `apps/site/layers/resume/app/composables/useBlockMeasurer.ts` for measuring block heights
- [x] T019 [US2] Create `usePaginator` composable in `apps/site/layers/resume/app/composables/usePaginator.ts` with greedy packing and keepWithNext rules
- [x] T020 [US2] Create `usePageScale` composable in `apps/site/layers/resume/app/composables/usePageScale.ts` using VueUse ResizeObserver
- [x] T021 [US2] Refactor `PaperSheet.vue` in `apps/site/layers/resume/app/components/Preview/PaperSheet.vue` for A4 container with zoom scaling and CSS variables
- [x] T022 [US2] Create `Paginator.vue` in `apps/site/layers/resume/app/components/Preview/Paginator.vue` rendering pages from PageModel[]
- [x] T023 [US2] Move and refactor AtsView to `apps/site/layers/resume/app/components/Preview/AtsView/Design1.vue`
- [x] T024 [US2] Move and refactor HumanView to `apps/site/layers/resume/app/components/Preview/HumanView/Design1.vue`
- [x] T025 [US2] Refactor Preview/index.vue in `apps/site/layers/resume/app/components/Preview/index.vue` to orchestrate blocks → paginator → pages with type and settings props
- [x] T026 [US2] Delete old vacancy preview components: `apps/site/layers/vacancy/app/components/resume/AtsView.vue`, `HumanView.vue`, `PaperSheet.vue`
- [x] T027 [US2] Update vacancy ATS/Human pages to use shared Preview components: `apps/site/layers/vacancy/app/pages/vacancies/[id]/ats.vue`, `human.vue`

**Checkpoint**: A4 preview renders with zoom scaling, pagination, supports both ATS and Human designs

---

## Phase 4: User Story 3 - Resume Page (Priority: P1)

**Goal**: New `/resume` page with upload, editor, settings tabs, and undo/redo

**Independent Test**: User can upload/create resume, edit with live preview, change settings, undo/redo works

### Store & Infrastructure for US3

- [x] T028 [US3] Refactor resume store in `apps/site/layers/resume/app/stores/index.ts` with new state (editingContent, previewType, settings, history, historyIndex, activeTab)
- [x] T029 [US3] Add undo/redo actions to resume store with history management
- [x] T030 [US3] Add auto-save with debounce using VueUse `watchDebounced` in resume store
- [x] T031 [US3] Create `useResume` composable in `apps/site/layers/resume/app/composables/useResume.ts` wrapping store for page use

### Components for US3

- [x] T032 [US3] Create `EditorLayout.vue` in `apps/site/layers/resume/app/components/EditorLayout.vue` with two-column layout (40%/60%), slots for header/left/right/footer
- [x] T033 [US3] Create `Upload/index.vue` in `apps/site/layers/resume/app/components/form/Upload/index.vue` with dropzone and "Create from scratch" button
- [x] T034 [US3] Create `Upload.vue` in `apps/site/layers/resume/app/components/modal/Upload.vue` wrapping Upload for "Upload new file" flow
- [x] T035 [US3] Create `Settings/index.vue` in `apps/site/layers/resume/app/components/Settings/index.vue` with preview type toggle, margins, fontSize, lineHeight, blockSpacing selectors
- [x] T036 [US3] Create `UndoRedoControls.vue` in `apps/site/layers/_base/app/components/base/UndoRedoControls.vue` with undo/redo buttons bound to store
- [x] T037 [US3] Create `TabAIEnhance.vue` placeholder in `apps/site/layers/resume/app/components/TabAIEnhance.vue` showing "Coming Soon"

### Page for US3

- [x] T038 [US3] Create new page `apps/site/layers/resume/app/pages/resume.vue` with conditional rendering: no resume → Upload, has resume → EditorLayout with tabs
- [x] T039 [US3] Delete old pages: `apps/site/layers/resume/app/pages/resumes/index.vue`, `new.vue`, `[id].vue`
- [x] T040 [US3] Add redirect from `/resumes` to `/resume` in `apps/site/nuxt.config.ts` or middleware
- [x] T041 [US3] Remove profile completion blocking from resume upload flow
- [x] T042 [US3] [P] Add resume page i18n keys to `packages/nuxt-layer-ui/i18n/locales/en.json` (resume.page._, resume.tabs._, resume.settings._, resume.upload._, resume.history.\*)

**Checkpoint**: /resume page functional with upload, editing, settings, undo/redo

---

## Phase 5: User Story 4 - Vacancy Page Enhancement (Priority: P2)

**Goal**: Two-column layout for vacancy page after generation, edit resume capability

**Independent Test**: After generation, vacancy shows two-column layout, can edit generated resume

### Store for US4

- [x] T043 [US4] Enhance vacancy store in `apps/site/layers/vacancy/app/stores/index.ts` with editingGenerationContent, generationHistory, generationHistoryIndex
- [x] T044 [US4] Add updateGenerationContent, undoGeneration, redoGeneration actions to vacancy store

### Components for US4

- [x] T045 [US4] Update vacancy detail page `apps/site/layers/vacancy/app/pages/vacancies/[id]/index.vue` with two-column layout using ResumeEditorLayout after generation
- [x] T046 [US4] Add "Edit Resume" button to vacancy detail that expands ResumeForm with generation.content
- [x] T047 [US4] Add preview type toggle (ATS/Human) to vacancy detail right column
- [x] T048 [US4] Add undo/redo controls for generation editing
- [x] T049 [US4] [P] Add vacancy detail i18n keys to `packages/nuxt-layer-ui/i18n/locales/en.json` (vacancy.detail.editResume, vacancy.detail.editVacancy)

**Checkpoint**: Vacancy page shows two-column layout after generation, can edit generated resume

---

## Phase 6: User Story 5 - Mobile Support (Priority: P2)

**Goal**: Mobile-friendly preview with float button and overlay

**Independent Test**: On mobile, float button shows, clicking opens full-screen preview overlay

### Components for US5

- [x] T050 [US5] Create `PreviewFloatButton.vue` in `apps/site/layers/resume/app/components/PreviewFloatButton.vue` - FAB bottom-right, visible only on mobile
- [x] T051 [US5] Create `PreviewOverlay.vue` in `apps/site/layers/resume/app/components/PreviewOverlay.vue` - full-screen preview with Download and Close buttons
- [x] T052 [US5] Update EditorLayout.vue to hide preview column on mobile (<1024px) and show PreviewFloatButton
- [x] T053 [US5] Integrate PreviewFloatButton and PreviewOverlay into `/resume` page
- [x] T054 [US5] Integrate PreviewFloatButton and PreviewOverlay into vacancy detail page
- [x] T055 [US5] [P] Add mobile preview i18n keys to `packages/nuxt-layer-ui/i18n/locales/en.json` (resume.preview.mobileButton, resume.preview.close)

**Checkpoint**: Mobile shows float button, preview overlay works on both /resume and vacancy pages

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final polish, navigation updates, PDF verification

- [x] T056 [P] Update default layout navigation to link to `/resume` instead of `/resumes` in `apps/site/app/layouts/default.vue`
- [x] T057 [P] Update dashboard links to `/resume` in `apps/site/layers/landing/app/pages/index.vue` if applicable
- [x] T058 Verify PDF export matches preview appearance - test with Playwright PDF generation
- [x] T059 [P] Add any missing i18n keys identified during implementation
- [x] T060 Run typecheck and lint, fix any issues
- [x] T061 Manual testing: complete happy path (upload → edit → settings → undo/redo → vacancy → generate → edit generation → PDF download)

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup/Foundational)
    ↓
Phase 2 (US1: API) ← BLOCKS Phase 3, 4
    ↓
Phase 3 (US2: Preview) ← BLOCKS Phase 4 (preview component needed)
    ↓
Phase 4 (US3: Resume Page) ← BLOCKS Phase 5
    ↓
Phase 5 (US4: Vacancy Enhancement)
    ↓
Phase 6 (US5: Mobile Support)
    ↓
Phase 7 (Polish)
```

### User Story Dependencies

| Story             | Priority | Depends On | Can Start After |
| ----------------- | -------- | ---------- | --------------- |
| US1 (API)         | P1       | Phase 1    | T009 complete   |
| US2 (Preview)     | P1       | US1        | T015 complete   |
| US3 (Resume Page) | P1       | US1, US2   | T027 complete   |
| US4 (Vacancy)     | P2       | US3        | T042 complete   |
| US5 (Mobile)      | P2       | US3, US4   | T049 complete   |

### Parallel Opportunities

**Phase 1:**

- T001, T002 can run sequentially (same file)
- T003 parallel after T001-T002
- T004, T005 can run together (same file)
- T007, T008 parallel after T004-T006

**Phase 3 (US2):**

- T016, T017, T018, T019, T020 can run in parallel (different files)
- T021, T022 depend on T016-T020
- T023, T024 parallel (different files)

**Phase 4 (US3):**

- T032, T033, T034, T035, T036, T037 parallel (different component files)
- T028, T029, T030 sequential (same store file)

---

## Implementation Strategy

### MVP (US1 + US2 + US3)

1. Complete Phase 1: Schema & Database
2. Complete US1: API Endpoints
3. Complete US2: A4 Preview System
4. Complete US3: Resume Page
5. **STOP and VALIDATE**: Full happy path on `/resume` page works
6. Deploy MVP

### Incremental Delivery

| Increment | Stories | Value Delivered                                         |
| --------- | ------- | ------------------------------------------------------- |
| MVP       | US1-US3 | Single resume page with A4 preview, settings, undo/redo |
| +Vacancy  | US4     | Enhanced vacancy page with generation editing           |
| +Mobile   | US5     | Mobile-friendly experience                              |
| +Polish   | Phase 7 | Navigation updates, final verification                  |

### Critical Path

```
T001-T009 → T010-T015 → T016-T027 → T028-T042 → MVP Complete
```

---

## Task Summary

| Phase                      | Tasks  | Parallel Tasks |
| -------------------------- | ------ | -------------- |
| Phase 1 (Setup)            | 9      | 3              |
| Phase 2 (US1: API)         | 6      | 1              |
| Phase 3 (US2: Preview)     | 12     | 6              |
| Phase 4 (US3: Resume Page) | 15     | 7              |
| Phase 5 (US4: Vacancy)     | 7      | 1              |
| Phase 6 (US5: Mobile)      | 6      | 1              |
| Phase 7 (Polish)           | 6      | 4              |
| **Total**                  | **61** | **23**         |

---

## Notes

- **SSR-friendly**: ATS/Human pages in vacancy remain SSR for SEO
- **VueUse**: Use `useResizeObserver`, `watchDebounced`, `useLocalStorage` where applicable
- **Component prefixes**: Resume layer uses `Resume` prefix, Vacancy layer uses `Vacancy` prefix
- **i18n**: All user-facing strings through i18n
- **Type safety**: No `any` types, strict TypeScript throughout
