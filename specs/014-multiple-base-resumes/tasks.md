# Tasks: Multiple Base Resumes

**Input**: Design documents from `/specs/014-multiple-base-resumes/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/resumes-api.md
**Documentation Gate**: Read and follow `docs/codestyle/base.md` before any code changes. Also read `docs/architecture/README.md` and `docs/api/README.md`.

**Tests**: Not explicitly requested in the specification. Test tasks are omitted.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Schema layer**: `packages/nuxt-layer-schema/` (package: `@int/schema`)
- **API layer**: `packages/nuxt-layer-api/` (package: `@int/api`)
- **UI layer**: `packages/nuxt-layer-ui/` (package: `@int/ui`)
- **Site resume layer**: `apps/site/layers/resume/`
- **Site vacancy layer**: `apps/site/layers/vacancy/`
- **Site base layer**: `apps/site/layers/_base/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Schema changes, migration, and Zod schemas that all user stories depend on.

- [x] T001 Add `name` column to `resumes` table and `defaultResumeId` column to `users` table in Drizzle schema at `packages/nuxt-layer-api/server/data/schema.ts`
- [x] T002 Add `resumeFormatSettings` table definition to Drizzle schema (kept deprecated `userFormatSettings` for build compat until Phase 2) at `packages/nuxt-layer-api/server/data/schema.ts`
- [x] T003 Generate Drizzle migration `0025_messy_exiles.sql` with data-migration SQL (backfill `name`, set `defaultResumeId`, copy `user_format_settings` to `resume_format_settings`). Drop deferred to Phase 2.
- [x] T004 [P] Add Zod schemas to `packages/schema/schemas/`: extended `ResumeSchema` with `name` and `isDefault`; added `ResumeListItemSchema`, `SetDefaultResumeRequestSchema`, `UpdateResumeNameSchema` in `resume.ts`; added `ResumeFormatSettingsSchema` in `format-settings.ts`
- [x] T005 [P] Update `UserRow` type and `normalizeUserRow` in user repository at `packages/nuxt-layer-api/server/data/repositories/user.ts` to include `defaultResumeId` in `baseSelectFields` and normalization

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Repository layer and core API endpoints that MUST be complete before ANY user story UI can be implemented.

**CRITICAL**: No user story work can begin until this phase is complete.

