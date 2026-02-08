# Tasks: 007 — Vacancies List Table

**Input**: Design documents from `/specs/007-vacancies-list/`
**Prerequisites**: plan.md (required), spec.md (required)
**Documentation Gate**: Read and follow `docs/codestyle/base.md` before any code changes. Also read:

- `docs/architecture/monorepo.md` (layer conventions)
- `docs/api/endpoints.md` (existing API patterns)
- `docs/api/schemas.md` (existing schema patterns)
- `docs/architecture/data-flow.md` (store/actions pattern)

**Tests**: Not included (not requested in spec). Add later if needed.

**Organization**: Tasks grouped by user story for independent implementation and testing.

**User Stories** (derived from spec):

- **US1**: Server-side paginated vacancy table with default sort (core rendering)
- **US2**: Sorting, filtering, and search
- **US3**: Bulk actions (row selection + bulk delete)
- **US4**: Column visibility persistence

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story (US1–US4)
- Exact file paths included in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Base schemas and i18n keys needed by all stories

- [ ] T001 [P] Create base pagination schemas (`PaginationQuerySchema`, `PaginationResponseSchema`) in `packages/schema/schemas/pagination.ts` (package: `@int/schema`)
- [ ] T002 [P] Create vacancy list schemas (`VacancyListQuerySchema` extending `PaginationQuerySchema`, `VacancyListResponseSchema`, `VacancyBulkDeleteSchema`, `VacancyListColumnVisibilitySchema`, `VacancyListPreferencesPatchSchema`) in `packages/schema/schemas/vacancy-list.ts` (package: `@int/schema`)
- [ ] T003 Export new schemas from `packages/schema/index.ts` (package: `@int/schema`) — add `export * from './schemas/pagination'` and `export * from './schemas/vacancy-list'`
- [ ] T004 Add new i18n keys under `vacancy.list.columns`, `vacancy.list.search`, `vacancy.list.filter`, `vacancy.list.bulkActions`, `vacancy.list.noPosition` in `apps/site/i18n/locales/en.json`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: DB table, repositories, and API endpoints that all stories depend on

**WARNING**: No user story work can begin until this phase is complete

- [ ] T005 Add `userVacancyListPreferences` table definition in `packages/nuxt-layer-api/server/data/schema.ts` (package: `@int/api`) — uuid PK, userId (FK → users, unique, cascade), columnVisibility (jsonb default {}), timestamps
- [ ] T006 Create `vacancyListPreferencesRepository` with `findByUserId` and `upsert` methods in `packages/nuxt-layer-api/server/data/repositories/vacancy-list-preferences.ts` (package: `@int/api`) — follow `formatSettingsRepository` pattern
- [ ] T007 Export `vacancyListPreferencesRepository` from `packages/nuxt-layer-api/server/data/repositories/index.ts` (package: `@int/api`)
- [ ] T008 Add `findPaginated(userId, params)` method to `vacancyRepository` in `packages/nuxt-layer-api/server/data/repositories/vacancy.ts` (package: `@int/api`) — accepts `{ currentPage, pageSize, sortBy?, sortOrder?, status?, search? }`, returns `{ items: Vacancy[], totalItems: number }`, includes ILIKE search on company+jobPosition, status filter via inArray, default CASE-based status-group sort, pagination via limit/offset, count query — follow existing `userRepository.search` pattern
- [ ] T009 Add `bulkDelete(ids, userId)` method to `vacancyRepository` in `packages/nuxt-layer-api/server/data/repositories/vacancy.ts` (package: `@int/api`) — verify all IDs belong to user (403 if not), delete in transaction, cascade deletes generations
- [ ] T010 Rewrite `GET /api/vacancies` endpoint in `packages/nuxt-layer-api/server/api/vacancies/index.get.ts` (package: `@int/api`) — parse query with `VacancyListQuerySchema`, call `findPaginated`, fetch columnVisibility from preferences repo (default all true if none), return `{ items, pagination: { totalItems, totalPages }, columnVisibility }`
- [ ] T011 [P] Create `DELETE /api/vacancies/bulk` endpoint in `packages/nuxt-layer-api/server/api/vacancies/bulk.delete.ts` (package: `@int/api`) — validate body with `VacancyBulkDeleteSchema`, call `bulkDelete`, return 204
- [ ] T012 [P] Create `PATCH /api/user/preferences/vacancy-list` endpoint in `packages/nuxt-layer-api/server/api/user/preferences/vacancy-list.patch.ts` (package: `@int/api`) — validate body with `VacancyListPreferencesPatchSchema`, upsert preferences, return updated `{ columnVisibility }`
- [ ] T013 Generate Drizzle migration — run `pnpm drizzle-kit generate` from `packages/nuxt-layer-api/` and verify generated SQL adds only `user_vacancy_list_preferences` table
- [ ] T014 Update vacancy API client in `apps/site/layers/vacancy/app/infrastructure/vacancy.api.ts` — replace `fetchAll()` with `fetchPaginated(query: VacancyListQuery): Promise<VacancyListResponse>`, add `bulkDelete(ids: string[]): Promise<void>`, add `updateColumnVisibility(data): Promise<{ columnVisibility }>`, keep `fetchById`/`create`/`update`/`delete` unchanged
- [ ] T015 Update vacancy store in `apps/site/layers/vacancy/app/stores/index.ts` — add `vacancyListResponse: VacancyListResponse | null` state, make `vacancies` a getter alias (`this.vacancyListResponse?.items ?? []`), add `fetchVacanciesPaginated(query)` action, add `bulkDeleteVacancies(ids)` action, add `updateColumnVisibility(visibility)` action, keep existing single-vacancy and generation actions unchanged
- [ ] T016 Adapt `apps/site/app/pages/after-login.vue` — change `fetchVacancies()` call to `fetchVacanciesPaginated({ currentPage: 1, pageSize: 1 })`, navigate based on `response.pagination.totalItems > 0`

