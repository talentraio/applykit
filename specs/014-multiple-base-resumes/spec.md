# 014 — Multiple Base Resumes

## Overview

Enable users to create and maintain multiple base resumes. Currently the system enforces a single-resume-per-user model (latest resume is always "the" resume). This feature lifts that restriction: users can have N base resumes, each with its own name, content, and format settings. One resume is always marked as **default** (pointer stored on the user record to avoid boolean-flag collisions). On the vacancy page, when multiple resumes exist, the user picks which base resume to adapt before generation starts.

## Goals

- Allow users to create multiple base resumes via "duplicate current" flow
- Introduce a **default resume** concept (stored as `defaultResumeId` FK on `users` table)
- Migrate format settings from global user-level to per-resume
- Add resume selector (below tabs) for quick switching when >1 resume exists
- Add `name` field to resume entity with auto-generated defaults (`dd.MM.yyyy` for first, `copy <prev>` for duplicates)
- On vacancy page, if >1 resume exists, show a dropdown to pick which base resume to adapt before generation
- Support deletion of non-default resumes with confirmation modal

## Non-goals

- Resume templates / pre-built layouts
- Resume sharing / collaboration between users
- Resume comparison / diff view
- Merge or combine content from multiple resumes
- Bulk operations on resumes (bulk delete, bulk export)
- Resume versioning changes (existing `resume_versions` table is unaffected)
- Admin-side visibility of user's multiple resumes (out of scope for MVP)
- Showing which base resume was used for a past generation on the vacancy page (data stored, deferred to future feature)

## Scope

### In scope

- DB migration: add `defaultResumeId` FK to `users`, add `name` column to `resumes`, migrate `user_format_settings` to per-resume `resume_format_settings`
- New API endpoints for multi-resume CRUD (list, get-by-id, duplicate, delete, set-default)
- Refactored resume page with `[id]` dynamic route
- Resume name editing in Settings tab
- Default-resume toggle component (standalone, reusable)
- Resume selector below tabs (visible when >1 resume)
- Vacancy generation: resume picker dropdown when >1 resume exists
- Delete resume button (icon-only) for non-default resumes
- Duplicate resume button next to "Clear and create new"
- Redirect logic: `/resume` -> `/resume/[defaultResumeId]` when resumes exist
- Migration of existing `user_format_settings` data to per-resume `resume_format_settings`

### Out of scope

- Admin panel changes for viewing user resumes
- Changes to resume parsing / LLM parse flow
- Changes to export flow (export already works per-generation, not per-base-resume)
- Resume version history UI

## Roles & limits

| Role          | Capability                                                  |
| ------------- | ----------------------------------------------------------- |
| `super_admin` | Full access (same as friend)                                |
| `friend`      | Create/manage multiple base resumes (no hard limit for MVP) |
| `public`      | Not applicable (no access to resume features)               |

- BYOK policy: unchanged. Multi-resume is purely a data-organization feature; LLM costs remain per-generation.
- No additional daily limits for resume creation (existing generation limits per vacancy still apply).

## User flows

### UF-1: First-time user (no resumes)

1. User navigates to `/resume`
2. Page shows upload form (`ResumeFormUpload`) — same as current behavior
3. After successful upload/creation, resume is created with:
   - `name` = formatted creation date (`dd.MM.yyyy`)
   - `users.defaultResumeId` set to this resume's ID
   - Per-resume format settings seeded with defaults
4. User is redirected to `/resume/[id]`

### UF-2: Returning user navigates to `/resume`

1. Middleware checks: user has resumes? -> redirect to `/resume/[defaultResumeId]`
2. If `defaultResumeId` is null/stale (resume was deleted), fall back to most recent resume

### UF-3: Duplicate current resume

1. User is on `/resume/[id]` (any tab)
2. Clicks "Duplicate" button (placed left of "Clear and create new")
3. API creates a new resume row:
   - `content` = deep clone of current resume's content
   - `name` = `copy <currentResumeName>`
   - `sourceFileName` / `sourceFileType` = copied from source
   - New per-resume format settings = deep clone of current resume's format settings
