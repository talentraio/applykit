# 007 — Vacancies List: Table View with Server-Side Sorting, Filtering & Search

## Overview

The `/vacancies` page currently renders vacancies as a flat list of `VacancyListRow` cards with client-side pagination (desktop) and infinite scroll (mobile). This feature replaces the list with a NuxtUI `UTable` component backed by server-side sorting, filtering, search, and pagination. It also adds row selection with bulk actions, column visibility toggling (persisted on the backend), and a status filter.

## Goals

- **Server-driven data**: sorting, filtering, search, and pagination are handled by the backend — the client sends query params and renders whatever it receives
- **NuxtUI Table integration**: leverage `UTable` built-in features (column sorting, row selection, column visibility) for a consistent UI
- **Column visibility persistence**: user's visible-column preference is stored server-side and returned alongside the vacancy list
- **Bulk operations**: checkbox-based row selection with a bulk-delete action (extensible for future bulk actions)
- **Status filtering**: filter vacancies by one or more statuses
- **Full-text search**: debounced (1 s, min 3 chars) search across company name and job position
- **Default sort**: status-group ordering (created → generated → screening → interview → offer → rejected) with secondary sort by `updatedAt DESC` within each group

## Non-goals

- Mobile-specific infinite scroll (table is used on all viewports; mobile users scroll the table)
- Client-side sorting or filtering fallback
- Bulk status change (future feature)
- Column reordering / drag-and-drop
- Saved/named filter presets
- Export of vacancy list (CSV, etc.)
- Edit button in the table (removed — click row to navigate, then edit from detail page)

## Scope

### In scope

1. Replace `VacancyListRow`-based list with `UTable` on `/vacancies`
2. New `GET /api/vacancies` query params: `currentPage`, `pageSize`, `sortBy`, `sortOrder`, `status`, `search`
3. Response shape change: `GET /api/vacancies` returns `{ items: Vacancy[], pagination: { totalItems, totalPages }, columnVisibility: Record<string, boolean> }`
4. New `PATCH /api/user/preferences/vacancy-list` endpoint for column visibility
5. New DB table `user_vacancy_list_preferences` (column visibility JSONB)
6. Zod schemas for request query, response envelope, and column visibility
7. Repository + seed logic for vacancy list preferences
8. Vacancy store: new `fetchVacanciesPaginated` action replacing `fetchVacancies`
9. Bulk delete action in store + API (`DELETE /api/vacancies/bulk`)
10. Column visibility toggle dropdown above the table
11. Status filter (multi-select) above the table
12. Search input above the table (debounced, min 3 chars)
13. Pagination below the table (right-aligned) + page-size selector (left-aligned)
14. i18n keys for all new UI copy
15. Update docs (`endpoints.md`, `schemas.md`)

### Out of scope

- Admin vacancy management
- Vacancy list for other users
- Column width persistence
- Row grouping by status (visual)

## Roles & limits

- **Authenticated users (friend role)**: read/write own vacancies + own vacancy list preferences
- **super_admin**: same as friend for own data (MVP)
- **public / unauthenticated**: no access (redirect to login)
- Rate limits: standard authenticated rate limits apply
- BYOK policy: not applicable (no LLM calls)

## User flows

### 1. First visit to /vacancies (no preferences saved)

1. Page loads → store dispatches `fetchVacanciesPaginated({ currentPage: 1, pageSize: 10 })`
2. Backend finds no `user_vacancy_list_preferences` row → returns default `columnVisibility` (all columns visible)
3. Table renders with all columns, default sort (status-group → updatedAt DESC)
4. Pagination shows total count; page-size selector defaults to 10

### 2. Browsing & sorting

1. User clicks "Updated" column header → triggers `@update:sorting` event
2. Store dispatches `fetchVacanciesPaginated({ ..., sortBy: 'updatedAt', sortOrder: 'desc' })` (currentPage/pageSize carried from current state)
3. Backend returns sorted results; table re-renders
4. Clicking again toggles to ASC, clicking a third time resets to default sort

### 3. Filtering by status

