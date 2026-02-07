# Research: 006 — Extract Resume Format Settings

## R1: User creation seeding point

**Decision**: Seed `user_format_settings` row inside each user creation repository method, or call a shared `seedFormatSettings(userId)` from all entry points.

**Rationale**: There are 4 user creation paths:

- `userRepository.createWithPassword()` — email registration (`server/api/auth/register.post.ts:70`)
- `userRepository.create()` — OAuth registration (Google: `server/routes/auth/google.ts:88`, LinkedIn: `server/routes/auth/linkedin.ts:90`)
- `userRepository.createInvited()` — admin invitation
- `userRepository.activateInvitedUser()` — first OAuth login for invited user

A dedicated `formatSettingsRepository.seedDefaults(userId)` called from each creation path keeps the logic centralized. Alternatively, a DB trigger could do this, but explicit code is more traceable and testable.

**Alternatives considered**:

- DB trigger on `users` INSERT — hidden side effect, harder to test
- Lazy seeding on first GET — adds latency to first page load; already rejected in clarification
- store-init plugin — too early, not needed for every page

## R2: Drizzle migration approach

**Decision**: Use `drizzle-kit generate` to create the migration SQL from schema changes, then manually adjust the data migration portion.

**Rationale**: Drizzle generates DDL (CREATE TABLE, ALTER TABLE) from schema diffs. The data migration (copying settings from `resumes` to `user_format_settings`) must be written manually as a SQL script in the migration file.

**Migration sequence** (single migration file):

1. CREATE TABLE `user_format_settings`
2. INSERT INTO `user_format_settings` — copy from resumes (most recently updated per user)
3. ALTER TABLE `resumes` DROP COLUMN `ats_settings`, DROP COLUMN `human_settings`

**Alternatives considered**:

- Separate migrations (create → migrate data → drop columns) — safer for production rollback, but overkill for MVP with few users
- Application-level migration script — less atomic than SQL

## R3: runtimeConfig for default settings

**Decision**: Add `formatSettings.defaults` to server-only `runtimeConfig` in `packages/nuxt-layer-api/nuxt.config.ts`.

**Rationale**: Follows existing pattern (e.g., `runtimeConfig.llm`, `runtimeConfig.storage`). Server-only config is not exposed to client, accessed via `useRuntimeConfig(event)` in API handlers.

**Shape**:

```typescript
runtimeConfig: {
  formatSettings: {
    defaults: {
      ats: {
        spacing: { marginX: 20, marginY: 15, fontSize: 12, lineHeight: 1.2, blockSpacing: 5 },
        localization: { language: 'en-US', dateFormat: 'MMM yyyy', pageFormat: 'A4' }
      },
      human: {
        spacing: { marginX: 20, marginY: 15, fontSize: 12, lineHeight: 1.2, blockSpacing: 5 },
        localization: { language: 'en-US', dateFormat: 'MMM yyyy', pageFormat: 'A4' }
      }
    }
  }
}
```

**Alternatives considered**:

- appConfig — exposes to client unnecessarily; defaults should be server-authoritative
- Hardcoded constants — not configurable per environment
- Zod `.default()` values — still need a single source; runtimeConfig is the canonical place

## R4: PATCH deep-merge implementation

**Decision**: Use a recursive shallow-merge utility that handles 2-level nesting (`ats.spacing.marginX`). No need for a generic deep-merge library.

**Rationale**: The structure is known and bounded:

```
{ ats?: { spacing?: Partial<SpacingSettings>, localization?: Partial<LocalizationSettings> },
  human?: { spacing?: ..., localization?: ... } }
```

A simple function:

```typescript
function mergeFormatSettings(
  existing: FormatTypeSettings,
  patch: DeepPartial<FormatTypeSettings>
): FormatTypeSettings {
  return {
    spacing: { ...existing.spacing, ...patch.spacing },
    localization: { ...existing.localization, ...patch.localization }
  };
}
```

Server reads current settings from DB, merges, validates merged result with Zod, saves.

**Alternatives considered**:

- lodash `merge` / `deepmerge` library — overkill for 2-level known structure, adds dependency
- JSON Merge Patch (RFC 7396) — more complex than needed; no null-deletion semantics required

## R5: Throttle implementation for settings PATCH

**Decision**: Use `useThrottleFn` from `@vueuse/core` (already a dependency) for throttling PATCH calls.

**Rationale**: VueUse is already installed and used in `useResumeEditHistory.ts` (line 24: `watchDebounced`). `useThrottleFn` provides trailing-edge execution by default, ensuring the last value during a drag always gets saved.

**Usage pattern**:

```typescript
const throttledSave = useThrottleFn(async settings => {
  await formatSettingsApi.patch(settings);
}, 150);
```

Store update remains synchronous and immediate; only the network call is throttled.

**Alternatives considered**:

- Custom throttle — reinventing what VueUse provides
- `useDebounceFn` — debounce delays the first call; throttle fires immediately then limits frequency
- `watchThrottled` — watcher-based; we need function-based control for undo/redo integration

## R6: Unified history composable architecture

**Decision**: Refactor `useResumeEditHistory` into a composable that accepts tagged entries with type-dispatched save.

**Rationale**: Current composable already tracks both content and settings in a single snapshot. The refactor:

1. Changes snapshot type from `{ content, settings }` to `{ type: 'content' | 'settings', content?, settings? }`
2. On push: creates entry tagged with what changed
3. On undo/redo: dispatches to `saveContent()` or `saveSettings()` based on tag
4. Content undo cancels pending content debounce
5. Settings undo triggers immediate (non-throttled) PATCH

**Key design**: The history stack stores full snapshots of both content AND settings at each point. The tag indicates what changed (so we know which save to trigger), but the snapshot restores both to maintain consistency.

**Alternatives considered**:

- Two separate histories — rejected in clarification; Ctrl+Z would need scope detection
- Event sourcing — overkill for undo/redo; snapshot-based is simpler and proven in current code

## R7: Repository pattern for format settings

**Decision**: Follow existing repository pattern — exported const object with async methods.

**Rationale**: All existing repositories (`resume.ts`, `vacancy.ts`, `user.ts`) use the same pattern: a plain object with methods that accept Drizzle `db` instance implicitly (via import). No class instantiation.

**Methods needed**:

- `findByUserId(userId: string)` — returns settings or null
- `create(userId: string, settings: { ats, human })` — insert with defaults
- `update(userId: string, settings: { ats?, human? })` — partial update via JSONB merge
- `seedDefaults(userId: string, defaults)` — create with runtimeConfig defaults (called on user creation)

**Alternatives considered**:

- Class-based repository — inconsistent with codebase; no DI container to justify it
- Inline queries in API handlers — violates repository pattern established in codebase
