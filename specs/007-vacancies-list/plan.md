# 007 — Vacancies List Table: Implementation Plan

> Based on `specs/007-vacancies-list/spec.md`

---

## Task 1 — Base pagination schemas + vacancy list schemas (schema layer)

**Goal:** Define reusable base pagination schemas (request + response) for all future paginated endpoints, then extend them for the vacancy list. All request/response types shared between backend and frontend from day 1.

**Files to touch:**

| File                                                               | Action                                                                                                                                                                                                                                                    |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/schema/schemas/pagination.ts` (package: `@int/schema`)   | **New** — `PaginationQuerySchema`, `PaginationResponseSchema` + exported types                                                                                                                                                                            |
| `packages/schema/schemas/vacancy-list.ts` (package: `@int/schema`) | **New** — `VacancyListQuerySchema` (extends `PaginationQuerySchema`), `VacancyListResponseSchema` (uses `PaginationResponseSchema`), `VacancyListColumnVisibilitySchema`, `VacancyListPreferencesPatchSchema`, `VacancyBulkDeleteSchema` + exported types |
| `packages/schema/index.ts` (package: `@int/schema`)                | Add `export * from './schemas/pagination'` and `export * from './schemas/vacancy-list'`                                                                                                                                                                   |

**Details:**

### Base pagination schemas (`pagination.ts`)

```typescript
/** Reusable pagination query params for any paginated endpoint */
export const PaginationQuerySchema = z.object({
  currentPage: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10)
});
export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