1. User selects "Screening" and "Interview" from the status filter dropdown
2. Store dispatches `fetchVacanciesPaginated({ ..., status: ['screening', 'interview'], currentPage: 1 })`
3. Page resets to 1 on filter change
4. Backend filters + sorts → returns matching rows

### 4. Searching

1. User types "Goo" in the search input (3 chars) → debounce timer (1 s) starts
2. After 1 s, store dispatches `fetchVacanciesPaginated({ ..., search: 'Goo', currentPage: 1 })`
3. Backend performs case-insensitive `ILIKE '%Goo%'` on `company` and `job_position`
4. If user clears input below 3 chars → no request sent; previous full list is refetched

### 5. Row click → navigate to detail

1. User clicks a row (not on checkbox or delete button) → `navigateTo('/vacancies/${id}')`

### 6. Single delete

1. User clicks the delete button (trash icon) on a row → `@click.stop` prevents row navigation
2. Existing delete confirmation modal opens
3. User confirms → `deleteVacancy(id)` → row removed → table refetches current page

### 7. Bulk delete

1. User checks 3 rows via checkboxes
2. Bulk action bar appears above the table: "3 selected — [Delete]"
3. User clicks "Delete" → confirmation modal opens (adapted text for plural)
4. User confirms → `bulkDeleteVacancies(ids)` → store dispatches `DELETE /api/vacancies/bulk` with body `{ ids: string[] }`
5. On success → deselect all → refetch current page → toast notification

### 8. Column visibility toggle

1. User clicks "Columns" dropdown above the table
2. Dropdown shows checkboxes for each toggleable column (all except select/checkbox and actions/delete)
3. User unchecks "Created" → column hides immediately
4. Store dispatches `PATCH /api/user/preferences/vacancy-list` with `{ columnVisibility: { createdAt: false } }`
5. Next `fetchVacanciesPaginated` call will return updated `columnVisibility` in response

### 9. Pagination & page size

1. User selects "25" from page-size selector → page resets to 1 → refetch
2. User clicks page 3 → refetch with `currentPage: 3`
3. Page size is NOT persisted server-side (local state only)

## Data model changes

### New table: `user_vacancy_list_preferences`

Located in `packages/nuxt-layer-api/server/data/schema.ts` (package: `@int/api`).

```typescript
export const userVacancyListPreferences = pgTable('user_vacancy_list_preferences', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' })
    .unique(),
  columnVisibility: jsonb('column_visibility')
    .$type<Record<string, boolean>>()
    .notNull()
    .default({}),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow()
});
```

### New Zod schemas in `packages/schema/` (package: `@int/schema`)

#### Base pagination schemas (`schemas/pagination.ts`)

Reusable across all paginated endpoints.

```typescript
// schemas/pagination.ts

/** Base pagination query params for any paginated endpoint */
export const PaginationQuerySchema = z.object({
  currentPage: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10)
});
export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

/** Base pagination metadata in API responses */
export const PaginationResponseSchema = z.object({
  totalItems: z.number().int().min(0),
  totalPages: z.number().int().min(0)
});
export type PaginationResponse = z.infer<typeof PaginationResponseSchema>;
```

#### Vacancy list schemas (`schemas/vacancy-list.ts`)

```typescript
// schemas/vacancy-list.ts

/** Column visibility state — keys are column IDs, values indicate visibility */
export const VacancyListColumnVisibilitySchema = z.record(z.string(), z.boolean());
export type VacancyListColumnVisibility = z.infer<typeof VacancyListColumnVisibilitySchema>;

/** Query params for GET /api/vacancies — extends base pagination */
export const VacancyListQuerySchema = PaginationQuerySchema.extend({
  sortBy: z.enum(['updatedAt', 'createdAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  status: z
    .union([z.string(), z.array(z.string())])
    .transform(v => (Array.isArray(v) ? v : [v]))
    .pipe(z.array(VacancyStatusSchema))
    .optional(),
  search: z.string().min(3).max(255).optional()
});
export type VacancyListQuery = z.infer<typeof VacancyListQuerySchema>;

/** Response envelope for GET /api/vacancies */
export const VacancyListResponseSchema = z.object({
  items: z.array(VacancySchema),
  pagination: PaginationResponseSchema,
  columnVisibility: VacancyListColumnVisibilitySchema
});
export type VacancyListResponse = z.infer<typeof VacancyListResponseSchema>;

/** Body for PATCH /api/user/preferences/vacancy-list */
export const VacancyListPreferencesPatchSchema = z.object({
  columnVisibility: VacancyListColumnVisibilitySchema
});

/** Body for DELETE /api/vacancies/bulk */
export const VacancyBulkDeleteSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100)
});
```

