# Implementation Plan: Vacancy Detail Page Restructuring

**Branch**: `feature/005-new-vacancy-flow` | **Date**: 2026-02-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/005-new-vacancy-flow/spec.md`

## Summary

Restructure `/vacancies/[id]` into four sub-pages (Overview, Resume, Cover, Preparation) with a thin header layout featuring breadcrumbs and dropdown navigation. Add `VacancyStatus` enum for application tracking with automatic status transitions on first resume generation. Implement auto-save for generation editing on the Resume sub-page.

## Technical Context

**Language/Version**: TypeScript 5.x (Nuxt 4 / Vue 3)
**Primary Dependencies**: Nuxt 4, NuxtUI v4, Pinia, VueUse, Zod
**Storage**: PostgreSQL (via Drizzle ORM in @int/api layer)
**Testing**: Vitest (unit), Playwright (E2E)
**Target Platform**: Web (SSR + CSR hybrid)
**Project Type**: Nuxt monorepo with layers
**Performance Goals**: Sub-100ms navigation between sub-pages (client-side routing)
**Constraints**: Auto-save debounce 2000ms, i18n from day 1, no `any` types
**Scale/Scope**: Single-user feature, ~6 new Vue components, 1 DB migration

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                    | Status  | Evidence                                       |
| ---------------------------- | ------- | ---------------------------------------------- |
| I. Documentation Is Binding  | ✅ PASS | Using docs/codestyle/base.md, spec.md complete |
| II. Nuxt Stack Invariants    | ✅ PASS | Nuxt v4 + NuxtUI v4 only, VueUse for debounce  |
| III. Schema-First Contracts  | ✅ PASS | VacancyStatus in @int/schema with Zod          |
| IV. Store/Action Data Flow   | ✅ PASS | Extending existing useVacancyStore             |
| V. i18n and SSR Requirements | ✅ PASS | All new strings have i18n keys defined         |

**No violations requiring justification.**

## Project Structure

### Documentation (this feature)

```text
specs/005-new-vacancy-flow/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (API contracts)
│   └── vacancy-status.yaml
├── checklists/          # Generated checklists
│   └── ux.md
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
packages/schema/                           # @int/schema layer
├── constants/
│   └── enums.ts                          # + VACANCY_STATUS_MAP, VACANCY_STATUS_VALUES
└── schemas/
    ├── enums.ts                          # + VacancyStatusSchema, VacancyStatus type
    └── vacancy.ts                        # + status field

packages/nuxt-layer-api/                   # @int/api layer
└── server/
    ├── database/
    │   └── migrations/
    │       └── 00XX_add_vacancy_status.ts  # DB migration
    └── api/
        ├── vacancies/
        │   └── [id].put.ts               # Ensure status update works
        └── generations/
            └── index.post.ts             # Auto-update vacancy status

apps/site/layers/vacancy/                  # Vacancy layer
└── app/
    ├── pages/vacancies/
    │   ├── [id].vue                      # Layout wrapper with header (MODIFY)
    │   └── [id]/
    │       ├── index.vue                 # Redirect to overview (NEW)
    │       ├── overview.vue              # Overview page (NEW)
    │       ├── resume.vue                # Resume editing page (NEW)
    │       ├── cover.vue                 # Placeholder (NEW)
    │       └── preparation.vue           # Placeholder (NEW)
    ├── components/
    │   ├── detail/
    │   │   ├── Header.vue                # Thin header with breadcrumbs (NEW)
    │   │   ├── Breadcrumbs.vue           # Breadcrumb component (NEW)
    │   │   └── NavDropdown.vue           # Section dropdown (NEW)
    │   └── StatusBadge.vue               # Clickable status badge (NEW)
    ├── composables/
    │   └── useVacancyGeneration.ts       # Auto-save for generation (NEW)
    └── stores/
        └── index.ts                      # + status-related state/actions

apps/site/i18n/locales/
└── en.json                               # + vacancy.status.*, vacancy.nav.*
```

**Structure Decision**: Nuxt monorepo with layered architecture. New pages follow existing `/vacancies/[id]/` pattern. Components organized under `detail/` subfolder for vacancy detail-specific UI.

## Phase 0: Research

### Research Tasks

1. **Nuxt nested routes**: Confirm `/vacancies/[id].vue` as layout wrapper pattern
2. **NuxtUI Breadcrumb**: Find correct component and props
3. **NuxtUI DropdownMenu**: Find component for section navigation
4. **NuxtUI Badge**: Find clickable badge with dropdown pattern
5. **VueUse watchDebounced**: Confirm pattern for auto-save (already used in useResume.ts)

### Research Findings (from existing codebase)

| Decision                           | Rationale                                   | Alternatives Considered |
| ---------------------------------- | ------------------------------------------- | ----------------------- |
| Use `[id].vue` as layout wrapper   | Nuxt 4 nested routes pattern                | Separate layout file    |
| Use `watchDebounced` from VueUse   | Already proven in `/resume` page            | Custom debounce         |
| Extend `useVacancyStore`           | Existing store has generation editing state | New store               |
| Use `UBadge` with click handler    | NuxtUI pattern, simple implementation       | Custom component        |
| Use `UDropdownMenu` for navigation | NuxtUI standard dropdown                    | Custom dropdown         |

**Output**: All research items resolved from existing patterns. See [research.md](./research.md).

## Phase 1: Design & Contracts

### Data Model Changes

**Entity**: Vacancy (extended)

| Field  | Type            | Notes                             |
| ------ | --------------- | --------------------------------- |
| status | `VacancyStatus` | New enum field, default 'created' |

**Enum**: VacancyStatus

| Value     | Description            | Badge Color |
| --------- | ---------------------- | ----------- |
| created   | Initial state          | gray        |
| generated | First resume generated | blue        |
| screening | Application submitted  | orange      |
| rejected  | Received rejection     | red         |
| interview | Invited to interview   | green       |
| offer     | Received offer         | purple      |

**Status Transition Logic**:

- `generated` is set automatically on first successful generation (only from `created`)
- All other transitions are manual via dropdown
- Available options depend on whether generation exists

### API Contracts

No new endpoints. Existing endpoints extended:

**PUT /api/vacancies/:id**

- Request body can now include `status: VacancyStatus`
- Validation: status must be valid enum value

**POST /api/generations**

- On success: if vacancy.status === 'created', update to 'generated'
- Transaction: generation creation + status update atomic

### Component Architecture

```
VacancyDetailHeader
├── VacancyDetailBreadcrumbs (uses UBreadcrumb)
└── VacancyDetailNavDropdown (uses UDropdownMenu)

