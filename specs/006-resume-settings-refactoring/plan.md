# Implementation Plan: Extract Resume Format Settings

**Branch**: `feature/006-resume-settings-refactoring` | **Date**: 2026-02-06 | **Spec**: `specs/006-resume-settings-refactoring/spec.md`
**Input**: Feature specification from `/specs/006-resume-settings-refactoring/spec.md`

## Summary

Extract resume format settings (`atsSettings`, `humanSettings`) from the `resumes` table into a dedicated `user_format_settings` entity. Settings become user-level preferences with two separate per-type schemas (`ResumeFormatSettingsAts`, `ResumeFormatSettingsHuman`) containing `spacing` + `localization`. Client saves settings immediately via throttled PATCH. Undo/redo uses a unified tagged history stack. A new shared Pinia store in `_base` layer replaces settings state in both resume and vacancy stores.

## Technical Context

**Language/Version**: TypeScript 5.x (Nuxt 4 / Vue 3)
**Primary Dependencies**: Nuxt 4, NuxtUI v4, Pinia, VueUse (`useThrottleFn`), Zod, Drizzle ORM
**Storage**: PostgreSQL (via Drizzle ORM in `@int/api` layer)
**Testing**: `vue-tsc --noEmit` (typecheck), Vitest (unit/integration)
**Target Platform**: Web (SSR + CSR), Node.js server
**Project Type**: Nuxt monorepo (pnpm workspaces, Nuxt layers)
**Performance Goals**: Settings PATCH < 200ms; slider preview update < 16ms (60fps); throttle at 100-150ms
**Constraints**: No breaking changes to content auto-save flow; backward-compatible DB migration
**Scale/Scope**: ~22 files modified/created; 5 layers touched; 1 new DB table; 2 new API endpoints

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                    | Status | Notes                                                                                                |
| ---------------------------- | ------ | ---------------------------------------------------------------------------------------------------- |
| I. Documentation Is Binding  | PASS   | `docs/codestyle/base.md` read; `docs/api/*`, `docs/architecture/*` consulted                         |
| II. Nuxt Stack Invariants    | PASS   | Nuxt v4, NuxtUI v4 only; VueUse checked first (`useThrottleFn`); no MCP needed for this feature      |
| III. Schema-First Contracts  | PASS   | All new types defined as Zod schemas in `@int/schema`; inferred types; no `any` or type assertions   |
| IV. Store/Action Data Flow   | PASS   | New `useFormatSettingsStore` in `_base` layer; Pinia actions for PATCH; components consume via store |
| V. i18n and SSR Requirements | PASS   | All new strings use i18n keys; no impact on SSR islands rendering                                    |

**Post-Phase 1 re-check**: All gates pass. No violations.

## Project Structure

### Documentation (this feature)

```text
specs/006-resume-settings-refactoring/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0: research decisions
├── data-model.md        # Phase 1: entity model
├── quickstart.md        # Phase 1: implementation guide
├── contracts/           # Phase 1: API contracts
│   └── format-settings-api.md
└── tasks.md             # Phase 2: task list (via /speckit.tasks)
```

### Source Code (repository root)

```text
packages/schema/
├── schemas/
│   ├── format-settings.ts          # NEW: SpacingSettings, LocalizationSettings,
│   │                               #       ResumeFormatSettingsAts/Human, UserFormatSettings
│   └── resume.ts                   # MODIFY: remove ResumeFormatSettingsSchema, atsSettings, humanSettings
└── index.ts                        # MODIFY: update exports

packages/nuxt-layer-api/            # (package: @int/api)
├── nuxt.config.ts                  # MODIFY: add runtimeConfig.formatSettings.defaults
├── drizzle.config.ts               # (unchanged)
└── server/
    ├── data/
    │   ├── schema.ts               # MODIFY: add userFormatSettings table, remove resume settings columns
    │   ├── migrations/             # NEW: migration SQL (auto-generated + manual data migration)
    │   └── repositories/
    │       └── format-settings.ts  # NEW: findByUserId, create, update, seedDefaults
    ├── api/
    │   ├── user/
    │   │   ├── format-settings.get.ts   # NEW
    │   │   └── format-settings.patch.ts # NEW
    │   ├── resume/
    │   │   ├── index.get.ts        # MODIFY: remove settings from response
    │   │   └── index.put.ts        # MODIFY: remove settings from body/handler
    │   └── auth/
    │       └── register.post.ts    # MODIFY: seed format settings on user creation
    └── routes/
        └── auth/
            ├── google.ts           # MODIFY: seed format settings on OAuth user creation
            └── linkedin.ts         # MODIFY: seed format settings on OAuth user creation

apps/site/layers/_base/             # (shared base layer)
└── app/
    ├── stores/
    │   └── format-settings.ts      # NEW: useFormatSettingsStore
    └── composables/
        └── useResumeEditHistory.ts # MODIFY: unified tagged history (content | settings)

apps/site/layers/resume/            # (resume layer)
└── app/
    ├── stores/
    │   └── index.ts                # MODIFY: remove settings state, actions, getters
    ├── composables/
    │   └── useResume.ts            # MODIFY: source settings from format settings store
    └── components/
        └── Preview/
            └── index.vue           # MODIFY: accept ResumeFormatSettingsAts | Human

apps/site/layers/vacancy/           # (vacancy layer)
└── app/
    ├── stores/
    │   └── index.ts                # MODIFY: remove DEFAULT_FORMAT_SETTINGS, settings state
    └── composables/
        └── useVacancyGeneration.ts # MODIFY: source settings from format settings store

apps/site/layers/_base/app/components/base/
└── DownloadPdf.vue                 # MODIFY: resolve settings from format settings store
```

**Structure Decision**: Existing Nuxt monorepo layout with layers. No new packages or layers needed. All changes fit within existing `@int/schema`, `@int/api`, `_base`, `resume`, and `vacancy` layers.

## Complexity Tracking

No constitution violations. No complexity justification needed.