- [x] T006 Create `resume-format-settings` repository at `packages/nuxt-layer-api/server/data/repositories/resume-format-settings.ts` with methods: `findByResumeId()`, `create()`, `update()`, `seedDefaults()`, `duplicateFrom()`
- [x] T007 Extend resume repository at `packages/nuxt-layer-api/server/data/repositories/resume.ts` with methods: `duplicate()`, `updateName()`, `findListByUserId()`, `countByUserIdExact()`. Modify `create()` to accept optional `name` parameter
- [x] T008 Add `updateDefaultResumeId()` and `getDefaultResumeId()` methods to user repository at `packages/nuxt-layer-api/server/data/repositories/user.ts`
- [x] T009 [P] Implement `GET /api/resumes` (list resumes) at `packages/nuxt-layer-api/server/api/resumes/index.get.ts` — returns lightweight list sorted by default first then `createdAt DESC`, computing `isDefault` per contracts
- [x] T010 [P] Implement `GET /api/resumes/:id` (get resume by ID with ownership check) at `packages/nuxt-layer-api/server/api/resumes/[id].get.ts` — includes computed `isDefault`
- [x] T011 [P] Implement `POST /api/resumes/:id/duplicate` at `packages/nuxt-layer-api/server/api/resumes/[id]/duplicate.post.ts` — clones content + format settings, sets name to `copy <source.name>`, enforces 10-resume limit (409)
- [x] T012 [P] Implement `DELETE /api/resumes/:id` at `packages/nuxt-layer-api/server/api/resumes/[id].delete.ts` — prevents deletion of default resume (409), ownership check, cascades format settings via FK
- [x] T013 [P] Implement `PUT /api/resumes/:id/name` at `packages/nuxt-layer-api/server/api/resumes/[id]/name.put.ts` — validates 1-255 chars, ownership check
- [x] T014 [P] Implement `PUT /api/user/default-resume` at `packages/nuxt-layer-api/server/api/user/default-resume.put.ts` — validates resume exists and belongs to user, updates `users.default_resume_id`
- [x] T015 [P] Implement `GET /api/resumes/:id/format-settings` at `packages/nuxt-layer-api/server/api/resumes/[id]/format-settings.get.ts` — auto-seeds defaults if no settings exist
- [x] T016 [P] Implement `PATCH /api/resumes/:id/format-settings` at `packages/nuxt-layer-api/server/api/resumes/[id]/format-settings.patch.ts` — same deep-partial merge logic as former user format settings
- [x] T017 Align `GET /api/resumes/:id` at `packages/nuxt-layer-api/server/api/resumes/[id].get.ts` — return requested resume by ID with ownership check, include `name` and computed `isDefault` in response
- [x] T018 Modify `POST /api/resumes` at `packages/nuxt-layer-api/server/api/resumes/index.post.ts` — always create new resume (no upsert), auto-set as default if first resume, generate name from `dd.MM.yyyy`, enforce 10-resume limit, include `name` and `isDefault` in response
- [x] T019 Remove old format-settings endpoints: deleted `packages/nuxt-layer-api/server/api/user/format-settings.get.ts`, `format-settings.patch.ts`, `format-settings.put.ts`
- [x] T020 Deprecated old format-settings repository (kept for auth flows that seed user-level defaults). Added `@deprecated` JSDoc to `packages/nuxt-layer-api/server/data/repositories/format-settings.ts`
- [x] T021 Add new API methods to resume API client at `apps/site/layers/resume/app/infrastructure/resume.api.ts`: `fetchList()`, `fetchById()`, `duplicate()`, `deleteResume()`, `updateName()`, `setDefault()`, `fetchFormatSettings()`, `patchFormatSettings()`
- [x] T022 Refactor format-settings store at `apps/site/layers/_base/app/stores/format-settings.ts` to accept `resumeId` parameter in `fetchSettings()` and `patchSettings()`, change API paths from `/api/user/format-settings` to `/api/resumes/:id/format-settings` (later superseded by full removal of this `_base` store when settings were consolidated into resume store state)
- [x] T023 Refactor resume store at `apps/site/layers/resume/app/stores/index.ts`: add `activeResumeId` state, add `resumeList` state, fix `_upsertCachedResume()` for proper multi-resume cache, add actions: `fetchResumeList()`, `fetchResumeById()`, `duplicateResume()`, `deleteResume()`, `setDefaultResume()`, `updateResumeName()`
- [x] T024 Refactor `useResume` composable at `apps/site/layers/resume/app/composables/useResume.ts` to be resume-id-aware (use `activeResumeId` via `store.activeResume`), wire format settings to per-resume endpoints

**Checkpoint**: Foundation ready — all backend APIs operational, client infrastructure updated. User story UI implementation can now begin.

---

## Phase 3: User Story 1 — First-Time & Returning User Routing (Priority: P1) MVP

**Goal**: Users with no resumes see the upload page at `/resume`. Users with resumes are redirected to `/resume/[defaultResumeId]`. After first resume creation, user lands on `/resume/[id]`.

**Independent Test**: Navigate to `/resume` with no resumes → see upload form. Create first resume → redirected to `/resume/[id]`. Navigate to `/resume` again → redirected to `/resume/[defaultResumeId]`.

### Implementation for User Story 1

- [x] T025 [US1] Create dynamic route page at `apps/site/layers/resume/app/pages/resume/[id].vue` — loads specific resume by ID, sets `activeResumeId` in store, handles 404 with redirect to `/resume`
- [x] T026 [US1] Modify `/resume` page at `apps/site/layers/resume/app/pages/resume/index.vue` (moved from `resume.vue`) — if user has resumes, redirect to `/resume/[defaultResumeId]`. If no resumes, show `ResumeFormUpload` as currently
- [x] T027 [US1] Modify `POST /api/resumes` flow — post-upload and create-from-scratch navigate to `/resume/[newId]` in the client (server-side auto-default + name generation was done in T018)