/** Reusable pagination metadata in API responses */
export const PaginationResponseSchema = z.object({
  totalItems: z.number().int().min(0),
  totalPages: z.number().int().min(0)
});
export type PaginationResponse = z.infer<typeof PaginationResponseSchema>;
```

### Vacancy list schemas (`vacancy-list.ts`)

- `VacancyListQuerySchema`: extends `PaginationQuerySchema` with `.extend({ sortBy, sortOrder, status, search })`
  - sortBy: `z.enum(['updatedAt', 'createdAt']).optional()`
  - sortOrder: `z.enum(['asc', 'desc']).optional()`
  - status: `z.union([z.string(), z.array(z.string())]).transform(...).pipe(z.array(VacancyStatusSchema)).optional()`
  - search: `z.string().min(3).max(255).optional()`
- `VacancyListResponseSchema`: `{ items: VacancySchema[], pagination: PaginationResponseSchema, columnVisibility: Record<string, boolean> }`
- `VacancyBulkDeleteSchema`: `{ ids: uuid[].min(1).max(100) }`
- `VacancyListPreferencesPatchSchema`: `{ columnVisibility: Record<string, boolean> }`
- Import `VacancyStatusSchema` from `./enums` and `VacancySchema` from `./vacancy`

**Risks:** Query `status` param arrives as a single string or repeated param — the union + transform pattern handles this. Verify Nuxt query parsing delivers arrays for repeated params.

**Tests to add:**

- `packages/schema/__tests__/pagination.test.ts`: base schema defaults, coercion, min/max validation
- `packages/schema/__tests__/vacancy-list.test.ts`: valid query parsing, invalid values rejected, default coercion, status string-to-array transform, bulk delete min/max validation

---

## Task 2 — DB table + preferences repository

**Goal:** Add `user_vacancy_list_preferences` table and CRUD repository.

**Files to touch:**

| File                                                                                                 | Action                                                                  |
| ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `packages/nuxt-layer-api/server/data/schema.ts` (package: `@int/api`)                                | Add `userVacancyListPreferences` table definition                       |
| `packages/nuxt-layer-api/server/data/repositories/vacancy-list-preferences.ts` (package: `@int/api`) | **New** — `findByUserId`, `upsert` (insert or update column visibility) |
| `packages/nuxt-layer-api/server/data/repositories/index.ts` (package: `@int/api`)                    | Export `vacancyListPreferencesRepository`                               |

**Details:**

- Table: `id (uuid PK)`, `userId (uuid FK → users, unique, cascade delete)`, `columnVisibility (jsonb, default {})`, `createdAt`, `updatedAt`
- `findByUserId(userId)` → returns row or null
- `upsert(userId, columnVisibility)` → uses `onConflictDoUpdate` on userId unique constraint; merges incoming visibility with existing via spread on the DB side (or read-then-merge in code since JSONB spread in PG requires `||` operator)
- Follow existing `formatSettingsRepository` pattern for structure

**Risks:** JSONB merge strategy — if we use Drizzle's `onConflictDoUpdate`, we can set the whole `columnVisibility` value. Since the frontend sends the full merged object (after applying the toggle), we can replace rather than deep-merge on the DB side.

**Tests to add:**

- Repository integration test: upsert creates new row, upsert updates existing, findByUserId returns null when missing

**Migration:** Generate with `pnpm drizzle-kit generate` after schema change.

---

## Task 3 — Vacancy repository: `findPaginated` + `bulkDelete`

**Goal:** Add server-side sorting, filtering, search, and pagination to the vacancy repository. Add bulk delete.

**Files to touch:**

| File                                                                                | Action                                           |
| ----------------------------------------------------------------------------------- | ------------------------------------------------ |
| `packages/nuxt-layer-api/server/data/repositories/vacancy.ts` (package: `@int/api`) | Add `findPaginated()` and `bulkDelete()` methods |

**Details:**

### `findPaginated(userId, params)` → `{ items: Vacancy[], totalItems: number }`

Params: `{ currentPage, pageSize, sortBy?, sortOrder?, status?: VacancyStatus[], search?: string }`

Query construction (follow existing `userRepository.search` pattern):

1. Build filters array:
   - Always: `eq(vacancies.userId, userId)`
   - If `status`: `inArray(vacancies.status, status)`
   - If `search`: `or(ilike(vacancies.company, '%search%'), ilike(vacancies.jobPosition, '%search%'))`
2. Combine with `and(...filters)`
3. Sorting:
   - If `sortBy` provided: `orderBy(sortOrder === 'asc' ? asc(vacancies[sortBy]) : desc(vacancies[sortBy]))`
   - Default (no `sortBy`): `sql` CASE expression for status-group ordering + `desc(vacancies.updatedAt)`
4. Pagination: `.limit(pageSize).offset((currentPage - 1) * pageSize)`
5. Count query: `select({ count: sql<number>'count(*)' }).from(vacancies).where(whereClause)`
6. Returns `{ items, totalItems }` — the API handler computes `totalPages = Math.ceil(totalItems / pageSize)`

### `bulkDelete(ids, userId)` → `void`

1. First verify all IDs belong to user: `select({ id }).from(vacancies).where(and(inArray(vacancies.id, ids), eq(vacancies.userId, userId)))`
2. If count !== ids.length → throw 403 error
3. Delete: `db.delete(vacancies).where(and(inArray(vacancies.id, ids), eq(vacancies.userId, userId)))`

**Risks:**

- Drizzle `ilike` import — exists in `drizzle-orm`. Verify it works with nullable `jobPosition` column (ILIKE on NULL returns no match, which is correct behavior).
- Status CASE sort uses raw `sql` — ensure enum values are hardcoded strings, not user input.
- `bulkDelete` ownership check + delete should ideally be in a transaction to avoid TOCTOU. Use `db.transaction()`.

**Tests to add:**

- `findPaginated`: default sort order, explicit sort, status filter, search filter, pagination offset/limit, combined filters, totalItems correctness
- `bulkDelete`: deletes owned rows, rejects if any ID not owned, cascade deletes generations

---

## Task 4 — API endpoints (GET, bulk DELETE, PATCH preferences)

**Goal:** Implement the three server API endpoints.

**Files to touch:**

| File                                                                                              | Action                                                                                                                                                                          |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `packages/nuxt-layer-api/server/api/vacancies/index.get.ts` (package: `@int/api`)                 | Rewrite — parse query params with `VacancyListQuerySchema`, call `vacancyRepository.findPaginated`, fetch column visibility from preferences repo, return `VacancyListResponse` |
| `packages/nuxt-layer-api/server/api/vacancies/bulk.delete.ts` (package: `@int/api`)               | **New** — validate body with `VacancyBulkDeleteSchema`, call `vacancyRepository.bulkDelete`, return 204                                                                         |
| `packages/nuxt-layer-api/server/api/user/preferences/vacancy-list.patch.ts` (package: `@int/api`) | **New** — validate body with `VacancyListPreferencesPatchSchema`, call `vacancyListPreferencesRepository.upsert`, return updated columnVisibility                               |

**Details:**

### `GET /api/vacancies` changes

- Parse `getQuery(event)` with `VacancyListQuerySchema.safeParse()` — on failure return 400
- Call `vacancyRepository.findPaginated(userId, parsedQuery)` → gets `{ items, totalItems }`
- Compute `totalPages = Math.ceil(totalItems / parsedQuery.pageSize)`
- Call `vacancyListPreferencesRepository.findByUserId(userId)` — if null, return default visibility `{ company: true, status: true, updatedAt: true, createdAt: true }`
- Return `{ items, pagination: { totalItems, totalPages }, columnVisibility }`

### `DELETE /api/vacancies/bulk`

- Read body with `readBody(event)`, validate with `VacancyBulkDeleteSchema`
- Call `vacancyRepository.bulkDelete(body.ids, userId)`
- Return `setResponseStatus(event, 204)` with empty body

### `PATCH /api/user/preferences/vacancy-list`

- Create directories: `server/api/user/preferences/`
- Read body, validate with `VacancyListPreferencesPatchSchema`
- Call `vacancyListPreferencesRepository.upsert(userId, body.columnVisibility)`
- Return updated `{ columnVisibility }`

**Risks:**

- Breaking change to `GET /api/vacancies` response — `after-login.vue` currently calls `vacancyStore.fetchVacancies()` which returns `Vacancy[]`. This must be adapted (Task 5 handles this).
- Query param parsing: Nuxt's `getQuery` returns `string | string[]` for repeated params — Zod union+transform handles this.

**Tests to add:**

- API handler tests: valid requests return expected shapes, invalid params return 400, unauthorized returns 401, bulk delete with non-owned ID returns 403

---

## Task 5 — Vacancy API client + store updates

**Goal:** Update the frontend API client and Pinia store to work with the new paginated API.

**Files to touch:**

| File                                                         | Action                                                                                                                                     |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `apps/site/layers/vacancy/app/infrastructure/vacancy.api.ts` | Replace `fetchAll()` with `fetchPaginated(query)`, add `bulkDelete(ids)`, add `updateColumnVisibility(data)`                               |
| `apps/site/layers/vacancy/app/stores/index.ts`               | Add new state fields, replace `fetchVacancies` with `fetchVacanciesPaginated`, add `bulkDeleteVacancies`, `updateColumnVisibility` actions |
| `apps/site/app/pages/after-login.vue`                        | Adapt to new response shape (`response.items.length > 0`)                                                                                  |

**Details:**

### API client changes

```typescript
// vacancy.api.ts
async fetchPaginated(query: VacancyListQuery): Promise<VacancyListResponse> {
  return await useApi(vacancyUrl, { method: 'GET', query });
}