**Checkpoint**: Backend fully functional, store wired up, after-login page working. Ready for UI implementation.

---

## Phase 3: User Story 1 — Server-Side Paginated Table (Priority: P1) MVP

**Goal**: Replace the current VacancyListRow list with a UTable showing paginated data with default sort, row click navigation, single delete, and pagination controls.

**Independent Test**: Navigate to `/vacancies` → table renders with columns (company/position, status, updatedAt, createdAt, delete action) → default sort by status-group then updatedAt DESC → clicking a row navigates to `/vacancies/:id` → clicking delete opens modal, confirms, removes row → pagination and page-size selector work.

### Implementation for User Story 1

- [ ] T017 [US1] Rewrite `/vacancies` page in `apps/site/layers/vacancy/app/pages/vacancies/index.vue` — implement UTable with columns (company/position, status, updatedAt, createdAt, actions), data from `fetchVacanciesPaginated`, row click via `@select` navigates to `/vacancies/:id`, custom cell slots: company cell with truncated company name + smaller jobPosition sub-line, status cell with static UBadge using `getStatusColor`, date cells formatted with date-fns `format(date, 'dd.MM.yyyy')`, actions cell with delete button (`@click.stop`), keep existing delete modal, refetch after delete, loading/empty/error states, UPagination (right-aligned) + page-size USelect (left-aligned) below table
- [ ] T018 [US1] Delete unused `apps/site/layers/vacancy/app/components/ListRow.vue`

**Checkpoint**: Core table is functional — users can browse, paginate, navigate to detail, and delete individual vacancies.

---

## Phase 4: User Story 2 — Sorting, Filtering, and Search (Priority: P2)

**Goal**: Add column sorting (updatedAt, createdAt), status multi-select filter, and debounced search to the table toolbar.

**Independent Test**: Click "Updated" column header → rows re-sort (server-side) → click again toggles direction → select statuses in filter dropdown → only matching rows shown → type 3+ chars in search → after 1s debounce rows filter by company/position → clear search → full list restored → all controls reset page to 1.

### Implementation for User Story 2

- [ ] T019 [US2] Add sorting support to the table in `apps/site/layers/vacancy/app/pages/vacancies/index.vue` — add `v-model:sorting` with `SortingState` ref, map TanStack `SortingState` to `{ sortBy, sortOrder }` API params, set `sortingOptions` with `manualSorting: true` on UTable, watch sorting changes to trigger refetch, when sorting is empty use default sort (no sortBy param)
- [ ] T020 [US2] Add status filter to the toolbar in `apps/site/layers/vacancy/app/pages/vacancies/index.vue` — USelectMenu (multi-select) with options from `VACANCY_STATUS_VALUES`, i18n labels from `vacancy.status.*`, bound to local `statusFilter` ref, on change reset `currentPage` to 1 and refetch
- [ ] T021 [US2] Add search input to the toolbar in `apps/site/layers/vacancy/app/pages/vacancies/index.vue` — UInput with search icon, bound to local `searchQuery` ref, use `useDebounceFn` from VueUse (1000ms delay), trigger refetch only when `searchQuery.length >= 3` or when cleared to empty (refetch without search), reset `currentPage` to 1 on search

**Checkpoint**: Users can sort, filter by status, and search — all server-side.

---

## Phase 5: User Story 3 — Bulk Actions (Priority: P3)

**Goal**: Add checkbox-based row selection with bulk delete action bar.

**Independent Test**: Check 2+ rows → bulk action bar appears showing "{count} selected — [Delete selected]" → click delete → confirmation modal with plural text → confirm → rows deleted, toast shown, selection cleared, table refetched.

### Implementation for User Story 3

- [ ] T022 [US3] Add row selection to the table in `apps/site/layers/vacancy/app/pages/vacancies/index.vue` — add select column with header checkbox (select all) and row checkboxes, `v-model:row-selection` with `RowSelectionState` ref, configure `getRowId` to use vacancy `id`, ensure checkbox click doesn't trigger row navigation
- [ ] T023 [US3] Add bulk action bar to the toolbar in `apps/site/layers/vacancy/app/pages/vacancies/index.vue` — conditionally shown when `rowSelection` has entries, display "{count} selected" text + "Delete selected" UButton (color error), on click open confirmation modal with bulk-specific text from `vacancy.list.bulkActions.*` i18n keys, on confirm call `bulkDeleteVacancies(selectedIds)`, on success clear selection + refetch + show toast

