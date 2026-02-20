# Quickstart: Multiple Base Resumes

## Prerequisites

- Node.js 20 LTS
- pnpm 9+
- PostgreSQL (local or Neon)
- Drizzle ORM CLI (`pnpm --filter @int/api db:*`)

## Implementation Order

### Phase 1: Schema & Backend (no UI changes)

1. **Drizzle schema changes** (`packages/nuxt-layer-api/server/data/schema.ts`)
   - Add `defaultResumeId` to `users` table
   - Add `name` column to `resumes` table
   - Add `resumeFormatSettings` table definition
   - Remove `userFormatSettings` table definition

2. **Generate & apply migration**

   ```bash
   pnpm --filter @int/api db:generate
   # Review generated SQL, add data migration statements
   pnpm --filter @int/api db:migrate
   ```

3. **Zod schemas** (`packages/nuxt-layer-schema/`)
   - Extend resume schema with `name` and `isDefault`
   - Add `ResumeListItem` schema
   - Add request schemas (`setDefaultResumeRequest`, `updateResumeName`)

4. **Repository layer** (`packages/nuxt-layer-api/server/data/repositories/`)
   - Create `resume-format-settings.ts` repository
   - Extend `resume.ts` with `duplicate()`, `updateName()`, `findListByUserId()`
   - Extend `user.ts` with `updateDefaultResumeId()`, `getDefaultResumeId()`
   - Remove `format-settings.ts` (after migration)

5. **API endpoints** (`packages/nuxt-layer-api/server/api/`)
   - New: `GET /api/resumes`, `GET /api/resumes/:id`, `POST /api/resumes/:id/duplicate`, `DELETE /api/resumes/:id`, `PUT /api/resumes/:id/name`, `PUT /api/user/default-resume`, `GET /api/resumes/:id/format-settings`, `PATCH /api/resumes/:id/format-settings`
   - Modify: `POST /api/resumes`, `PUT /api/resumes/:id`
   - Remove: `GET/PATCH/PUT /api/user/format-settings`

### Phase 2: Client Infrastructure (API client + Store)

6. **Resume API client** (`apps/site/layers/resume/app/infrastructure/resume.api.ts`)
   - Add methods: `fetchList()`, `fetchById()`, `duplicate()`, `deleteResume()`, `updateName()`, `setDefault()`, `fetchFormatSettings()`, `patchFormatSettings()`

7. **Format settings store** (`apps/site/layers/_base/app/stores/format-settings.ts`)
   - Refactor to accept `resumeId` parameter in `fetchSettings()`, `patchSettings()`
   - Change API paths from `/api/user/format-settings` to `/api/resumes/:id/format-settings`

8. **Resume store** (`apps/site/layers/resume/app/stores/index.ts`)
   - Add `activeResumeId` state
   - Add `resumeList` state (lightweight list for selectors)
   - Fix `_upsertCachedResume()` to properly maintain multi-resume cache
   - Add actions: `fetchResumeList()`, `fetchResumeById()`, `duplicateResume()`, `deleteResume()`, `setDefaultResume()`, `updateResumeName()`

9. **useResume composable** (`apps/site/layers/resume/app/composables/useResume.ts`)
   - Make resume-id-aware (use `activeResumeId` instead of hardcoded index 0)
   - Wire format settings to per-resume endpoints

### Phase 3: UI Components & Pages

10. **Resume page refactor** (`apps/site/layers/resume/app/pages/`)
    - Modify `resume.vue`: redirect to `/resume/[defaultResumeId]` when resumes exist
    - Create `resume/[id].vue`: dynamic route, loads resume by ID

11. **New components** (`apps/site/layers/resume/app/components/editor/`)
    - `Selector.vue`: resume selector dropdown (below tabs)
    - `DefaultToggle.vue`: standalone default resume toggle
    - `modal/DeleteConfirm.vue`: delete confirmation modal

12. **Editor Tools update** (`apps/site/layers/resume/app/components/editor/Tools.vue`)
    - Add duplicate button (left of "Clear and create new")
    - Add delete button (icon-only, leftmost, non-default only)
    - Add `DefaultToggle` component above action buttons
    - Wire resume selector

13. **Settings tab** — add resume name input above Format Settings

14. **i18n keys** — add all new translation keys

### Phase 4: Vacancy Integration

15. **Vacancy generate flow** (`apps/site/layers/vacancy/app/components/Item/overview/Content/`)
    - If >1 resume: show dropdown to pick base resume before generation
    - Pass `resumeId` to `vacancyStore.generateResume()`

## Key Files to Read First

Before starting implementation, read these files to understand current patterns:

1. `docs/codestyle/base.md` — coding conventions
2. `packages/nuxt-layer-api/server/data/schema.ts` — current DB schema
3. `packages/nuxt-layer-api/server/data/repositories/resume.ts` — resume repo pattern
4. `packages/nuxt-layer-api/server/data/repositories/format-settings.ts` — format settings repo pattern
5. `apps/site/layers/resume/app/stores/index.ts` — resume store
6. `apps/site/layers/resume/app/composables/useResume.ts` — resume composable
7. `apps/site/layers/resume/app/infrastructure/resume.api.ts` — API client
8. `apps/site/layers/resume/app/pages/resume.vue` — current resume page
9. `apps/site/layers/resume/app/components/editor/Tools.vue` — editor tools with tabs

## Testing Strategy

- **Unit tests**: Repository methods (`duplicate`, `delete`, `updateName`), `isDefault` computation, name generation
- **Integration tests**: All new API endpoints, ownership validation, 10-resume limit, format settings migration
- **Manual verification**: UI flows (create, duplicate, switch, delete, set default, vacancy picker)

## Verification Checklist

- [ ] DB migration applies cleanly (forward and rollback)
- [ ] Existing resume data migrated correctly (name, format settings, default)
- [ ] `GET /api/resumes` returns lightweight list sorted correctly
- [ ] Duplicate clones content + format settings
- [ ] Cannot delete default resume (API returns 409)
- [ ] `/resume` redirects to `/resume/[defaultResumeId]` for returning users
- [ ] Resume selector appears only when >1 resume
- [ ] Format settings are independent per resume
- [ ] Vacancy generation picker works with multi-resume
- [ ] All UI strings use i18n keys