async bulkDelete(ids: string[]): Promise<void> {
  await useApi(`${vacancyUrl}/bulk`, { method: 'DELETE', body: { ids } });
}

async updateColumnVisibility(data: VacancyListColumnVisibility): Promise<{ columnVisibility: VacancyListColumnVisibility }> {
  return await useApi('/api/user/preferences/vacancy-list', { method: 'PATCH', body: { columnVisibility: data } });
}
```

Keep `fetchAll()` as a thin wrapper that calls `fetchPaginated({ pageSize: 1 })` and returns `response.pagination.totalItems > 0` — or simpler: keep a lightweight `fetchAll` that the after-login page uses, returning `response.items`. **Decision:** Keep the old `fetchAll` → internally calls `fetchPaginated` and maps to `Vacancy[]` for backward compat in `after-login.vue`. Or just update `after-login.vue` to use the new shape directly. The latter is cleaner.

### Store changes

New state:

```typescript
vacancyListResponse: VacancyListResponse | null; // { items, pagination: { totalItems, totalPages }, columnVisibility }
vacancyListQuery: VacancyListQuery; // current query state
```

Keep `vacancies` as a computed alias: `this.vacancyListResponse?.items ?? []` — preserves getter compatibility.

New actions:

- `fetchVacanciesPaginated(query)` — calls API, stores response
- `bulkDeleteVacancies(ids)` — calls API, refetches current page
- `updateColumnVisibility(visibility)` — calls API, updates local state immediately (optimistic)

### `after-login.vue` adaptation

Currently: `const vacancies = await vacancyStore.fetchVacancies()`
Change to: `const response = await vacancyStore.fetchVacanciesPaginated({ currentPage: 1, pageSize: 1 })`
Then: `response.pagination.totalItems > 0 ? '/vacancies' : '/resume'`

**Risks:**

- Other store getters (`getHasVacancies`, `getLatestVacancy`) rely on `this.vacancies` — ensure the alias works.
- `getLatestVacancy` sorts client-side — after this change it may only see current page data. Since it's only used when all vacancies are loaded (detail page fetches individual vacancy), this is acceptable. Verify no other consumers.

**Tests to add:**

- Store action tests: `fetchVacanciesPaginated` updates state, `bulkDeleteVacancies` calls API and refetches

---

## Task 6 — i18n keys

**Goal:** Add all new translation keys before building the UI.

**Files to touch:**

| File                             | Action                                                                                                          |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `apps/site/i18n/locales/en.json` | Add keys under `vacancy.list.columns`, `vacancy.list.search`, `vacancy.list.filter`, `vacancy.list.bulkActions` |

**Details:**

Add the following new keys (preserving existing `vacancy.list.*` keys):

```json
"columns": {
  "toggle": "Columns",
  "company": "Company / Position",
  "status": "Status",
  "updatedAt": "Updated",
  "createdAt": "Created",
  "actions": "Actions"
},
"search": {
  "placeholder": "Search by company or position..."
},
"filter": {
  "status": "Status",
  "statusPlaceholder": "Filter by status..."
},
"bulkActions": {
  "selected": "{count} selected",
  "delete": "Delete selected",
  "deleteConfirm": "Are you sure you want to delete {count} selected vacancy(ies)?",
  "deleteDescription": "This action cannot be undone. All associated tailored resumes will also be deleted.",
  "deleteSuccess": "{count} vacancy(ies) deleted successfully"
},
"noPosition": "Position not specified"
```

**Risks:** None — additive only.

**Tests to add:** None (i18n keys tested implicitly by E2E tests).

---

## Task 7 — Vacancies list page: UTable implementation

**Goal:** Rewrite `/vacancies` page to use `UTable` with all features.

**Files to touch:**

| File                                                     | Action       |
| -------------------------------------------------------- | ------------ |
| `apps/site/layers/vacancy/app/pages/vacancies/index.vue` | Full rewrite |
| `apps/site/layers/vacancy/app/components/ListRow.vue`    | **Delete**   |

**Details:**

This is the largest task. Break the template into logical sections:

### 7a — Table column definitions

Define columns array using NuxtUI `TableColumn` type:

```typescript
const columns: TableColumn<Vacancy>[] = [
  { id: 'select', header: /* checkbox-all */, cell: /* checkbox-row */ },
  { id: 'company', accessorKey: 'company', header: t('vacancy.list.columns.company') },
  { id: 'status', accessorKey: 'status', header: t('vacancy.list.columns.status') },
  { id: 'updatedAt', accessorKey: 'updatedAt', header: t('vacancy.list.columns.updatedAt'), sortable: true },
  { id: 'createdAt', accessorKey: 'createdAt', header: t('vacancy.list.columns.createdAt'), sortable: true },
  { id: 'actions', header: t('vacancy.list.columns.actions') },
]
```

### 7b — Toolbar (above table)

- **Search input**: `UInput` with search icon, `v-model` bound to local `searchQuery` ref, use `useDebounceFn` from VueUse (1000ms). On debounced change: if `searchQuery.length >= 3` → refetch with search param; if `searchQuery.length < 3 && searchQuery.length > 0` → no-op; if empty → refetch without search.
- **Status filter**: `USelectMenu` (multi-select) bound to `statusFilter` ref. Options built from `VACANCY_STATUS_VALUES`. On change: reset page to 1, refetch.
- **Column toggle**: `UDropdownMenu` with checkboxes for each toggleable column (company, status, updatedAt, createdAt). Bound to `columnVisibility` state from store. On toggle: update store → optimistic local update → PATCH to backend.
- **Bulk action bar** (conditional, shown when `rowSelection` has entries): text "{count} selected" + "Delete selected" button.

### 7c — Table body

- `UTable` with `:data`, `:columns`, `v-model:sorting`, `v-model:column-visibility`, `v-model:row-selection`, `:loading`, `@select` (row click → navigate), custom cell slots:
  - **company cell**: company name (truncated, `truncate` class) as primary text + job position (truncated, smaller/muted) as secondary line. Use `#company-cell` slot.
  - **status cell**: render existing `VacancyStatusBadge` component (non-interactive variant, just display badge without dropdown — pass `disabled` + `hasGeneration` appropriately). Or simpler: use a static `UBadge` with status color from `getStatusColor`.
  - **updatedAt / createdAt cells**: formatted with `date-fns` `format(date, 'dd.MM.yyyy')`
  - **actions cell**: delete button (trash icon, `@click.stop` to prevent row navigation)
  - **select cell**: checkbox (managed by UTable row selection)

