# Tasks: Extract Resume Format Settings into User-Level Entity

**Input**: Design documents from `/specs/006-resume-settings-refactoring/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/
**Documentation Gate**: Read and follow `docs/codestyle/base.md` before any code changes. Add
any other required docs (docs/architecture/\*, docs/api/\*, docs/codestyle/\*).

**Tests**: Not explicitly requested in spec. Test tasks omitted.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## User Stories

- **US1**: Settings persistence as user-level entity (schemas, DB, migration, API, seeding)
- **US2**: Format settings store + immediate save (client store, lazy loading, throttled PATCH)
- **US3**: Unified undo/redo history (tagged entries, type-dispatched save)
- **US4**: Resume layer integration (resume store, useResume, Preview, DownloadPdf)
- **US5**: Vacancy layer integration (vacancy store, useVacancyGeneration)

---

## Phase 1: Setup (Schemas)

**Purpose**: Create new Zod schemas in `@int/schema` — foundation for all subsequent work

- [x] T001 [P] Create new format settings schemas (`SpacingSettingsSchema`, `LocalizationSettingsSchema`, `ResumeFormatSettingsAtsSchema`, `ResumeFormatSettingsHumanSchema`, `UserFormatSettingsSchema`) with all inferred type exports in `packages/schema/schemas/format-settings.ts`. Also create `PatchFormatSettingsBodySchema` for PATCH validation (see `contracts/format-settings-api.md` for shape). Include deep-merge utility function `mergeFormatSettings` per research.md R4
- [x] T002 [P] Remove `ResumeFormatSettingsSchema` and its type export from `packages/schema/schemas/resume.ts`. Remove `atsSettings` and `humanSettings` fields from `ResumeSchema`. Keep `ResumeContentSchema` and all content-related schemas unchanged
- [x] T003 Update barrel exports in `packages/schema/index.ts` — add all new exports from `format-settings.ts`, remove old `ResumeFormatSettingsSchema` / `ResumeFormatSettings` exports

---

## Phase 2: Foundational (DB + API + Seeding)

**Purpose**: Server-side infrastructure that MUST be complete before any client-side work

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Add `userFormatSettings` Drizzle table definition in `packages/nuxt-layer-api/server/data/schema.ts` (package: `@int/api`). Fields: `id` (UUID PK), `userId` (UUID FK → users, UNIQUE, ON DELETE CASCADE), `ats` (JSONB NOT NULL), `human` (JSONB NOT NULL), `createdAt`, `updatedAt`. Remove `atsSettings` and `humanSettings` column definitions from `resumes` table
- [x] T005 Add `runtimeConfig.formatSettings.defaults` to `packages/nuxt-layer-api/nuxt.config.ts` (package: `@int/api`) with default values for both `ats` and `human` (each containing `spacing` + `localization` defaults per research.md R3)
- [x] T006 Generate Drizzle migration via `cd packages/nuxt-layer-api && pnpm db:generate`. Then manually edit the generated migration SQL to add data migration: INSERT INTO `user_format_settings` from `resumes` (most recently updated per user), seed defaults for users without settings. Migration must: (1) CREATE TABLE, (2) migrate data, (3) DROP COLUMN `ats_settings` and `human_settings` from `resumes`. See spec.md Migration plan and research.md R2
- [x] T007 Create format settings repository in `packages/nuxt-layer-api/server/data/repositories/format-settings.ts` (package: `@int/api`). Methods: `findByUserId(userId)`, `create(userId, settings)`, `update(userId, partialSettings)`, `seedDefaults(userId, defaults)`. Follow existing repository pattern (exported const object, async methods) per research.md R7
- [x] T008 [P] Create `GET /api/user/format-settings` endpoint in `packages/nuxt-layer-api/server/api/user/format-settings.get.ts` (package: `@int/api`). Require auth via `requireUserSession(event)`. Return `{ ats, human }` (without id/userId/timestamps). If no settings row exists, auto-seed from `runtimeConfig.formatSettings.defaults` and return. See contracts/format-settings-api.md
- [x] T009 [P] Create `PATCH /api/user/format-settings` endpoint in `packages/nuxt-layer-api/server/api/user/format-settings.patch.ts` (package: `@int/api`). Require auth. Validate body with `PatchFormatSettingsBodySchema`. Load existing settings from DB, deep-merge using `mergeFormatSettings`, validate merged result with `ResumeFormatSettingsAtsSchema`/`ResumeFormatSettingsHumanSchema`, save and return full settings. Return 422 on validation errors. See contracts/format-settings-api.md
- [x] T010 [P] Seed format settings on user creation — add `formatSettingsRepository.seedDefaults(userId, defaults)` call (with defaults from `useRuntimeConfig().formatSettings.defaults`) to all user creation paths: `packages/nuxt-layer-api/server/api/auth/register.post.ts` (after createWithPassword), `packages/nuxt-layer-api/server/routes/auth/google.ts` (after create/activateInvitedUser), `packages/nuxt-layer-api/server/routes/auth/linkedin.ts` (after create/activateInvitedUser). See research.md R1 for all 4 creation paths
- [x] T011 [P] Simplify resume API endpoints in `packages/nuxt-layer-api/` (package: `@int/api`): (1) `server/api/resumes/[id].put.ts` — remove `atsSettings`/`humanSettings` from body parsing, validation, and `resumeRepository.updateSettings()` call; (2) `server/api/resumes/[id].get.ts` — remove settings from response. Also remove `updateSettings` method from `packages/nuxt-layer-api/server/data/repositories/resume.ts` if no longer used
- [x] T012 Run DB migration via `cd packages/nuxt-layer-api && pnpm db:migrate`. Verify table created and data migrated correctly

**Checkpoint**: Server API fully functional — `GET` and `PATCH` endpoints work, seeding active, resume endpoints simplified

---

## Phase 3: User Story 1 — Format Settings Store + Immediate Save (Priority: P1)

**Goal**: Client-side Pinia store in `_base` layer that lazily fetches user settings and persists changes via throttled PATCH

**Independent Test**: Navigate to `/resume` → settings panel shows correct values from DB. Change a slider → value persists on page reload. Switch between ats/human → correct settings displayed.

- [x] T013 [US1] Create `useFormatSettingsStore` Pinia store in `apps/site/layers/_base/app/stores/format-settings.ts`. State: `ats: ResumeFormatSettingsAts`, `human: ResumeFormatSettingsHuman`, `previewType: PreviewType`, `loading: boolean`, `loaded: boolean`. Getters: `getCurrentSettings` (resolves ats/human based on previewType), `getAtsSettings`, `getHumanSettings`. Actions: `fetchSettings()` (GET call, lazy — skip if already loaded), `updateSettings(partial)` (immediate store update), `patchSettings(partial)` (throttled PATCH via `useThrottleFn` from `@vueuse/core` at 150ms per research.md R5), `setPreviewType(type)`. Use i18n keys for toast messages (`settings.save.success`, `settings.save.error`)

**Checkpoint**: Store can fetch, cache, update, and persist settings independently

---

## Phase 4: User Story 2 — Unified Undo/Redo History (Priority: P2)

**Goal**: Refactor `useResumeEditHistory` to use unified tagged history stack where Ctrl+Z undoes the most recent change regardless of type (content or settings)

**Independent Test**: Edit content → edit a setting → Ctrl+Z → setting reverts (not content). Ctrl+Z again → content reverts. Each undo triggers correct server save.

- [x] T014 [US2] Refactor `useResumeEditHistory` in `apps/site/layers/_base/app/composables/useResumeEditHistory.ts`. Changes: (1) Update `HistoryEntry` type to include `type: 'content' | 'settings'` tag alongside full snapshot of both content and settings. (2) On push: tag entry based on what changed (content or settings). (3) On undo/redo: restore full snapshot, dispatch to `saveContent()` for content entries (immediate PUT, cancel pending debounce) or `saveSettings()` for settings entries (immediate PATCH, bypass throttle). (4) Update `AutoSaveConfig` to accept `saveSettings` as required (no longer optional). (5) Keep existing debounced watcher for content auto-save detection. (6) Add settings change detection via store subscription or explicit push. See research.md R6 for architecture

**Checkpoint**: History composable works with tagged entries, dispatches correct save handlers

---

## Phase 5: User Story 3 — Resume Layer Integration (Priority: P3)

**Goal**: Resume page (`/resume`) works with the new settings architecture — settings come from format settings store, content editing unchanged

**Independent Test**: Navigate to `/resume` → preview renders with settings from DB. Edit content → auto-save works. Edit settings → throttled PATCH works. Undo → correct type reverts. Export PDF → correct settings used.

- [x] T015 [US3] Rewire resume store in `apps/site/layers/resume/app/stores/index.ts`. Remove: `atsSettings` and `humanSettings` from state, `DEFAULT_FORMAT_SETTINGS` constant, `currentSettings` getter, `updateSettings()` action, `saveSettings()` action. Remove settings loading from `fetchResume()` and `uploadResume()` actions. Keep all content-related state and actions unchanged
- [x] T016 [US3] Rewire `useResume` composable in `apps/site/layers/resume/app/composables/useResume.ts`. Source settings from `useFormatSettingsStore` instead of resume store. Wire `useResumeEditHistory` with: `getSettings: () => formatSettingsStore.currentSettings`, `setSettings: (s) => formatSettingsStore.updateSettings(s)`, `autoSave.saveSettings: () => formatSettingsStore.patchSettings(...)`. Ensure `fetchSettings()` is called on composable init (lazy load). Remove `updateSettings`, `saveSettings` from return value; expose format settings store's methods instead
- [x] T017 [P] [US3] Update Preview component in `apps/site/layers/resume/app/components/Preview/index.vue`. Change `settings` prop type from `Partial<ResumeFormatSettings>` to `ResumeFormatSettingsAts | ResumeFormatSettingsHuman`. Internally destructure `settings.spacing` to access marginX, marginY, fontSize, lineHeight, blockSpacing. Update the computed that provides default fallbacks
- [x] T018 [P] [US3] Update `DownloadPdf` component in `apps/site/layers/_base/app/components/base/DownloadPdf.vue`. Change `FormatSettings` / `FormatSettingsMap` types to use `ResumeFormatSettingsAts` / `ResumeFormatSettingsHuman`. Update `resolveSettings()` to destructure `spacing` when passing to PDF generation API. Ensure PDF export resolves correct type based on format (ats/human)

**Checkpoint**: `/resume` page fully functional — settings from shared store, content auto-save works, undo/redo works, PDF export works

---

## Phase 6: User Story 4 — Vacancy Layer Integration (Priority: P4)

**Goal**: Vacancy page works with shared settings store — no more hardcoded defaults

**Independent Test**: Navigate to `/vacancies/:id` → preview renders with user's settings from DB. Switch ats/human → correct settings applied. Export PDF → correct settings used.

- [x] T019 [US4] Rewire vacancy store in `apps/site/layers/vacancy/app/stores/index.ts`. Remove: `atsSettings` and `humanSettings` from state, `DEFAULT_FORMAT_SETTINGS` constant, `currentSettings` getter, `updateSettings()` action. Remove settings initialization from state factory. Keep all generation/vacancy-related state unchanged
- [x] T020 [US4] Rewire `useVacancyGeneration` composable in `apps/site/layers/vacancy/app/composables/useVacancyGeneration.ts`. Source settings from `useFormatSettingsStore` instead of vacancy store. Wire `useResumeEditHistory` with: `getSettings: () => formatSettingsStore.currentSettings`, `setSettings: (s) => formatSettingsStore.updateSettings(s)`, `autoSave.saveSettings: () => formatSettingsStore.patchSettings(...)`. Ensure `fetchSettings()` is called on composable init (lazy load)

**Checkpoint**: `/vacancies/:id` page fully functional — settings from shared store, generation editing works

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, type safety verification, cleanup

- [x] T021 [P] Update API documentation in `docs/api/endpoints.md` — add `GET /api/user/format-settings` and `PATCH /api/user/format-settings`; update `PUT /api/resumes/:id` and `GET /api/resumes/:id` to reflect removed settings fields
- [x] T022 [P] Update schema documentation in `docs/api/schemas.md` — add `SpacingSettings`, `LocalizationSettings`, `ResumeFormatSettingsAts`, `ResumeFormatSettingsHuman`, `UserFormatSettings` entities; note removal of `ResumeFormatSettings`
- [x] T023 [P] Update architecture documentation in `docs/architecture/data-flow.md` — add `UserFormatSettings` entity to core entities section; document settings lazy-loading flow; note separation from resume entity
- [x] T024 [P] Add i18n keys for settings save feedback — add `settings.save.success`, `settings.save.error` to i18n message files in relevant locale files
- [x] T025 Run typecheck `cd apps/site && pnpm vue-tsc --noEmit` and fix any remaining type errors across all layers
- [x] T026 Superseded by `/specs/014-multiple-base-resumes/` (settings migrated back to per-resume model). Validation covered by e2e smoke on current architecture: `tests/e2e/resume-modals.smoke.spec.ts` and `tests/e2e/resume-settings-history.spec.ts`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 (schemas must exist for DB table types and API validation)
- **US1 (Phase 3)**: Depends on Phase 2 (API endpoints must exist for store to call)
- **US2 (Phase 4)**: Depends on Phase 3 (store must exist for history to reference)
- **US3 (Phase 5)**: Depends on Phase 4 (history composable must be refactored before resume wiring)
- **US4 (Phase 6)**: Depends on Phase 3 + Phase 4 (store + history must exist). Can run in parallel with US3
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (Store)**: Depends only on Phase 2 — no dependencies on other stories
- **US2 (History)**: Depends on US1 — needs format settings store for settings getter/setter
- **US3 (Resume)**: Depends on US2 — needs refactored history composable
- **US4 (Vacancy)**: Depends on US1 + US2 — needs store + history; can run in parallel with US3
- **US5 (Polish)**: Depends on US3 + US4

### Within Each Phase

- Tasks marked [P] can run in parallel
- T001 and T002 can run in parallel (different files)
- T008, T009, T010, T011 can run in parallel (different endpoint files)
- T017 and T018 can run in parallel (different component files)
- T021, T022, T023, T024 can run in parallel (different doc files)

### Parallel Opportunities

```
Phase 1:  T001 ──┐
          T002 ──┼── T003
                 │