4. User is navigated to `/resume/[newId]`
5. Toast notification: "Resume duplicated"

### UF-4: Switch between resumes

1. User is on `/resume/[id]` with >1 resume
2. Resume selector (below tabs, above content) shows all resumes as dropdown
3. Default resume is shown first in the list, marked visually
4. User selects another resume:
   - Any pending autosave is flushed immediately (save current resume before navigation)
   - Then navigated to `/resume/[selectedId]`

### UF-5: Set resume as default

1. User is on `/resume/[id]` for a non-default resume
2. "Default resume" component shows a button: "Make default"
3. Click -> API updates `users.defaultResumeId` to current resume ID
4. Component updates to show disabled state: "This is the default resume"
5. Toast notification: "Default resume updated"

### UF-6: Delete non-default resume

1. User is on `/resume/[id]` for a non-default resume
2. Delete button (icon-only, leftmost in the action row with "Clear and create new") is visible
3. Click -> confirmation modal opens (programmatic overlay via `useProgrammaticOverlay`)
4. Confirm -> API deletes resume + its format settings (cascade)
5. User navigated to `/resume/[defaultResumeId]`
6. Toast notification: "Resume deleted"
7. If deleted resume had generations linked, those generations remain (orphaned `resumeId` is acceptable; generation content is self-contained)

### UF-7: Edit resume name

1. User navigates to Settings tab on `/resume/[id]`
2. New text input "Resume name" appears above Format Settings section
3. User edits the name
4. Auto-saved via existing content autosave mechanism (debounced PUT)

### UF-8: Generate adapted resume from vacancy (multi-resume)

1. User is on vacancy page, clicks "Generate" / "Regenerate"
2. **If 1 resume**: generation starts immediately (current behavior, no change)
3. **If >1 resumes**: dropdown menu appears with list of base resumes
   - Default resume is always first, visually distinguished
   - Each item shows resume name
4. User selects a resume -> generation starts with `resumeId` passed to API
5. Rest of the flow is unchanged (navigation to `/vacancies/:id/resume`)

### UF-9: "Clear and create new" (existing flow, adjusted)

1. User clicks "Clear and create new" on `/resume/[id]`
2. Upload modal opens (same as current)
3. On successful upload/create-from-scratch:
   - **Current resume's content is replaced** (same as current `replaceBaseData` behavior)
   - Resume `name` is NOT changed
   - Format settings are NOT reset
4. User stays on `/resume/[id]` with updated content

## UI / pages

### Page: `/resume` (redirect-only for returning users)

- **No resume exists**: show `ResumeFormUpload` (current behavior)
- **Resume(s) exist**: redirect to `/resume/[defaultResumeId]`
- Implementation: page-level middleware or inline redirect in `useAsyncData`

### Page: `/resume/[id]`

- New dynamic route page
- Loads specific resume by ID (with ownership check)
- Layout: `editor` (same as current `/resume`)
- Components (top to bottom in left panel):
  1. **Tabs**: Edit | Settings | AI Enhance (unchanged)
  2. **Resume selector** (below tabs, only if >1 resume): `<USelectMenu>` dropdown
  3. **Tab content** (depends on active tab):
     - Edit tab:
       - `<ResumeForm>` (unchanged)
       - `<ResumeDefaultToggle>` (full-width, above action buttons)
       - Action buttons row:
         - Delete button (icon-only, leftmost) — only for non-default resumes
         - Duplicate button — always visible
         - "Clear and create new" button — always visible (rightmost)
     - Settings tab:
       - **Resume name input** (new, above Format Settings)
       - Format Settings (per-resume, same UI as current)
     - AI Enhance tab: unchanged

### Component: `ResumeDefaultToggle`

- Standalone, reusable component
- Props: `resumeId: string`, `isDefault: boolean`
- If `isDefault = true`: disabled button, label "This is the default resume"
- If `isDefault = false`: active button, label "Make default"
- Emits: `@update` after successful API call
- Full-width layout, placed above the action buttons row in Edit tab