### 7d — Footer (below table)

- **Left**: Page-size selector — `USelect` with options `[10, 25, 50, 100]`, local `pageSize` ref. On change: reset page to 1, refetch.
- **Right**: `UPagination` bound to current page, `itemsPerPage`, `pagination.totalItems` from store.

### 7e — Modals

- Keep existing single-delete modal
- Add/adapt for bulk delete (reuse same modal with dynamic text based on `vacancyToDelete` vs `selectedIds.length`)

### 7f — Data fetching

- Use `useAsyncData` with the store action, re-execute on query param changes
- Build a reactive `queryParams` computed from local state (page, pageSize, sorting, statusFilter, searchQuery)
- Watch `queryParams` → trigger refetch (or use `watch` + `refresh()`)
- Sorting: `v-model:sorting` gives `SortingState` from TanStack — map to `{ sortBy, sortOrder }` for the API. When sorting is empty array → use default sort (no sortBy param).

### State management

Local refs (not persisted):

- `currentPage: ref(1)` — maps to `VacancyListQuery.currentPage`
- `pageSize: ref(10)` — maps to `VacancyListQuery.pageSize`
- `searchQuery: ref('')`
- `statusFilter: ref<VacancyStatus[]>([])`
- `sorting: ref<SortingState>([])`
- `rowSelection: ref<RowSelectionState>({})`

