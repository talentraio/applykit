# Data flow & lifecycle

## Core entities

- **User**
- **Profile** (contact data, locales, job preferences)
- **Base Resume** (strict JSON content only; derived from DOCX/PDF via LLM; editable by user)
- **UserFormatSettings** (user-level formatting preferences; separate from resume; lazy-loaded)
  - `ats: { spacing, localization }`
  - `human: { spacing, localization }`
  - Auto-seeded from `runtimeConfig.formatSettings.defaults` on user creation
  - Persisted via `PATCH /api/user/format-settings` (immediate save, no debounce)
- **Vacancy** (company required; optional jobPosition; description text; optional URL; notes)
- **Generated Resume Versions** (array; keep only the latest in UI for MVP, but store as array to avoid refactor later)

## Resume parsing (DOCX primary, PDF supported)

1. User uploads DOCX/PDF
2. Server calls LLM parsing service
3. Service validates output with Zod and returns strictly typed JSON
4. Store JSON as the canonical “source of truth” for the resume
5. User reviews/edits JSON and saves

## Vacancy tailoring

1. User creates vacancy (company required; jobPosition optional)
2. User provides vacancy description text (MVP) + optional link
3. Server generates adapted resume version + stores it under vacancy

## Re-generation (important)

If base resume changes, user can re-run generation for an existing vacancy.
We support:

- `POST /api/vacancies/:id/generate` (create a new version, append to versions array)

## Rendering & export

- Views:
  - ATS: `/vacancies/:id/ats`
  - Human: `/vacancies/:id/human`
- Rendering is server-side (`*.server.vue` islands), fully static HTML per request.
- Export:
  - `POST /api/vacancies/:id/export?type=ats|human`
  - Cache exports (Nitro storage / FS / Redis) and invalidate cache on re-generation

## Store-init pattern (Nuxt)

On server app start:

- preload global "dictionary" data (countries, etc.)
- if user session exists, load user + profile + current resume list

This runs in `app/plugins/store-init.ts` with:

- `enforce: 'pre'`
- `parallel: false`
- `dependsOn: ['pinia']`

## Format settings lazy-loading flow

**Initial load** (on `/resume` or `/vacancies/:id/resume` page):

1. `useFormatSettingsStore.fetchSettings()` called
2. Store checks `loaded` flag — skip if already fetched
3. `GET /api/user/format-settings` fetches user's settings
4. Server auto-seeds defaults if no row exists
5. Store caches settings (`ats`, `human`, `loaded: true`)

**Immediate save on change**:

1. User adjusts slider in Settings panel
2. Component emits new `SpacingSettings`
3. Store's `updateSettings()` updates local state immediately (instant UI feedback)
4. Store's `patchSettings()` throttled (150ms) PATCH to server
5. Server deep-merges, validates, saves, returns full settings
6. Store updates with server response (source of truth)

**Undo/Redo with unified history**:

1. History composable tracks tagged entries (`type: 'content' | 'settings'`)
2. Ctrl+Z undoes most recent change (content or settings)
3. Undo/Redo dispatches correct save handler based on entry tag:
   - `type: 'content'` → immediate `PUT /api/resume` (cancel pending debounce)
   - `type: 'settings'` → immediate `PATCH /api/user/format-settings` (bypass throttle)