### Existing models — no changes

`vacancies` table and `VacancySchema` remain unchanged.

## API endpoints

### Changed: `GET /api/vacancies`

**File:** `packages/nuxt-layer-api/server/api/vacancies/index.get.ts` (package: `@int/api`)

**Before:** Returns `Vacancy[]` (all user vacancies, sorted by `createdAt DESC`).

**After:** Accepts query params, returns paginated envelope.

| Param         | Type               | Default | Description                                        |
| ------------- | ------------------ | ------- | -------------------------------------------------- |
| `currentPage` | number             | 1       | Page number (1-based)                              |
| `pageSize`    | number             | 10      | Items per page (1–100)                             |
| `sortBy`      | enum               | —       | `'updatedAt'` or `'createdAt'`                     |
| `sortOrder`   | enum               | —       | `'asc'` or `'desc'`                                |
| `status`      | string \| string[] | —       | Filter by status(es)                               |
| `search`      | string             | —       | Min 3 chars, ILIKE on `company` and `job_position` |

**Response:** `VacancyListResponse`

```json
{
  "items": [
    /* Vacancy[] */
  ],
  "pagination": { "totalItems": 0, "totalPages": 0 },
  "columnVisibility": {
    "company": true,
    "status": true,
    "updatedAt": true,
    "createdAt": true
  }
}
```

**Default sort logic** (when `sortBy` is not provided):

```sql
ORDER BY
  CASE status
    WHEN 'created'   THEN 1
    WHEN 'generated'  THEN 2
    WHEN 'screening'  THEN 3
    WHEN 'interview'  THEN 4
    WHEN 'offer'      THEN 5
    WHEN 'rejected'   THEN 6
  END ASC,
  updated_at DESC
```

### New: `DELETE /api/vacancies/bulk`

**File:** `packages/nuxt-layer-api/server/api/vacancies/bulk.delete.ts` (package: `@int/api`)

**Body:** `{ ids: string[] }` — validated with `VacancyBulkDeleteSchema`

**Behavior:**

- Validates all IDs belong to the authenticated user
- Deletes all matching vacancies (cascade deletes generations)
- Returns `204 No Content`
- If any ID doesn't belong to user → `403` for the whole request (atomic)

### New: `PATCH /api/user/preferences/vacancy-list`

**File:** `packages/nuxt-layer-api/server/api/user/preferences/vacancy-list.patch.ts` (package: `@int/api`)

**Body:** `{ columnVisibility: Record<string, boolean> }` — validated with `VacancyListPreferencesPatchSchema`

**Behavior:**

- Upserts `user_vacancy_list_preferences` row
- Merges incoming `columnVisibility` with existing (spread)
- Returns updated `columnVisibility`

## i18n keys

New keys under `vacancy.list` namespace in `apps/site/i18n/locales/en.json`:

```json
{
  "vacancy": {
    "list": {
      "title": "Job Vacancies",
      "empty": "No vacancies yet",
      "emptyDescription": "Add your first job vacancy to start tailoring resumes",
      "createButton": "Add Vacancy",
      "count": "{count} vacancy(ies)",
      "perPage": "Per page:",
      "allLoaded": "All vacancies loaded",

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
    }
  }
}
```

## Security & privacy notes

- **Ownership enforcement**: all queries filter by `userId` from session — no cross-user data leakage
- **Bulk delete**: validates every ID belongs to the session user before deletion; rejects the whole batch if any ID fails ownership check
- **Search input**: server-side `ILIKE` uses parameterized queries (Drizzle ORM) — no SQL injection risk
- **Column visibility**: stored per-user; no sensitive data exposed; keys are column identifiers only
- **Rate limiting**: standard authenticated rate limits apply to all new endpoints
- **Input validation**: all query params and request bodies validated with Zod schemas before processing

