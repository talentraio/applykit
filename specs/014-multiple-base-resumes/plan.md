# Implementation Plan: Multiple Base Resumes

**Branch**: `014-multiple-base-resumes` | **Date**: 2026-02-19 | **Spec**: `specs/014-multiple-base-resumes/spec.md`
**Input**: Feature specification from `/specs/014-multiple-base-resumes/spec.md`

## Summary

Lift the single-resume-per-user constraint so users can maintain up to 10 base resumes, each with its own name, content, and format settings. Introduce a `defaultResumeId` FK on the `users` table (avoiding per-row boolean flags), migrate format settings from global user-level to per-resume, add a `/resume/[id]` dynamic route with resume selector, and wire the vacancy generation flow to pick a specific base resume when multiple exist.

## Technical Context

**Language/Version**: TypeScript 5.7 (Nuxt 4 / Node.js 20 LTS)
**Primary Dependencies**: Nuxt 4, NuxtUI v4, Pinia, Zod, Drizzle ORM, date-fns, VueUse
**Storage**: PostgreSQL via Neon (serverless), Drizzle ORM
**Testing**: Vitest (unit/integration), Playwright (E2E if applicable)
**Target Platform**: Web (SSR via Nuxt/Nitro on Vercel)
**Project Type**: Monorepo (pnpm workspaces, Nuxt layers)
**Performance Goals**: No new perf-critical paths; resume list query is lightweight (max 10 rows)
**Constraints**: Max 10 resumes per user (server-enforced). Format settings migration must be backward-compatible (copy existing data, then drop old table).
**Scale/Scope**: MVP user base; max 10 resumes per user. No pagination needed for resume list.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                    | Status | Notes                                                                                     |
| ---------------------------- | ------ | ----------------------------------------------------------------------------------------- |
| I. Documentation Is Binding  | PASS   | `docs/codestyle/base.md` read; all relevant docs loaded                                   |
| II. Nuxt Stack Invariants    | PASS   | Using Nuxt v4, NuxtUI v4; MCP docs available for framework APIs                           |
| III. Schema-First Contracts  | PASS   | New schemas defined in `@int/schema` with Zod; `isDefault` computed at API layer          |
| IV. Store/Action Data Flow   | PASS   | Resume store refactored to handle multi-resume cache; format settings moved to per-resume |
| V. i18n and SSR Requirements | PASS   | All new UI strings use i18n keys; no SSR/island changes needed                            |

No violations. All gates pass.

## Project Structure

### Documentation (this feature)

```text
specs/014-multiple-base-resumes/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (API contracts)
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
packages/nuxt-layer-schema/             # @int/schema — new Zod schemas
  app/schemas/resume.ts                  # Extend with name, isDefault, list item schema

packages/nuxt-layer-api/                 # @int/api — backend changes
  server/data/
    schema.ts                            # Add defaultResumeId to users, name to resumes,
                                         # new resumeFormatSettings table, drop userFormatSettings
    migrations/                          # New migration SQL (drizzle-kit generate)
    repositories/
      resume.ts                          # Add: duplicate(), updateName(), findListByUserId()
      resume-format-settings.ts          # NEW: per-resume format settings CRUD
      format-settings.ts                 # REMOVE after migration
      user.ts                            # Add: updateDefaultResumeId(), getDefaultResumeId()
  server/api/
    resumes/
      index.get.ts                       # GET /api/resumes (list)
      [id].get.ts                        # GET /api/resumes/:id
      [id].delete.ts                     # DELETE /api/resumes/:id
      [id]/
        duplicate.post.ts                # POST /api/resumes/:id/duplicate
        name.put.ts                      # PUT /api/resumes/:id/name
        format-settings.get.ts           # GET /api/resumes/:id/format-settings
        format-settings.patch.ts         # PATCH /api/resumes/:id/format-settings
    user/
      default-resume.put.ts              # PUT /api/user/default-resume
      format-settings.get.ts             # REMOVE
      format-settings.patch.ts           # REMOVE
      format-settings.put.ts             # REMOVE

apps/site/layers/resume/                 # Resume layer — UI changes
  app/pages/
    resume.vue                           # MODIFIED: redirect-only for returning users
    resume/
      [id].vue                           # NEW: dynamic route for specific resume
  app/stores/
    index.ts                             # MODIFIED: multi-resume cache, active resume
  app/composables/
    useResume.ts                         # MODIFIED: resume-id-aware, per-resume settings
    useResumeModals.ts                   # MODIFIED: add delete confirmation modal
  app/infrastructure/
    resume.api.ts                        # MODIFIED: new API methods
  app/components/
    editor/
      Tools.vue                          # MODIFIED: add duplicate, delete, default toggle
      Selector.vue                       # NEW: resume selector dropdown
      DefaultToggle.vue                  # NEW: standalone default resume toggle
      modal/
        DeleteConfirm.vue                # NEW: delete confirmation modal

apps/site/layers/vacancy/                # Vacancy layer — generate picker
  app/components/
    Item/overview/Content/
      index.vue                          # MODIFIED: resume picker for multi-resume generate

apps/site/layers/_base/                  # Base layer — cleanup
  app/stores/
    format-settings.ts                   # MODIFIED: refactored to per-resume endpoints
```

**Structure Decision**: Existing monorepo structure preserved. Changes distributed across `@int/schema`, `@int/api`, site/resume layer, site/vacancy layer, and site/\_base layer. No new packages or layers introduced.

## Complexity Tracking

No constitution violations. No complexity justifications needed.