**Checkpoint**: User Story 1 is functional — first resume creation, routing, and redirect all work.

---

## Phase 4: User Story 2 — Duplicate Resume (Priority: P1)

**Goal**: Users can duplicate the current resume. New resume gets name `copy <currentName>`, cloned content and format settings.

**Independent Test**: On `/resume/[id]`, click "Duplicate" → new resume created, navigated to `/resume/[newId]`, name is `copy <original>`, content is identical.

### Implementation for User Story 2

- [x] T028 [US2] Add duplicate button to editor tools at `apps/site/layers/resume/app/components/editor/Tools.vue` — placed left of "Clear and create new" button, emits `duplicate` event handled by `[id].vue`, shows success toast
- [x] T029 [US2] Add i18n keys `resume.page.duplicateResume`, `resume.page.resumeDuplicated`, `resume.page.selectResume`, `resume.page.defaultBadge` to locale files

**Checkpoint**: Duplicate flow works end-to-end.

---

## Phase 5: User Story 3 — Switch Between Resumes (Priority: P1)

**Goal**: When >1 resume exists, a selector below tabs allows switching between resumes. Auto-saves before switching.

**Independent Test**: Create 2+ resumes, selector appears below tabs, selecting another resume navigates to its page.

### Implementation for User Story 3

- [x] T030 [US3] Create resume selector component at `apps/site/layers/resume/app/components/editor/Selector.vue` — uses `USelectMenu` with `value-key="id"`, shows resume names, marks default with badge, on change navigates to `/resume/[selectedId]`
- [x] T031 [US3] Integrate `Selector.vue` into `/resume/[id].vue` page (above editor tools in left slot), conditionally rendered only when `resumeList.length > 1`
- [x] T032 [US3] Add i18n key `resume.page.selectResume` and `resume.page.defaultBadge` to locale files (combined with T029)

**Checkpoint**: Resume switching works, autosave flushes before navigation.

---

## Phase 6: User Story 4 — Set Default Resume (Priority: P2)

**Goal**: Users can mark any resume as default via a standalone toggle component.

**Independent Test**: On a non-default resume, click "Make default" → API updates, component shows disabled "This is the default resume" state.

### Implementation for User Story 4

- [x] T033 [US4] Create `DefaultToggle.vue` component at `apps/site/layers/resume/app/components/editor/DefaultToggle.vue` — standalone, accepts `resumeId` and `isDefault` props, shows "Make default" button or disabled "This is the default resume", calls `resumeStore.setDefaultResume()`, shows success toast
- [x] T034 [US4] Integrate `DefaultToggle.vue` into editor tools at `apps/site/layers/resume/app/components/editor/Tools.vue` — full-width, above action buttons row
- [x] T035 [US4] Add i18n keys `resume.page.makeDefault`, `resume.page.thisIsDefaultResume`, `resume.page.defaultResumeUpdated` to locale files

**Checkpoint**: Default toggle works, state reflects immediately in UI and selector.

---

## Phase 7: User Story 5 — Delete Non-Default Resume (Priority: P2)

**Goal**: Users can delete non-default resumes with modal confirmation.

**Independent Test**: On a non-default resume, delete button visible, click → modal confirmation → confirm → resume deleted, redirected to default resume.

### Implementation for User Story 5

- [x] T036 [US5] Create delete confirmation modal component at `apps/site/layers/resume/app/components/editor/modal/DeleteConfirm.vue` — programmatic overlay via `useProgrammaticOverlay`, confirm/cancel actions
- [x] T037 [US5] Add delete button (icon-only, leftmost in action row) to `apps/site/layers/resume/app/components/editor/Tools.vue` — only for non-default resumes, click opens delete confirmation modal, on confirm calls `resumeStore.deleteResume()` and navigates to `/resume/[defaultResumeId]`
- [x] T038 [US5] Add i18n keys `resume.page.deleteResume`, `resume.page.deleteResumeConfirmTitle`, `resume.page.deleteResumeConfirmDescription`, `resume.page.deleteResumeConfirmAction`, `resume.page.deleteResumeConfirmCancel`, `resume.page.resumeDeleted` to locale files

