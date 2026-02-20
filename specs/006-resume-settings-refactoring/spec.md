# 006 — Extract Resume Format Settings into User-Level Entity

## Overview

Resume format settings (spacing, localization) are currently embedded inside each `Resume` record as `atsSettings` and `humanSettings` JSONB columns. In practice these settings are user-level preferences — edited only on the `/resume` page and identical across all resumes. This feature extracts them into a standalone `user_format_settings` entity, simplifies the resume data model, and lays groundwork for future per-type (ATS vs Human) divergence.

## Goals

- **Single source of truth**: one settings record per user, consumed by both resume and vacancy layers
- **Clean separation**: resume entity stores only content; settings live independently
- **Future-proof schema**: `ats` and `human` sub-schemas are separate objects today (each with `spacing` + `localization`) and will diverge with new setting groups later
- **Immediate saves for settings**: store updates instantly on every change; PATCH calls throttled (100-150ms) to avoid flooding
- **Unified undo/redo**: single chronological history stack with tagged entries (content or settings); Ctrl+Z undoes the most recent change regardless of type; undo triggers an immediate server call and cancels any pending content debounce
- **PATCH semantics**: settings updates send only changed fields; content updates remain PUT for now (PATCH deferred)
- **Defaults in runtimeConfig**: server resolves defaults — no extra frontend call needed

## Non-goals

- UI for `localization` settings (schema + DB only; UI deferred)
- Per-resume or per-generation settings overrides (all resumes share user-level settings)
- Switching content updates to PATCH (evaluate later; keep PUT for now)
- Redesigning the settings panel UI beyond rewiring the data source
- Settings versioning / history in DB (only client-side undo/redo)

## Scope

### In scope

1. New Zod schemas: `SpacingSettingsSchema`, `LocalizationSettingsSchema`, `ResumeFormatSettingsAtsSchema`, `ResumeFormatSettingsHumanSchema`, `UserFormatSettingsSchema`
2. New DB table `user_format_settings` + Drizzle migration
3. Seed user settings on user creation (server-side, from `runtimeConfig`)
4. New API: `GET /api/user/format-settings`, `PATCH /api/user/format-settings`
5. Remove `atsSettings` / `humanSettings` columns from `resumes` table (migration)
6. Remove settings from `ResumeSchema`
7. New Pinia store `useFormatSettingsStore` in `_base` layer
8. Refactor `useResumeEditHistory` into unified history composable with tagged entries (`content` | `settings`); undo/redo dispatches to the correct save handler based on entry type
9. Rewire resume store, vacancy store, `useResume` composable, preview components, PDF export
10. Update i18n keys as needed
11. Update docs (`endpoints.md`, `schemas.md`, `data-flow.md`)

### Out of scope

- Localization UI (settings panel controls for language/dateFormat/pageFormat)
- Admin-level settings management
- Per-generation settings persistence

## Roles & limits

- **Authenticated users (friend role)**: read/write own format settings
- **super_admin**: no special settings access beyond own (MVP)
- **public / unauthenticated**: no access
- BYOK policy: not applicable (no LLM calls)
- Rate limits: standard authenticated rate limits apply

## User flows

### 1. First-time user (settings seeding)

1. User registers / first OAuth login → user record created
2. Server-side hook seeds `user_format_settings` row with defaults from `runtimeConfig`
3. User navigates to `/resume` → `useFormatSettingsStore` lazily fetches settings via `GET /api/user/format-settings` (first access triggers the call; subsequent navigation uses cached store state)

### 2. Editing settings on `/resume` page

1. User opens settings panel (existing UI)
2. User drags a spacing slider (e.g., marginX)
3. Store updates reactively on every `input` event → preview re-renders immediately
4. PATCH call is throttled (100-150ms): `PATCH /api/user/format-settings` with `{ ats: { spacing: { marginX: 22 } } }`
5. Settings history snapshot created (for undo/redo)
6. No debounce on store update; throttle on network call only

### 3. Undo/redo (unified)

1. User presses Ctrl+Z
2. History pops the most recent entry (tagged as `content` or `settings`)
3. If **content** entry: content snapshot restored → store updated → preview re-renders → immediate PUT save → any pending content debounce **cancelled**
4. If **settings** entry: settings snapshot restored → store updated → preview re-renders → immediate PATCH save
5. Ctrl+Shift+Z / Ctrl+Y for redo (same logic, forward direction)