**Checkpoint**: Users can select and bulk-delete vacancies.

---

## Phase 6: User Story 4 — Column Visibility Persistence (Priority: P4)

**Goal**: Add column toggle dropdown that persists column visibility server-side.

**Independent Test**: Click "Columns" dropdown → uncheck "Created" column → column hides immediately → reload page → column still hidden (persisted via PATCH + returned from GET).

### Implementation for User Story 4

- [ ] T024 [US4] Add column visibility toggle dropdown to the toolbar in `apps/site/layers/vacancy/app/pages/vacancies/index.vue` — UDropdownMenu trigger button with "Columns" label, checkbox items for toggleable columns (company, status, updatedAt, createdAt — NOT select/actions), bind to `v-model:column-visibility` on UTable, initialize from `vacancyListResponse.columnVisibility`, on toggle: update local state immediately (optimistic) + call `updateColumnVisibility` store action (PATCH to backend)

**Checkpoint**: Column visibility is fully interactive and persisted server-side.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Documentation and final validation

- [ ] T025 [P] Update API documentation in `docs/api/endpoints.md` — document changed `GET /api/vacancies` (query params, new response shape with `pagination`), new `DELETE /api/vacancies/bulk`, new `PATCH /api/user/preferences/vacancy-list`
- [ ] T026 [P] Update schema documentation in `docs/api/schemas.md` — add `PaginationQuery`, `PaginationResponse` (base), `VacancyListQuery`, `VacancyListResponse`, `VacancyListColumnVisibility`, `VacancyBulkDeleteSchema`
- [ ] T027 Run typecheck `cd apps/site && pnpm vue-tsc --noEmit` — fix any type errors
- [ ] T028 Run Drizzle migration against local DB `pnpm drizzle-kit migrate` from `packages/nuxt-layer-api/`, start dev server (port 3002), smoke test full flow: login → /vacancies → verify table, sorting, filtering, search, column toggle, single delete, bulk delete, pagination

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 — BLOCKS all user stories
- **User Stories (Phases 3–6)**: All depend on Phase 2 completion
  - US1 (Phase 3) must complete before US2–US4 (they extend the same page file)
  - US2, US3, US4 (Phases 4–6) can theoretically run in parallel but touch the same file — recommend sequential P2 → P3 → P4
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: Depends on Phase 2 — core table, no dependencies on other stories
- **US2 (P2)**: Depends on US1 — adds sorting/filter/search to existing table
- **US3 (P3)**: Depends on US1 — adds row selection + bulk bar to existing table
- **US4 (P4)**: Depends on US1 — adds column toggle to existing table

### Within Each User Story

- Backend (repos, endpoints) before frontend (store, page)
- All backend tasks in Phase 2 (shared foundation)
- UI tasks grouped by story for incremental delivery

### Parallel Opportunities

- T001 + T002 can run in parallel (different files)
- T011 + T012 can run in parallel (different endpoint files)
- T025 + T026 can run in parallel (different doc files)
- Within Phase 2: T006/T007 can start after T005; T008/T009 can start after T005; T011/T012 are independent

---

## Parallel Example: Phase 1

```
# Launch both schema files together:
Task T001: "Create pagination schemas in packages/schema/schemas/pagination.ts"
Task T002: "Create vacancy list schemas in packages/schema/schemas/vacancy-list.ts"
```

## Parallel Example: Phase 2

```
# After T010 completes, launch both new endpoints together:
Task T011: "Create DELETE /api/vacancies/bulk endpoint"
Task T012: "Create PATCH /api/user/preferences/vacancy-list endpoint"
```

---

## Implementation Strategy

### MVP First (US1 Only)

1. Complete Phase 1: Setup (schemas + i18n)
2. Complete Phase 2: Foundational (DB, repos, endpoints, store)
3. Complete Phase 3: US1 (core table with pagination + single delete)
4. **STOP and VALIDATE**: Table renders, paginated, row click works, delete works
5. Deploy/demo if ready

### Incremental Delivery

1. Phase 1 + Phase 2 → Backend fully ready
2. Add US1 (Phase 3) → Core table working → Deploy (MVP!)
3. Add US2 (Phase 4) → Sorting + filtering + search → Deploy
4. Add US3 (Phase 5) → Bulk delete → Deploy
5. Add US4 (Phase 6) → Column persistence → Deploy
6. Phase 7 → Docs + validation → Final deploy

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- All UI text must use i18n keys (no hardcoded strings)
- Use VueUse `useDebounceFn` for search debounce (1000ms)
- Use NuxtUI docs MCP for UTable specifics during implementation
- Status badge in table: static `UBadge` (non-interactive), not the full `VacancyStatusBadge` dropdown
- `after-login.vue` uses `fetchVacanciesPaginated({ currentPage: 1, pageSize: 1 })` — no legacy `fetchAll`
- Dev server runs on port **3002**
- Typecheck: `cd apps/site && pnpm vue-tsc --noEmit`