VacancyStatusBadge (uses UBadge + UDropdownMenu)
├── Badge display with color
└── Click opens status dropdown

[id]/overview.vue
├── VacancyDetailHeader
├── Title row (company, position, edit/delete buttons)
├── Meta row (last updated, vacancy link, VacancyStatusBadge)
├── Actions row (Generate Resume, Generate Cover Letter)
├── MatchScore (conditional)
├── Expiry (conditional)
├── Description
└── Notes (conditional)

[id]/resume.vue
├── VacancyDetailHeader
└── ResumeEditorLayout (reused from resume layer)
    └── Auto-save via useVacancyGeneration composable
```

### i18n Structure

```json
{
  "vacancy": {
    "status": {
      "created": "Created",
      "generated": "Generated",
      "screening": "Screening",
      "rejected": "Rejected",
      "interview": "Interview",
      "offer": "Offer"
    },
    "nav": {
      "overview": "Overview",
      "resume": "Resume",
      "cover": "Cover Letter",
      "preparation": "Preparation"
    },
    "overview": {
      "generateResume": "Generate Tailored Resume",
      "generateCoverLetter": "Generate Cover Letter",
      "vacancyPage": "Vacancy page",
      "lastUpdated": "Last Updated"
    },
    "breadcrumbs": {
      "vacancies": "Vacancies"
    },
    "comingSoon": "Coming soon"
  }
}
```

**Output**: See [data-model.md](./data-model.md), [contracts/vacancy-status.yaml](./contracts/vacancy-status.yaml), [quickstart.md](./quickstart.md).

## Implementation Phases

### Phase 2A: Schema & Migration (Foundation)

1. Add `VACANCY_STATUS_MAP` and `VACANCY_STATUS_VALUES` to `packages/schema/constants/enums.ts`
2. Add `VacancyStatusSchema` and `VacancyStatus` type to `packages/schema/schemas/enums.ts`
3. Update `VacancySchema` in `packages/schema/schemas/vacancy.ts` to include status field
4. Create DB migration to add `status` column with default 'created'
5. Update `VacancyInputSchema` to allow status updates

### Phase 2B: API Layer Updates

1. Update `PUT /api/vacancies/:id` to handle status field
2. Update `POST /api/generations` to auto-set status to 'generated' on first generation
3. Add unit tests for status transition logic

### Phase 2C: Page Structure & Routing

1. Modify `/vacancies/[id].vue` to be a layout wrapper with header
2. Create `/vacancies/[id]/index.vue` with redirect to overview
3. Create `/vacancies/[id]/overview.vue` (extract from current [id].vue)
4. Create `/vacancies/[id]/resume.vue` (extract generation editing)
5. Create placeholder pages: cover.vue, preparation.vue

### Phase 2D: Header & Navigation Components

1. Create `VacancyDetailHeader.vue` with thin header layout
2. Create `VacancyDetailBreadcrumbs.vue` using UBreadcrumb
3. Create `VacancyDetailNavDropdown.vue` using UDropdownMenu
4. Integrate header into [id].vue layout

### Phase 2E: Status Badge Component

1. Create `VacancyStatusBadge.vue` with clickable dropdown
2. Implement color mapping for all statuses
3. Implement contextual options based on generation history
4. Add status update action to store

### Phase 2F: Auto-Save Implementation

1. Create `useVacancyGeneration.ts` composable with watchDebounced
2. Integrate with `/vacancies/[id]/resume.vue`
3. Remove explicit Save/Cancel buttons from resume editing
4. Add undo/redo controls to footer

### Phase 2G: i18n & Polish

1. Add all new i18n keys to en.json
2. Update existing vacancy components to use new keys
3. Final styling pass for header and overview

### Phase 2H: Testing

1. Unit tests: VacancyStatusSchema, status color mapping
2. Integration tests: status transitions via API
3. E2E tests: navigation flow, status changes, auto-save

## Risk Assessment

| Risk                            | Impact | Mitigation                                 |
| ------------------------------- | ------ | ------------------------------------------ |
| Breaking existing vacancy pages | High   | Incremental refactor, test each step       |
| Auto-save race conditions       | Medium | Use VueUse watchDebounced (proven pattern) |
| Status dropdown UX confusion    | Low    | Clear visual feedback, toast on change     |
| Migration rollback needed       | Low    | Migration has down() method                |

## Dependencies

- Phase 2B depends on Phase 2A (schema must exist before API uses it)
- Phase 2C-2F can proceed in parallel after 2B
- Phase 2G depends on 2C-2F (all components must exist)
- Phase 2H depends on 2G (all features must be complete)

## Complexity Tracking

No complexity violations requiring justification.
