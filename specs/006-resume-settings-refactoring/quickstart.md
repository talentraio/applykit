# Quickstart: 006 — Extract Resume Format Settings

## Prerequisites

- Node.js 20+, pnpm 9+
- PostgreSQL running locally (default `NUXT_DATABASE_URL` or set in `.env`)
- Existing dev setup (`pnpm install` done)

## Implementation order

### Phase 1: Schema + DB (foundation)

1. **Create Zod schemas** in `packages/schema/schemas/format-settings.ts`:
   - `SpacingSettingsSchema`
   - `LocalizationSettingsSchema`
   - `ResumeFormatSettingsAtsSchema`
   - `ResumeFormatSettingsHumanSchema`
   - `UserFormatSettingsSchema`

2. **Update `packages/schema/schemas/resume.ts`**:
   - Remove `ResumeFormatSettingsSchema` export
   - Remove `atsSettings` / `humanSettings` from `ResumeSchema`

3. **Add DB table** in `packages/nuxt-layer-api/server/data/schema.ts`:
   - Define `userFormatSettings` table with Drizzle

4. **Generate + run migration**:
   ```bash
   cd packages/nuxt-layer-api
   pnpm db:generate
   # Manually edit migration to add data migration SQL
   pnpm db:migrate
   ```

### Phase 2: API layer

5. **Create repository** `packages/nuxt-layer-api/server/data/repositories/format-settings.ts`

6. **Add runtimeConfig defaults** in `packages/nuxt-layer-api/nuxt.config.ts`

7. **Create API endpoints**:
   - `server/api/user/format-settings.get.ts`
   - `server/api/user/format-settings.patch.ts`

8. **Seed on user creation** — update user creation paths:
   - `server/api/auth/register.post.ts`
   - `server/routes/auth/google.ts`
   - `server/routes/auth/linkedin.ts`

9. **Simplify resume endpoints**:
   - `server/api/resume/index.put.ts` — remove settings handling
   - `server/api/resume/index.get.ts` — remove settings from response

### Phase 3: Client stores + composables

10. **Create `useFormatSettingsStore`** in `apps/site/layers/_base/app/stores/`

11. **Refactor `useResumeEditHistory`** in `apps/site/layers/_base/app/composables/`:
    - Add tagged entries (`content` | `settings`)
    - Dispatch to correct save handler on undo/redo
    - Content undo cancels pending debounce

12. **Rewire resume store** — remove `atsSettings`, `humanSettings`, `updateSettings`, `saveSettings`

13. **Rewire vacancy store** — remove `DEFAULT_FORMAT_SETTINGS`, settings state; consume from format settings store

### Phase 4: Component wiring

14. **Update `useResume` composable** — source settings from format settings store

15. **Update `useVacancyGeneration` composable** — source settings from format settings store

16. **Update Preview component** — accept `ResumeFormatSettingsAts | ResumeFormatSettingsHuman` instead of `ResumeFormatSettings`

17. **Update `DownloadPdf` component** — resolve settings from format settings store

### Phase 5: Cleanup + docs

18. **Remove old types** — delete `ResumeFormatSettingsSchema` if no longer referenced

19. **Update docs**: `docs/api/endpoints.md`, `docs/api/schemas.md`, `docs/architecture/data-flow.md`

20. **Typecheck**: `cd apps/site && pnpm vue-tsc --noEmit`

## Key files to modify

```
packages/schema/schemas/format-settings.ts          # NEW
packages/schema/schemas/resume.ts                    # MODIFY
packages/schema/index.ts                             # MODIFY (exports)
packages/nuxt-layer-api/server/data/schema.ts        # MODIFY
packages/nuxt-layer-api/server/data/repositories/format-settings.ts  # NEW
packages/nuxt-layer-api/server/api/user/format-settings.get.ts       # NEW
packages/nuxt-layer-api/server/api/user/format-settings.patch.ts     # NEW
packages/nuxt-layer-api/server/api/resume/index.put.ts               # MODIFY
packages/nuxt-layer-api/server/api/resume/index.get.ts               # MODIFY
packages/nuxt-layer-api/server/api/auth/register.post.ts             # MODIFY
packages/nuxt-layer-api/server/routes/auth/google.ts                 # MODIFY
packages/nuxt-layer-api/server/routes/auth/linkedin.ts               # MODIFY
packages/nuxt-layer-api/nuxt.config.ts                               # MODIFY
apps/site/layers/_base/app/stores/format-settings.ts                 # NEW
apps/site/layers/_base/app/composables/useResumeEditHistory.ts       # MODIFY
apps/site/layers/resume/app/stores/index.ts                          # MODIFY
apps/site/layers/resume/app/composables/useResume.ts                 # MODIFY
apps/site/layers/vacancy/app/stores/index.ts                         # MODIFY
apps/site/layers/vacancy/app/composables/useVacancyGeneration.ts     # MODIFY
apps/site/layers/resume/app/components/Preview/index.vue             # MODIFY
apps/site/layers/_base/app/components/base/DownloadPdf.vue           # MODIFY
```

## Verify

```bash
# Typecheck
cd apps/site && pnpm vue-tsc --noEmit

# Dev server
cd apps/site && pnpm dev  # runs on port 3002

# DB migration status
cd packages/nuxt-layer-api && pnpm db:studio
```