### Component: Resume selector

- `<USelectMenu>` with resume list
- Shows resume `name` for each option
- Default resume marked (e.g., with a badge or "(default)" suffix)
- On change: `navigateTo('/resume/' + selectedId)`
- Only rendered when `resumes.length > 1`

### Vacancy page: generation resume picker

- When user has >1 resume and clicks Generate/Regenerate:
  - Instead of immediately calling generate, show a `<UDropdownMenu>` with resume options
  - Default resume first in the list
  - On select: call `generateResume(vacancyId, { resumeId: selectedId })`
- When user has exactly 1 resume: current behavior (direct generate, no picker)

## Data model

All schemas live in `packages/nuxt-layer-schema/ (package: @int/schema)` for Zod types and `packages/nuxt-layer-api/server/data/ (package: @int/api)` for Drizzle definitions.

### DB changes

#### 1. `users` table — add `defaultResumeId`

```
ALTER TABLE users ADD COLUMN default_resume_id uuid REFERENCES resumes(id) ON DELETE SET NULL;
```

- `ON DELETE SET NULL` ensures that if the default resume is deleted, the field becomes null (fallback to most-recent logic kicks in)
- Nullable: yes (user may have no resumes yet)

#### 2. `resumes` table — add `name`

```
ALTER TABLE resumes ADD COLUMN name varchar(255) NOT NULL DEFAULT '';
```

- Data migration: set `name = TO_CHAR(created_at, 'DD.MM.YYYY')` for all existing resumes

#### 3. New table: `resume_format_settings`

```sql
CREATE TABLE resume_format_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resume_id uuid NOT NULL REFERENCES resumes(id) ON DELETE CASCADE UNIQUE,
  ats jsonb NOT NULL,
  human jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_resume_format_settings_resume_id ON resume_format_settings(resume_id);
```

- One-to-one with `resumes` (unique constraint on `resume_id`)
- Data migration: for each existing resume, copy the user's `user_format_settings` row into `resume_format_settings`

#### 4. Drop `user_format_settings` table

- Migration step: copy each user's settings to their resume(s)' `resume_format_settings` rows first
- Then drop `user_format_settings` table entirely
- Remove `/api/user/format-settings` endpoints (GET, PATCH, PUT)
- New endpoints operate on `/api/resumes/:id/format-settings`

### Zod schemas (additions)

```ts
// Resume entity — extended
const resumeSchema = z.object({
  // ... existing fields ...
  name: z.string().min(1).max(255),
  isDefault: z.boolean() // computed at API layer, not stored per-resume
});

// Resume list item (lightweight, for selectors)
const resumeListItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  isDefault: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date()
});

// Duplicate resume request
const duplicateResumeRequestSchema = z.object({
  sourceResumeId: z.string().uuid()
});

// Set default resume request
const setDefaultResumeRequestSchema = z.object({
  resumeId: z.string().uuid()
});

// Update resume name request
const updateResumeNameSchema = z.object({
  name: z.string().min(1).max(255)
});
```

### `isDefault` — computed field

- **Not stored in `resumes` table** (avoids boolean-flag collision risk)
- Stored as `users.default_resume_id` FK
- Computed at API response time: `isDefault = (resume.id === user.defaultResumeId)`
- If `user.defaultResumeId` is null, fallback: most recent resume is treated as default

## API surface

All endpoints in `packages/nuxt-layer-api/server/api/ (package: @int/api)`.

### New endpoints