**Checkpoint**: Delete flow works end-to-end with modal confirmation.

---

## Phase 8: User Story 6 — Edit Resume Name (Priority: P2)

**Goal**: Users can edit resume name in the Settings tab, auto-saved on change.

**Independent Test**: Navigate to Settings tab, see "Resume name" input above Format Settings, edit name → auto-saved.

### Implementation for User Story 6

- [x] T039 [US6] Add "Resume name" text input above Format Settings section in the Settings tab component at `apps/site/layers/resume/app/components/editor/` (locate Settings tab template) — bind to resume name, wire auto-save via `resumeStore.updateResumeName()`
- [x] T040 [US6] Add i18n keys `resume.settings.resumeName`, `resume.settings.resumeNamePlaceholder` to locale files

**Checkpoint**: Resume name is editable and persisted.

---

## Phase 9: User Story 7 — Vacancy Generation Resume Picker (Priority: P2)

**Goal**: When user has >1 resume, Generate/Regenerate buttons show a dropdown to pick base resume before generation.

**Independent Test**: With >1 resume on vacancy page, click Generate → dropdown appears with resume list (default first) → select a resume → generation starts with that `resumeId`.

### Implementation for User Story 7

- [x] T041 [US7] Modify vacancy generate flow at `apps/site/layers/vacancy/app/components/Item/overview/Content/index.vue` — when >1 resume, replace direct generate with `UDropdownMenu` showing resume list, default resume first, on select call `vacancyStore.generateResume(vacancyId, { resumeId })`. When 1 resume, keep current behavior
- [x] T042 [US7] Add i18n key `vacancy.generation.selectBaseResume` to locale files

**Checkpoint**: Vacancy generation with resume picker works for multi-resume users.

---

## Phase 10: User Story 8 — "Clear and Create New" Adjusted (Priority: P3)

**Goal**: "Clear and create new" replaces current resume content without changing name or format settings. Resume stays on same page.

**Independent Test**: On `/resume/[id]`, click "Clear and create new" → upload → content replaced, name unchanged, format settings unchanged, still on same `/resume/[id]`.

### Implementation for User Story 8

- [x] T043 [US8] Verify and adjust "Clear and create new" flow in `apps/site/layers/resume/app/components/editor/Tools.vue` and related upload handler — ensure `replaceBaseData` does not modify `name` or format settings. Ensure user stays on `/resume/[id]` after upload (not redirected to `/resume`)

**Checkpoint**: Clear and create new works correctly in multi-resume context.

---

## Phase 11: Polish & Cross-Cutting Concerns

**Purpose**: Cleanup and cross-cutting concerns that affect multiple user stories.

- [x] T044 Verify `PUT /api/resumes/:id` remains the canonical update endpoint (no deprecation headers)
- [x] T045 Verify all new UI strings use i18n keys (audit all components created/modified in Phases 3-10)
- [x] T046 Verify format settings are independent per resume: create two resumes, change settings on one, confirm the other retains its own settings
- [x] T047 Run `pnpm --filter @int/api db:migrate` to apply migration and verify existing data migrated correctly (name backfilled, format settings copied, default resume set)
- [x] T048 Manual smoke test: run through all 9 user flows (UF-1 through UF-9) from spec.md and verify acceptance criteria AC-1 through AC-15

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup (Phase 1) completion — BLOCKS all user stories
- **User Stories (Phases 3-10)**: All depend on Foundational (Phase 2) completion
  - User stories can proceed in parallel (if desired) or sequentially in priority order