Phase 2:  T004 → T005 → T006 → T007 ──┐
                                       ├── T012
          T008 ─────────────────────────┤
          T009 ─────────────────────────┤
          T010 ─────────────────────────┤
          T011 ─────────────────────────┘

Phase 3:  T013

Phase 4:  T014

Phase 5:  T015 → T016 ──┐
          T017 ──────────┤  (parallel)
          T018 ──────────┘

Phase 6:  T019 → T020

Phase 7:  T021 ──┐
          T022 ──┤  (parallel)
          T023 ──┤
          T024 ──┘── T025 → T026
```

---

## Implementation Strategy

### MVP First (US1 + US2 Only)

1. Complete Phase 1: Schemas
2. Complete Phase 2: DB + API + Seeding
3. Complete Phase 3: Format Settings Store
4. Complete Phase 4: Unified History
5. **STOP and VALIDATE**: Store works, PATCH saves, undo/redo dispatches correctly

### Incremental Delivery

1. Schemas + DB + API → Server foundation ready
2. Add US1 (Store) → Settings fetched and persisted → Validate
3. Add US2 (History) → Undo/redo works → Validate
4. Add US3 (Resume) → `/resume` page fully rewired → Validate
5. Add US4 (Vacancy) → `/vacancies/:id` fully rewired → Validate
6. Polish → Docs, typecheck, final verification

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