## Acceptance criteria

1. `/vacancies` page renders a `UTable` with columns: select (checkbox), company/position, status, updated date, created date, delete action
2. Clicking a row navigates to `/vacancies/:id`
3. Clicking the delete button opens the existing confirmation modal; confirming deletes the vacancy
4. Selecting rows via checkboxes shows a bulk action bar with "Delete selected"
5. Bulk delete confirms via modal, deletes all selected, shows success toast, deselects rows
6. Column headers for "Updated" and "Created" are sortable; clicking triggers server-side sort
7. Default sort groups by status (created → generated → screening → interview → offer → rejected), then by updatedAt DESC
8. Status filter dropdown allows multi-select; filtering triggers server-side request with page reset
9. Search input triggers server-side search after 1 s debounce and 3+ characters
10. Column visibility dropdown hides/shows columns; preference is persisted server-side
11. On reload, column visibility preference is restored from the server response
12. Pagination (right-aligned) and page-size selector (left-aligned) appear below the table
13. Page-size selector offers [10, 25, 50, 100] options; not persisted server-side
14. Empty state shows existing empty-state UI when no vacancies exist
15. Loading state shows table loading indicator during data fetches
16. All new UI text uses i18n keys (no hardcoded strings)
17. Table is responsive (horizontal scroll on narrow viewports if needed)

## Test plan

### Unit tests

| #   | Test                                                                  | Location                   |
| --- | --------------------------------------------------------------------- | -------------------------- |
| 1   | `VacancyListQuerySchema` validates valid params, rejects invalid      | `packages/schema/`         |
| 2   | `VacancyBulkDeleteSchema` validates ID array, rejects empty/oversized | `packages/schema/`         |
| 3   | `VacancyListColumnVisibilitySchema` validates record shape            | `packages/schema/`         |
| 4   | Vacancy repository `findPaginated` returns correct page + totalItems  | `packages/nuxt-layer-api/` |
| 5   | Vacancy repository `findPaginated` applies status filter correctly    | `packages/nuxt-layer-api/` |
| 6   | Vacancy repository `findPaginated` applies search ILIKE correctly     | `packages/nuxt-layer-api/` |
| 7   | Vacancy repository `findPaginated` applies default status-group sort  | `packages/nuxt-layer-api/` |
| 8   | Vacancy repository `bulkDelete` removes only user's vacancies         | `packages/nuxt-layer-api/` |
| 9   | Preferences repository upserts column visibility correctly            | `packages/nuxt-layer-api/` |

### E2E tests

| #   | Test                            | Description                                                    |
| --- | ------------------------------- | -------------------------------------------------------------- |
| 1   | Table renders with default data | Navigate to `/vacancies`, verify table columns and rows        |
| 2   | Row click navigates             | Click a row, verify URL changes to `/vacancies/:id`            |
| 3   | Single delete                   | Click delete button, confirm modal, verify row removed         |
| 4   | Bulk delete                     | Select 2 rows, click bulk delete, confirm, verify rows removed |
| 5   | Sort by updatedAt               | Click column header, verify order changes                      |
| 6   | Status filter                   | Select a status, verify filtered results                       |
| 7   | Search                          | Type 3+ chars, wait 1s, verify filtered results                |
| 8   | Column toggle                   | Hide a column, reload page, verify column stays hidden         |
| 9   | Pagination                      | Navigate to page 2, verify correct rows shown                  |
| 10  | Page size change                | Change to 25, verify 25 rows rendered                          |

## Rollout notes

### Database migration

- **New table**: `user_vacancy_list_preferences` — additive, no data loss risk
- **No existing table changes** — `vacancies` table is untouched
- Run migration before deploying new code: `pnpm drizzle-kit generate` then `pnpm drizzle-kit migrate`

### Breaking change: `GET /api/vacancies` response shape

- **Before**: returns `Vacancy[]`
- **After**: returns `{ items: Vacancy[], pagination: { totalItems: number, totalPages: number }, columnVisibility: Record<string, boolean> }`
- This is a breaking change for any consumer of this endpoint. Since the only consumer is the vacancy store in the site app, the migration is internal and coordinated.