- **Polish (Phase 11)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: Routing — Can start after Foundational. No dependencies on other stories. **Required by US2-US8** (they all operate on `/resume/[id]` page).
- **US2 (P1)**: Duplicate — Depends on US1 (needs `/resume/[id]` page). Independent of US3-US8.
- **US3 (P1)**: Selector — Depends on US1 (needs `/resume/[id]` page). Independent of US2, US4-US8.
- **US4 (P2)**: Default toggle — Depends on US1. Independent of US2, US3, US5-US8.
- **US5 (P2)**: Delete — Depends on US1 and US4 (needs default toggle to determine non-default state). Otherwise independent.
- **US6 (P2)**: Name edit — Depends on US1. Independent of US2-US5, US7-US8.
- **US7 (P2)**: Vacancy picker — Depends on Foundational only (modifies vacancy layer, not resume layer pages). Independent of US1-US6.
- **US8 (P3)**: Clear and create new — Depends on US1. Independent of US2-US7.

### Recommended Execution Order

```
Phase 1 (Setup) → Phase 2 (Foundational) → US1 (routing) → US2 + US3 + US4 + US6 + US7 [parallel] → US5 (after US4) → US8 → Phase 11 (Polish)
```

### Within Each User Story

- Backend APIs complete (Phase 2) before UI tasks
- Store/infrastructure complete (Phase 2) before component tasks
- Component creation before integration into pages

### Parallel Opportunities

- **Phase 1**: T004 and T005 can run in parallel
- **Phase 2**: T009-T016 can all run in parallel (different API endpoint files). T019-T020 can run in parallel (removal of old files)
- **Phases 3-10**: US2, US3, US4, US6, US7 can all run in parallel after US1 is complete
- **Within stories**: i18n key tasks ([P]) can run in parallel with component creation

---

## Parallel Example: Foundational Phase

```bash
# Launch all API endpoint implementations in parallel (different files):
Task: "Implement GET /api/resumes in packages/nuxt-layer-api/server/api/resumes/index.get.ts"
Task: "Implement GET /api/resumes/:id in packages/nuxt-layer-api/server/api/resumes/[id].get.ts"
Task: "Implement POST /api/resumes/:id/duplicate in packages/nuxt-layer-api/server/api/resumes/[id]/duplicate.post.ts"
Task: "Implement DELETE /api/resumes/:id in packages/nuxt-layer-api/server/api/resumes/[id].delete.ts"
Task: "Implement PUT /api/resumes/:id/name in packages/nuxt-layer-api/server/api/resumes/[id]/name.put.ts"
Task: "Implement PUT /api/user/default-resume in packages/nuxt-layer-api/server/api/user/default-resume.put.ts"
Task: "Implement GET /api/resumes/:id/format-settings in packages/nuxt-layer-api/server/api/resumes/[id]/format-settings.get.ts"
Task: "Implement PATCH /api/resumes/:id/format-settings in packages/nuxt-layer-api/server/api/resumes/[id]/format-settings.patch.ts"
```

## Parallel Example: User Stories After US1

```bash
# After US1 is complete, launch these in parallel:
Task: "US2 — Add duplicate button to editor Tools.vue"
Task: "US3 — Create resume Selector.vue component"
Task: "US4 — Create DefaultToggle.vue component"
Task: "US6 — Add resume name input to Settings tab"
Task: "US7 — Modify vacancy generate flow for resume picker"
```

---

## Implementation Strategy

### MVP First (US1 Only)

1. Complete Phase 1: Setup (schema + migration + Zod)
2. Complete Phase 2: Foundational (repos + APIs + client infra)
3. Complete Phase 3: US1 (routing + dynamic page)
4. **STOP and VALIDATE**: First resume creation, redirect, dynamic route all work
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. US1 (routing) → Test independently → Deploy (MVP!)
3. US2 (duplicate) + US3 (selector) → Test → Deploy (multi-resume creation + switching)
4. US4 (default toggle) + US5 (delete) → Test → Deploy (resume management)
5. US6 (name edit) → Test → Deploy (better navigation)
6. US7 (vacancy picker) → Test → Deploy (generation integration)
7. US8 (clear adjusted) + Polish → Final validation → Deploy (complete feature)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable after US1
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- The migration (T003) must be manually reviewed before applying — it includes data-migration SQL
- All `isDefault` values are computed at API layer (never stored per-resume row)
- All new UI text must use i18n keys (no hardcoded strings)