### 5. Vacancy page — settings consumption

1. User navigates to vacancy detail page
2. Vacancy store reads settings from `useFormatSettingsStore` (shared, \_base layer)
3. Preview renders using user's settings
4. Settings panel (if shown) works identically — same store, same PATCH endpoint

### 6. PDF export

1. User clicks export → component reads `content` from resume/generation + `settings` from format settings store
2. Resolves `ats` or `human` settings based on export format
3. Sends to `/api/pdf/prepare` as before

## UI / Pages

### Affected pages (no new pages)

- **`/resume`** — settings panel rewired to `useFormatSettingsStore` instead of resume store; undo/redo split
- **`/vacancies/:id`** — settings loaded from shared store instead of hardcoded defaults

### Settings panel (existing, minimal changes)

- Same slider controls for spacing (marginX, marginY, fontSize, lineHeight, blockSpacing)
- Data source changes from resume store → format settings store
- Undo/redo buttons remain; wired to unified history (undoes most recent change regardless of content/settings)

## Data model

All schemas in `packages/schema/` (package: `@int/schema`).

### New schemas

```
SpacingSettingsSchema = z.object({
  marginX:      z.number().min(10).max(26).default(20),   // mm
  marginY:      z.number().min(10).max(26).default(15),   // mm
  fontSize:     z.number().min(9).max(13).default(12),    // pt
  lineHeight:   z.number().min(1.1).max(1.5).default(1.2),
  blockSpacing: z.number().min(1).max(9).default(5)       // multiplier
})

LocalizationSettingsSchema = z.object({
  language:   z.string().default('en-US'),             // ISO language code
  dateFormat: z.string().default('MMM yyyy'),          // date-fns compatible pattern
  pageFormat: z.enum(['A4', 'us_letter']).default('A4')
})

// Two separate schemas — identical today, will diverge with type-specific fields
ResumeFormatSettingsAtsSchema = z.object({
  spacing:      SpacingSettingsSchema,
  localization: LocalizationSettingsSchema
})

ResumeFormatSettingsHumanSchema = z.object({
  spacing:      SpacingSettingsSchema,
  localization: LocalizationSettingsSchema
})

UserFormatSettingsSchema = z.object({
  id:        z.string().uuid(),
  userId:    z.string().uuid(),
  ats:       ResumeFormatSettingsAtsSchema,
  human:     ResumeFormatSettingsHumanSchema,
  createdAt: z.date(),
  updatedAt: z.date()
})
```

**Inferred types:**

- `SpacingSettings` — shared spacing values
- `LocalizationSettings` — shared localization values
- `ResumeFormatSettingsAts` — full ATS format settings (used by ATS preview, ATS PDF export)
- `ResumeFormatSettingsHuman` — full Human format settings (used by Human preview, Human PDF export)
- `UserFormatSettings` — top-level entity with `ats` + `human`

### Modified schemas

- **`ResumeSchema`**: remove `atsSettings` and `humanSettings` fields
- **`ResumeFormatSettingsSchema`**: removed — replaced by `ResumeFormatSettingsAtsSchema` and `ResumeFormatSettingsHumanSchema` (each containing `spacing` + `localization`)

### DB table: `user_format_settings`

```sql
CREATE TABLE user_format_settings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  ats         JSONB NOT NULL,    -- FormatTypeSettings
  human       JSONB NOT NULL,    -- FormatTypeSettings
  created_at  TIMESTAMP NOT NULL DEFAULT now(),
  updated_at  TIMESTAMP NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_user_format_settings_user_id ON user_format_settings(user_id);
```

### Migration plan

1. Create `user_format_settings` table
2. For each existing user with a resume that has settings:
   - Copy `resumes.ats_settings` → `user_format_settings.ats.spacing`
   - Copy `resumes.human_settings` → `user_format_settings.human.spacing`
   - Set `localization` to defaults
3. For users without settings: seed with runtimeConfig defaults
4. Drop `ats_settings` and `human_settings` columns from `resumes` table

## API surface

Implementation in `packages/nuxt-layer-api/` (package: `@int/api`).

### New endpoints

#### `GET /api/user/format-settings`

- **Auth**: required
- **Response**: `UserFormatSettings` (without `id`, `userId`, timestamps — just `ats` + `human`)
- **Notes**: returns user's settings; if somehow missing, seeds from runtimeConfig defaults and returns