From store:

- `columnVisibility` (from `vacancyListResponse.columnVisibility`)

**Risks:**

- **UTable sorting model**: NuxtUI Table wraps TanStack Table. `v-model:sorting` uses `SortingState` (array of `{ id, desc }`). Need to map this to/from `sortBy`/`sortOrder` API params. When user clicks a sortable column, UTable manages the state; we just need to translate for the API call.
- **Row click vs checkbox click**: Use `@select` prop for row click. Checkboxes are handled by `v-model:row-selection`. Ensure clicking checkbox doesn't also trigger row navigation — UTable handles this natively when using the `select` column with `rowSelectionOptions`.
- **Column visibility sync**: initial value comes from server response → set as initial state on `UTable`. Changes are applied locally + persisted via PATCH. Ensure no flicker on initial load.
- **Large task**: consider splitting if implementation takes too long. The toolbar and table body can be separate sub-components if the file exceeds ~150 lines template. However, keeping it in one file initially is acceptable since NuxtUI table config is naturally colocated.

**Tests to add:**

- E2E: table renders, row click navigates, sort click changes order, search filters, status filter works, column toggle hides column, pagination works, bulk delete flow, single delete flow

---

## Task 8 — Documentation updates

**Goal:** Update API and schema docs to reflect changes.

**Files to touch:**