| Method   | Path                               | Description                                                        |
| -------- | ---------------------------------- | ------------------------------------------------------------------ |
| `GET`    | `/api/resumes`                     | List all user's resumes (lightweight: id, name, isDefault, dates)  |
| `GET`    | `/api/resumes/:id`                 | Get full resume by ID (with ownership check, includes `isDefault`) |
| `POST`   | `/api/resumes/:id/duplicate`       | Duplicate resume (content + format settings)                       |
| `DELETE` | `/api/resumes/:id`                 | Delete resume (only non-default; 409 if default)                   |
| `PUT`    | `/api/resumes/:id/name`            | Update resume name                                                 |
| `PUT`    | `/api/user/default-resume`         | Set default resume ID                                              |
| `GET`    | `/api/resumes/:id/format-settings` | Get per-resume format settings                                     |
| `PATCH`  | `/api/resumes/:id/format-settings` | Patch per-resume format settings                                   |

### Modified endpoints

| Method  | Path                          | Change                                                                                                                                         |
| ------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET`   | `/api/resumes`                | Returns list of user's resumes (default first, then `createdAt DESC`).                                                                         |
| `POST`  | `/api/resumes`                | Now always creates a new resume (no upsert). Sets as default if it's the first. Returns new resume with `isDefault`. Enforces 10-resume limit. |
| `PUT`   | `/api/resumes/:id`            | Updates requested resume content/title and creates a version entry when content changes.                                                       |
| `GET`   | `/api/user/format-settings`   | **Removed**. Replaced by `GET /api/resumes/:id/format-settings`.                                                                               |
| `PATCH` | `/api/user/format-settings`   | **Removed**. Replaced by `PATCH /api/resumes/:id/format-settings`.                                                                             |
| `PUT`   | `/api/user/format-settings`   | **Removed**. No replacement (PATCH covers all use cases).                                                                                      |
| `POST`  | `/api/vacancies/:id/generate` | No server change needed (already accepts `resumeId`). Client-side change to pass `resumeId`.                                                   |

### Endpoint details

#### `GET /api/resumes`

- Returns: `{ items: ResumeListItem[] }` sorted by: default first, then `createdAt DESC`
- Each item includes computed `isDefault`

#### `POST /api/resumes/:id/duplicate`

- Clones `content`, `sourceFileName`, `sourceFileType` from source resume
- Sets `name` = `copy <source.name>`
- Clones format settings from source resume into new `resume_format_settings` row
- Returns: full new resume object
- Error: 404 if source not found or not owned by user

#### `DELETE /api/resumes/:id`

- Prevents deletion of default resume (HTTP 409 Conflict)
- Cascades: deletes `resume_format_settings` (FK cascade)
- Does NOT cascade to `generations` — generation rows keep their `resumeId` as historical reference
- Returns: 204 No Content

#### `PUT /api/user/default-resume`

- Body: `{ resumeId: string }`
- Validates resume exists and belongs to user
- Updates `users.default_resume_id`
- Returns: `{ success: true }`

#### `GET /api/resumes/:id/format-settings`

- Returns per-resume format settings
- Auto-seeds defaults if no settings exist for this resume
- Same response shape as current `GET /api/user/format-settings`

#### `PATCH /api/resumes/:id/format-settings`

- Same deep-partial merge logic as current `PATCH /api/user/format-settings`
- Operates on `resume_format_settings` table instead of `user_format_settings`

## LLM workflows

No changes to LLM workflows. The parse and generate pipelines remain the same:

- **Parse**: triggered by `POST /api/resumes` (file upload) — creates a new resume row (unchanged)
- **Generate**: triggered by `POST /api/vacancies/:id/generate` — already accepts `resumeId` parameter. Client-side now passes it explicitly when user picks from the dropdown.

Zod validation in LLM services is unchanged.

## Clarifications

### Session 2026-02-19

- Q: Maximum number of base resumes per user? → A: 10 resumes max per user, server-enforced
- Q: `user_format_settings` deprecation timeline? → A: Drop table and old endpoints in this feature (clean cut, no deprecation period)
- Q: Unsaved resume changes when switching via selector? → A: Auto-save current resume before navigating (flush pending debounce)
- Q: Duplicate naming collision strategy? → A: Simple prefix — always prepend `copy ` (e.g., `copy copy My Resume`)
- Q: Generation history — show which base resume was used? → A: Deferred — out of scope for this feature (data already stored in `generations.resumeId`)

## Limits & safety

- **Hard limit: 10 base resumes per user** (server-enforced; `POST /api/resumes` and `POST /api/resumes/:id/duplicate` return HTTP 409 when limit reached)
- Per-user daily generation limits remain unchanged
- Global budget cap and admin kill switch remain unchanged
- Delete confirmation modal prevents accidental deletion
- Cannot delete the default resume (server-enforced)

## Security & privacy

- All resume endpoints enforce ownership: `userId` from session must match resume's `userId`
- `DELETE /api/resumes/:id` refuses to delete default resume (409)
- `POST /api/resumes/:id/duplicate` validates ownership of source resume
- No cross-user resume access
- Resume deletion is soft in terms of generations: generation records keep `resumeId` as historical data, but the base resume content is permanently deleted
- No new auth/session changes required

## i18n keys

All user-facing strings must use i18n. New keys (examples, exact keys follow project naming conventions):

```
resume.page.duplicateResume
resume.page.deleteResume
resume.page.deleteResumeConfirmTitle
resume.page.deleteResumeConfirmDescription
resume.page.deleteResumeConfirmAction
resume.page.deleteResumeConfirmCancel
resume.page.resumeDeleted
resume.page.resumeDuplicated
resume.page.defaultResumeUpdated
resume.page.makeDefault
resume.page.thisIsDefaultResume
resume.page.selectResume
resume.settings.resumeName
resume.settings.resumeNamePlaceholder
vacancy.generation.selectBaseResume
```

## Monorepo / layers touchpoints

| Layer                | Path                          | Package       | Changes                                                                                                                                                                                                                 |
| -------------------- | ----------------------------- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Schema               | `packages/nuxt-layer-schema/` | `@int/schema` | Add `resumeListItemSchema`, `duplicateResumeRequestSchema`, `setDefaultResumeRequestSchema`, `updateResumeNameSchema`. Extend resume response schema with `name` and `isDefault`.                                       |
| API                  | `packages/nuxt-layer-api/`    | `@int/api`    | New endpoints, DB migration, `resume_format_settings` table, `defaultResumeId` on users, resume repository updates.                                                                                                     |
| UI                   | `packages/nuxt-layer-ui/`     | `@int/ui`     | No changes expected (uses existing `useProgrammaticOverlay`).                                                                                                                                                           |
| Site / Resume layer  | `apps/site/layers/resume/`    | —             | New page `/resume/[id]`, `ResumeDefaultToggle` component, resume selector, duplicate button, delete button + modal, resume name input in Settings, store refactor for multi-resume, updated `resumeApi` infrastructure. |
| Site / Vacancy layer | `apps/site/layers/vacancy/`   | —             | Generation button: add resume picker dropdown when >1 resume. Pass `resumeId` to `generateResume()`.                                                                                                                    |
| Site / Base layer    | `apps/site/layers/_base/`     | —             | Remove user-level format settings store; replace with per-resume format settings logic in the resume layer.                                                                                                             |

## Acceptance criteria

1. **AC-1**: User with no resumes lands on `/resume` and can create first resume. After creation, redirected to `/resume/[id]`. First resume auto-set as default.
2. **AC-2**: User with existing resume(s) navigating to `/resume` is redirected to `/resume/[defaultResumeId]`.
3. **AC-3**: "Duplicate" button creates a copy of current resume with name `copy <currentName>` and navigates to the new resume page.
4. **AC-4**: Resume selector appears below tabs only when >1 resume exists. Selecting a different resume navigates to its page.
5. **AC-5**: `ResumeDefaultToggle` correctly shows "Make default" for non-default resumes and "This is the default resume" (disabled) for default.
6. **AC-6**: Setting a new default updates `users.defaultResumeId` and UI reflects immediately.
7. **AC-7**: Delete button appears only for non-default resumes. Deletion requires modal confirmation. After deletion, user is redirected to default resume.
8. **AC-8**: Cannot delete default resume (button not shown; server returns 409 if attempted via API).
9. **AC-9**: Resume name is editable in Settings tab, auto-saved on change.
10. **AC-10**: Each resume has its own format settings (spacing, localization). Duplicating a resume clones its format settings.
11. **AC-11**: On vacancy page with >1 resume, Generate/Regenerate shows dropdown to pick base resume. Default resume is first in list. Selection triggers generation with chosen `resumeId`.
12. **AC-12**: On vacancy page with exactly 1 resume, Generate/Regenerate works as before (no picker).
13. **AC-13**: "Clear and create new" replaces current resume's content (same behavior as now), does not affect name or format settings.
14. **AC-14**: All new UI strings use i18n keys.
15. **AC-15**: DB migration handles existing data: sets `name` from `created_at` date, copies `user_format_settings` to `resume_format_settings`, sets `defaultResumeId` to most recent resume.

## Edge cases

1. **Stale `defaultResumeId`**: If referenced resume was deleted (via direct DB or race condition), fallback to most recent resume by `createdAt DESC`. API must handle `defaultResumeId` pointing to non-existent resume gracefully.
2. **User has resumes but `defaultResumeId` is null**: Treat most recent resume as default. On next interaction that reads default, auto-set it.
3. **Concurrent duplicate requests**: Each creates a separate resume; no conflict since they generate new UUIDs.
4. **Navigate to `/resume/[id]` for another user's resume**: Return 404 (ownership check).
5. **Navigate to `/resume/[id]` for deleted resume**: Return 404, client navigates to `/resume` (which will redirect to default).
6. **Last remaining resume**: Cannot be deleted because it's always the default. If user wants to start fresh, use "Clear and create new".
7. **Generation with deleted resume ID**: If someone bookmarked a vacancy page and the base resume used for previous generation was deleted, regeneration falls back to default resume (or shows picker if >1 resume).
8. **Format settings migration**: Existing users with `user_format_settings` must have those settings copied to each of their resumes' `resume_format_settings`. If a user has no `user_format_settings`, per-resume settings are seeded with defaults on first access.
9. **Resume name uniqueness**: Not enforced. Users can have two resumes with the same name. The selector shows all names; ID is used for routing.
10. **Autosave flush on switch**: When switching resumes via selector, pending autosave is flushed immediately. If the save fails (network error), navigation still proceeds (data was already saved on previous successful autosave; only the latest debounced delta may be lost).

## Testing plan

### Unit tests

- Resume repository: `duplicate()`, `delete()`, ownership checks
- Default resume logic: fallback when `defaultResumeId` is null/stale
- `isDefault` computation in API response serialization
- Resume name auto-generation (`dd.MM.yyyy`, `copy <name>`)

### Integration tests

- API endpoint tests for all new/modified endpoints
- Ownership validation (cannot access/modify other user's resumes)
- Cannot delete default resume (409)
- Duplicate copies content + format settings correctly
- Format settings migration from `user_format_settings` to `resume_format_settings`

### E2E tests (if applicable)

- Create first resume -> verify redirect to `/resume/[id]`
- Duplicate resume -> verify new page, new name, cloned content
- Switch between resumes via selector
- Delete non-default resume -> verify redirect to default
- Set new default -> verify UI update
- Vacancy generation with resume picker (>1 resume)

## Open questions / NEEDS CLARIFICATION

1. ~~**Maximum resume limit**~~: Resolved — 10 resumes max per user, server-enforced.
2. ~~**`user_format_settings` deprecation timeline**~~: Resolved — Drop table and endpoints in this feature (clean cut).
3. ~~**Generation history**~~: Resolved — Deferred, out of scope (data stored in `generations.resumeId`, can surface later).
4. ~~**Resume ordering in selector**~~: Resolved — Fixed order: default first, then by `createdAt DESC`. No custom reordering for MVP.
5. ~~**Duplicate naming collision**~~: Resolved — Simple prefix, always prepend `copy ` (user can rename in Settings).