#### `PATCH /api/user/format-settings`

- **Auth**: required
- **Body**: partial `{ ats?: Partial<{ spacing?: Partial<SpacingSettings>, localization?: Partial<LocalizationSettings> }>, human?: Partial<{ spacing?: Partial<SpacingSettings>, localization?: Partial<LocalizationSettings> }> }`
- **Validation**: deep-merge with existing, validate merged result against `ResumeFormatSettingsAtsSchema` / `ResumeFormatSettingsHumanSchema` respectively
- **Response**: full updated `UserFormatSettings` (ats + human)
- **Notes**: only changed fields sent; server deep-merges with current state

### Modified endpoints

#### `PUT /api/resumes/:id` (simplified)

- **Remove**: `atsSettings`, `humanSettings` from accepted body
- **Keep**: `content`, `title` fields

#### `GET /api/resumes/:id`

- **Remove**: `atsSettings`, `humanSettings` from response
- **Note**: client fetches settings lazily via `useFormatSettingsStore` on pages that need them (`/resume`, `/vacancies/[id]/resume`)

### Deferred

- `PATCH /api/resumes/:id` for content — evaluate in future iteration

## LLM workflows

Not applicable — this feature does not involve LLM parsing or generation.

## Limits & safety

- **Rate limiting**: standard per-user limits apply to PATCH endpoint
- **Validation**: all settings validated server-side via Zod before persistence
- **Bounds**: spacing values are bounded (min/max in schema) — prevents extreme/broken layouts
- No budget impact (no LLM calls)
- Admin kill switch: not applicable

## Security & privacy

- Settings are user-owned, accessed only by the authenticated user
- No PII in format settings (spacing numbers, locale codes)
- Same session-based auth as all other user endpoints
- `ON DELETE CASCADE` ensures settings are cleaned up when user is deleted

## i18n keys

Existing i18n keys for the settings panel should remain. New/changed keys:

- `settings.save.success` — toast on successful settings save
- `settings.save.error` — toast on settings save failure
- `settings.undo` / `settings.redo` — if undo/redo toasts are shown
- Any error messages from PATCH validation

No hardcoded UI strings.

## Monorepo / layers touchpoints

| Layer / Package | Path                        | Changes                                                                                                                                                                              |
| --------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `@int/schema`   | `packages/schema/`          | New schemas (SpacingSettings, LocalizationSettings, ResumeFormatSettingsAts, ResumeFormatSettingsHuman, UserFormatSettings); remove old `ResumeFormatSettingsSchema`; update exports |
| `@int/api`      | `packages/nuxt-layer-api/`  | New DB table + migration; new repository `userFormatSettings`; new API endpoints; simplify resume PUT/GET; seed on user creation                                                     |
| `_base` layer   | `apps/site/layers/_base/`   | New `useFormatSettingsStore`; refactor `useResumeEditHistory` into unified tagged history (content + settings entries); update `DownloadPdf` component; add runtimeConfig defaults   |
| `resume` layer  | `apps/site/layers/resume/`  | Rewire store (remove settings state); rewire `useResume` composable; update preview components to source settings from format settings store                                         |
| `vacancy` layer | `apps/site/layers/vacancy/` | Remove `DEFAULT_FORMAT_SETTINGS` and settings state; consume from `useFormatSettingsStore`                                                                                           |

## Acceptance criteria

1. **Schema**: `UserFormatSettingsSchema` exists in `@int/schema` with `ats: ResumeFormatSettingsAts` (spacing + localization) and `human: ResumeFormatSettingsHuman` (spacing + localization) as two separate types
2. **DB**: `user_format_settings` table created; `resumes.ats_settings` and `resumes.human_settings` columns dropped
3. **Migration**: existing settings data migrated without loss
4. **Seeding**: new users get default settings on creation (from runtimeConfig)
5. **API GET**: `GET /api/user/format-settings` returns user settings
6. **API PATCH**: `PATCH /api/user/format-settings` accepts partial updates, deep-merges, validates, persists
7. **Resume API**: `PUT /api/resumes/:id` and `GET /api/resumes/:id` no longer include settings fields
8. **Store**: `useFormatSettingsStore` in `_base` layer provides reactive settings to both resume and vacancy layers
9. **Immediate save**: every settings change updates store immediately; PATCH is throttled (100-150ms)
10. **Content auto-save**: content still auto-saves with debounce (unchanged behavior)
11. **Undo/redo**: unified chronological history with tagged entries; Ctrl+Z undoes most recent change (content or settings); dispatches correct save (PUT for content, PATCH for settings); content undo cancels pending debounce
12. **Preview**: renders correctly using settings from format settings store
13. **PDF export**: uses settings from format settings store, resolves correct type (ats/human)
14. **Vacancy page**: settings loaded from shared store, no hardcoded defaults
15. **Localization**: stored in DB but no UI controls (schema-only for now)
16. **No regressions**: existing content editing, auto-save, upload flows work unchanged
17. **Typecheck**: `pnpm vue-tsc --noEmit` passes
18. **i18n**: no hardcoded strings