| File                    | Action                                                                                                                                                  |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/api/endpoints.md` | Update `GET /api/vacancies` docs, add `DELETE /api/vacancies/bulk`, add `PATCH /api/user/preferences/vacancy-list`                                      |
| `docs/api/schemas.md`   | Add `PaginationQuery`, `PaginationResponse` (base), `VacancyListQuery`, `VacancyListResponse`, `VacancyListColumnVisibility`, `VacancyBulkDeleteSchema` |

**Risks:** None — documentation only.

**Tests to add:** None.

---

## Task 9 — DB migration generation & smoke test

**Goal:** Generate and verify the Drizzle migration, smoke-test the full flow.

**Steps:**

1. Run `pnpm drizzle-kit generate` from `packages/nuxt-layer-api/`
2. Review generated SQL migration
3. Run `pnpm drizzle-kit migrate` against local DB
4. Start dev server (`port 3002`)
5. Manual smoke test:
   - Login → navigate to `/vacancies`
   - Verify table renders with existing data
   - Test sorting, filtering, search
   - Test column visibility toggle + persistence
   - Test single and bulk delete
   - Test pagination and page size
6. Run typecheck: `cd apps/site && pnpm vue-tsc --noEmit`

**Risks:**

- Migration may conflict with pending migrations from other branches
- Ensure `drizzle-kit` generates clean migration (no destructive changes to existing tables)

---

## Dependency graph

```
Task 1 (schemas)
  ↓
Task 2 (DB table + prefs repo)  ←── can run in parallel with Task 3
Task 3 (vacancy repo: findPaginated + bulkDelete)
  ↓
Task 4 (API endpoints)  ←── depends on Tasks 1, 2, 3
  ↓
Task 5 (API client + store)  ←── depends on Task 4
Task 6 (i18n keys)  ←── independent, can run anytime
  ↓
Task 7 (page rewrite)  ←── depends on Tasks 5, 6
  ↓
Task 8 (docs)  ←── depends on Tasks 4, 7
Task 9 (migration + smoke)  ←── depends on all
```

## Estimated effort

| Task                                        | Estimate |
| ------------------------------------------- | -------- |
| 1. Zod schemas                              | ~30 min  |
| 2. DB table + prefs repo                    | ~45 min  |
| 3. Vacancy repo: findPaginated + bulkDelete | ~1.5 h   |
| 4. API endpoints                            | ~1 h     |
| 5. API client + store                       | ~1 h     |
| 6. i18n keys                                | ~15 min  |
| 7. Page rewrite (UTable)                    | ~2 h     |
| 8. Docs                                     | ~30 min  |
| 9. Migration + smoke test                   | ~30 min  |

## Open decisions

1. **`after-login.vue` adaptation**: The simplest approach is to update it to call `fetchVacanciesPaginated({ currentPage: 1, pageSize: 1 })` and check `response.pagination.totalItems > 0`. This avoids maintaining a legacy `fetchAll`. _(Recommended)_

2. **Status badge in table**: Use a simple static `UBadge` (non-interactive) in the table to keep the list lightweight. The full interactive `VacancyStatusBadge` with dropdown is only on the detail page. _(Recommended)_

3. **Bulk delete atomicity**: If any ID in the batch doesn't belong to the user, reject the entire request (403). Don't partial-delete. _(Per spec)_

4. **Column visibility default object**: When no preference exists, the API returns `{ company: true, status: true, updatedAt: true, createdAt: true }`. This is constructed in the endpoint handler, not stored. _(Recommended)_