### Feature flags

- No feature flag needed — this is a full replacement deployed together (frontend + backend)

### Backfill

- No backfill needed — `user_vacancy_list_preferences` rows are created lazily on first access (default column visibility returned if no row exists)

## Implementation notes / Repo touchpoints

### Layer: `packages/nuxt-layer-api/` (package: `@int/api`)

| File                                                   | Action                                                                                     |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| `server/data/schema.ts`                                | Add `userVacancyListPreferences` table definition                                          |
| `server/data/repositories/vacancy.ts`                  | Add `findPaginated()` method with sort/filter/search/pagination, add `bulkDelete()` method |
| `server/data/repositories/vacancy-list-preferences.ts` | **New** — CRUD for column visibility preferences                                           |
| `server/data/repositories/index.ts`                    | Export new repository                                                                      |
| `server/api/vacancies/index.get.ts`                    | Rewrite to accept query params, return paginated envelope                                  |
| `server/api/vacancies/bulk.delete.ts`                  | **New** — bulk delete endpoint                                                             |
| `server/api/user/preferences/vacancy-list.patch.ts`    | **New** — column visibility PATCH                                                          |

### Layer: `packages/schema/` (package: `@int/schema`)

| File                      | Action                                                                                                    |
| ------------------------- | --------------------------------------------------------------------------------------------------------- |
| `schemas/pagination.ts`   | **New** — base `PaginationQuerySchema`, `PaginationResponseSchema` (reusable for all paginated endpoints) |
| `schemas/vacancy-list.ts` | **New** — query (extends pagination), response, column visibility, bulk delete schemas                    |
| `index.ts`                | Export new schemas and types from both files                                                              |

### Layer: `apps/site/layers/vacancy/` (site vacancy layer)

| File                                | Action                                                                                                                  |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `app/pages/vacancies/index.vue`     | Rewrite to use `UTable` with sorting, filtering, search, pagination, column toggle, bulk actions                        |
| `app/stores/index.ts`               | Add `fetchVacanciesPaginated`, `bulkDeleteVacancies`, `updateColumnVisibility` actions; add `vacancyListResponse` state |
| `app/infrastructure/vacancy.api.ts` | Update `fetchAll()` → `fetchPaginated(query)`, add `bulkDelete(ids)`, add `updateColumnVisibility(data)`                |
| `app/components/ListRow.vue`        | **Delete** (no longer used)                                                                                             |

### i18n

| File                             | Action                                                                                                              |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `apps/site/i18n/locales/en.json` | Add new keys under `vacancy.list.columns`, `vacancy.list.search`, `vacancy.list.filter`, `vacancy.list.bulkActions` |

### Docs

| File                    | Action                                                                                                                  |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `docs/api/endpoints.md` | Document changed `GET /api/vacancies`, new `DELETE /api/vacancies/bulk`, new `PATCH /api/user/preferences/vacancy-list` |
| `docs/api/schemas.md`   | Document new schemas                                                                                                    |

## Open questions / assumptions

1. **Mobile UX**: The spec assumes the table is used on all viewports (with horizontal scroll). If a mobile-specific card view is desired, that should be a separate feature. _(Assumption: table for all viewports)_
2. **Column visibility defaults**: When no preference exists, all columns are visible. The column IDs used are: `company`, `status`, `updatedAt`, `createdAt`. The `select` and `actions` columns are always visible and not toggleable. _(Assumption: confirmed by requirements)_
3. **Search debounce**: 1 second debounce with minimum 3 characters. If the user clears the search to below 3 chars, the full (unfiltered) list is refetched immediately. _(Assumption: based on requirements)_
4. **Default sort when user clicks "sort" then removes it**: After cycling through ASC → DESC → reset, the default status-group sort is restored. _(Assumption: standard UTable behavior with manual sort cycle)_
5. **Bulk delete limit**: Max 100 IDs per request to prevent abuse. _(Assumption: reasonable limit)_
6. **`ListRow.vue` removal**: The existing `VacancyListRow` component is deleted since the table replaces it entirely. The edit button is also removed from the list — users navigate to the detail page to edit. _(Confirm with user if edit action should remain accessible from the list)_