## Edge cases

1. **User has no settings row**: GET endpoint auto-seeds from runtimeConfig defaults and returns; subsequent PATCHes work normally
2. **Concurrent settings edits** (multiple tabs): last-write-wins; settings are simple values, not conflict-prone
3. **Settings PATCH with invalid values**: server validates merged result; returns 422 with validation errors
4. **Undo past initial state**: undo stack is empty → button disabled; no server call
5. **Rapid slider dragging**: store updates on every `input` event (instant preview); PATCH is throttled at 100-150ms — last value within window wins
6. **Preview type switch** (ats ↔ human): store exposes `currentSettings` computed that resolves from `ats` or `human` based on `previewType`
7. **Migration: user with multiple resumes**: take settings from the most recently updated resume
8. **Migration: user with no resumes**: seed with runtimeConfig defaults
9. **Migration: resume with null settings**: use runtimeConfig defaults for that user
10. **Content undo during pending debounce**: debounce timer cancelled, undo snapshot saved immediately

## Testing plan

### Unit tests

- `SpacingSettingsSchema` / `LocalizationSettingsSchema` / `FormatTypeSettingsSchema` — validation, defaults, bounds
- `UserFormatSettingsSchema` — full schema validation
- Deep-merge logic for PATCH — partial updates merge correctly
- Settings history (undo/redo) — push, pop, boundary conditions

### Integration tests

- `GET /api/user/format-settings` — returns settings for authenticated user; 401 for unauthenticated
- `PATCH /api/user/format-settings` — partial update merges correctly; invalid values return 422
- `PUT /api/resumes/:id` — no longer accepts/returns settings fields
- Migration script — verifies data integrity post-migration

### E2E tests (if applicable)

- Settings slider change → preview updates → value persists on page reload
- Content edit → auto-save → undo → content reverts, settings unchanged
- Settings edit → undo → settings revert, content unchanged

## Clarifications

### Session 2026-02-06

- Q: Settings loading strategy — separate call, bundled with auth, or SSR middleware? → A: Lazy load via `GET /api/user/format-settings` only when entering pages that need it (`/resume`, `/vacancies/[id]/resume`). Defaults are seeded in DB on user creation from runtimeConfig. No bundling with auth, no SSR middleware.
- Q: Rapid slider throttle — fire PATCH on every input, throttle, or only on change? → A: Immediate store update (preview is instant) + throttled PATCH call (100-150ms). Server calls are batched; preview stays smooth.
- Q: Undo/redo scope — unified history, focus-based, or separate shortcuts? → A: Unified chronological history with tagged entries (`{ type: 'content' | 'settings', snapshot }`). Ctrl+Z always undoes the most recent change regardless of type.
- Q: What type should consumers (Preview, PDF) accept instead of old `ResumeFormatSettings`? → A: Two separate types: `ResumeFormatSettingsAts` and `ResumeFormatSettingsHuman`. Components receive the full per-type object (`FormatSettingsAtsSchema` / `FormatSettingsHumanSchema`) — each contains `spacing` + `localization`, and they will diverge with type-specific fields in the future.

## Open questions / NEEDS CLARIFICATION

1. ~~**Settings loading strategy**~~ — resolved (see Clarifications)

2. ~~**Rapid slider throttle**~~ — resolved (see Clarifications)

3. ~~**Undo/redo scope detection**~~ — resolved (see Clarifications)

4. ~~**Existing `ResumeFormatSettingsSchema` consumers**~~ — resolved (see Clarifications)
