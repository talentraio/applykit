# Implementation Plan: Admin LLM Model Catalog and Scenario Routing

**Branch**: `008-admin-llm-models-management` | **Date**: 2026-02-09 | **Spec**: `specs/008-admin-llm-models-management/spec.md`
**Input**: Feature specification from `/specs/008-admin-llm-models-management/spec.md`

## Summary

Introduce an admin-managed LLM control plane with model catalog CRUD and scenario-based routing
(including role overrides), move model/cost configuration out of provider hardcode, and remove BYOK
across runtime/API/admin/profile surfaces. Runtime model resolution remains centralized in
`callLLM`, with precedence:

1. role + scenario override
2. scenario default
3. provider fallback default

## Technical Context

**Language/Version**: TypeScript 5.x (Nuxt 4 / Vue 3)
**Primary Dependencies**: Nuxt 4, NuxtUI v4, Pinia, Zod, Drizzle ORM, date-fns
**Storage**: PostgreSQL (Drizzle schema in `packages/nuxt-layer-api/server/data/`)
**Testing**: Vitest (unit/integration), Playwright (E2E), `pnpm typecheck`
**Target Platform**: Web (admin UI + authenticated site UI), Node.js server runtime
**Project Type**: Nuxt monorepo with layers and shared packages (`@int/api`, `@int/schema`)
**Performance Goals**:

- admin CRUD/routing endpoints p95 < 250ms in local/staging conditions
- runtime model resolution adds no extra network call and <= 1 DB lookup chain
  **Constraints**:
- no `any`/unsafe assertions
- schema-first contracts in `@int/schema`
- store/action data flow on client
- i18n for all new user-facing strings
- BYOK removed end-to-end (no `x-api-key` path)
  **Scale/Scope**:
- 2 new admin pages
- 6-9 new admin endpoints
- 3-4 new DB tables + 1 removal (`llm_keys`)
- updates across admin/site/api/schema layers

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                    | Status | Evidence                                                                                          |
| ---------------------------- | ------ | ------------------------------------------------------------------------------------------------- |
| I. Documentation Is Binding  | PASS   | `docs/codestyle/base.md`, `docs/architecture/*`, `docs/api/*` reviewed and reflected in this plan |
| II. Nuxt Stack Invariants    | PASS   | Nuxt 4 + NuxtUI 4 only; no framework substitutions                                                |
| III. Schema-First Contracts  | PASS   | New entities/endpoints are defined first in `@int/schema` and API contracts                       |
| IV. Store/Action Data Flow   | PASS   | Admin UI changes route through `@int/api` infrastructure/composables/stores                       |
| V. i18n and SSR Requirements | PASS   | All UI labels/messages routed via i18n keys; no SSR regressions introduced                        |

**Post-Phase 1 re-check**: PASS. No principle violations found.

## Project Structure

### Documentation (this feature)

```text
specs/008-admin-llm-models-management/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
│   └── admin-llm-routing.yaml
└── tasks.md             # Phase 2 output (via /speckit.tasks)
```

### Source Code (repository root)

```text
packages/schema/                                      # package: @int/schema
├── constants/
│   └── enums.ts                                      # new LLM scenario/status enums, BYOK cleanup
├── schemas/
│   ├── role-settings.ts                              # remove byokEnabled
│   ├── usage.ts                                      # provider type shape update
│   ├── llm-model.ts                                  # NEW
│   └── llm-routing.ts                                # NEW
└── index.ts                                          # exports

packages/nuxt-layer-api/                              # package: @int/api
├── app/
│   ├── infrastructure/
│   │   ├── admin-llm-models.api.ts                   # NEW
│   │   └── admin-llm-routing.api.ts                  # NEW
│   ├── composables/
│   │   ├── useAdminLlmModels.ts                      # NEW
│   │   └── useAdminLlmRouting.ts                     # NEW
│   └── stores/
│       ├── admin-llm-models.ts                       # NEW
│       ├── admin-llm-routing.ts                      # NEW
│       ├── admin-roles.ts                            # remove byok fields from data flow
│       └── admin-system.ts                           # provider usage shape update
└── server/
    ├── api/
    │   ├── admin/llm/models/*.ts                     # NEW CRUD
    │   ├── admin/llm/routing/*.ts                    # NEW routing endpoints
    │   ├── admin/roles/[role].put.ts                 # remove byok input/merge
    │   ├── resume/index.post.ts                      # remove x-api-key usage path
    │   ├── resumes/index.post.ts                     # remove x-api-key usage path (legacy endpoint)
    │   ├── vacancies/[id]/generate.post.ts           # remove x-api-key usage path
    │   └── keys/*.ts                                 # remove BYOK endpoints
    ├── data/
    │   ├── schema.ts                                 # new llm tables; remove llm_keys + role byok column
    │   ├── migrations/                               # NEW migration(s)
    │   └── repositories/
    │       ├── llm-model.ts                          # NEW
    │       ├── llm-routing.ts                        # NEW
    │       ├── role-settings.ts                      # remove byok handling
    │       └── usage-log.ts                          # provider aggregation update
    └── services/llm/
        ├── index.ts                                  # resolver + BYOK removal
        ├── types.ts                                  # remove userApiKey docs/options
        ├── parse.ts                                  # scenario-aware call options
        ├── generate.ts                               # scenario-aware call options
        └── providers/{openai,gemini}.ts             # remove hardcoded pricing as source of truth

apps/admin/
├── app/pages/
│   └── llm/
│       ├── models.vue                                # NEW
│       └── routing.vue                               # NEW
└── layers/**/app/components                          # NEW model/routing UI components as needed

apps/site/
└── layers/profile/
    ├── app/pages/settings.vue                        # remove BYOK settings section
    └── app/components/KeyManager.vue                 # remove component usage and file
```

**Structure Decision**: Keep existing monorepo/layer structure. Add feature-specific admin
composables/stores/API modules under existing `@int/api` boundaries rather than introducing a new
package.

## Phase 0: Research

Research outputs are documented in `research.md`.

### Key decisions resolved

1. `llm_models` becomes cost/capability source of truth; provider adapters stop owning pricing maps.
2. Runtime resolver precedence is fixed (role override > scenario default > provider fallback).
3. BYOK removal strategy is full runtime/API/UI removal with legacy data compatibility safeguards.
4. Usage analytics after BYOK removal aggregates legacy `byok` into platform view for admin UI.
5. Scenario taxonomy for this phase is fixed to:
   - `resume_parse`
   - `resume_adaptation`
   - `cover_letter_generation`

## Phase 1: Design and Contracts

Design artifacts generated:

- `data-model.md`
- `contracts/admin-llm-routing.yaml`
- `quickstart.md`

### Data model highlights

- New entities:
  - `llm_models`
  - `llm_scenarios`
  - `llm_scenario_models`
  - `llm_role_scenario_overrides`
- Modified entities:
  - `role_settings` (remove `byok_enabled`)
  - `usage_logs` read model (BYOK runtime disabled; legacy rows tolerated)
- Removed entity:
  - `llm_keys`

### API contract highlights

- Admin model catalog CRUD
- Admin routing configuration read/write
- Role override upsert/delete per scenario
- Existing parse/generate endpoints preserve URL surface but remove BYOK header behavior

## Implementation Phases

### Phase 2A: Schema and migration foundation

1. Add LLM model/routing schemas and enums in `@int/schema`.
2. Add new DB tables and indexes for model catalog and routing.
3. Remove `llm_keys` table and `role_settings.byok_enabled`.
4. Add migration for legacy compatibility strategy (provider type handling and defaults).

### Phase 2B: Repositories and runtime resolver

1. Implement repositories for model catalog and routing lookups.
2. Add runtime resolver in `services/llm/index.ts`:
   - resolve scenario config
   - resolve role override
   - apply fallback model
3. Integrate resolver into parse/generate services.

### Phase 2C: BYOK removal in API/runtime

1. Remove `userApiKey` option path from LLM service APIs.
2. Remove `x-api-key` handling from parse/generate endpoints.
3. Remove `/api/keys/*` endpoints and key repository usage.
4. Update role settings endpoints and validators to remove `byokEnabled`.

### Phase 2D: Admin API surface for models/routing

1. Implement `/api/admin/llm/models` CRUD endpoints.
2. Implement `/api/admin/llm/routing` endpoints (default + role overrides).
3. Enforce `super_admin` authorization and validation on all new routes.

### Phase 2E: Admin client integration

1. Add infrastructure APIs + stores + composables for models/routing.
2. Implement admin pages:
   - `/llm/models`
   - `/llm/routing`
3. Add navigation and i18n keys.

### Phase 2F: Profile/settings and admin usage cleanup

1. Remove KeyManager usage from profile settings.
2. Remove or replace BYOK-related i18n keys in site/admin.
3. Update usage widgets/contracts to platform-only provider display behavior.

### Phase 2G: Tests and docs

1. Unit tests for repositories and resolver precedence.
2. Integration tests for admin endpoints and parse/generate model resolution.
3. Update docs: `docs/api/endpoints.md`, `docs/api/schemas.md`, architecture security notes.
4. Run `pnpm typecheck`, targeted tests, and lint.

## Risk Assessment

| Risk                                                         | Impact | Mitigation                                                                      |
| ------------------------------------------------------------ | ------ | ------------------------------------------------------------------------------- |
| BYOK removal breaks legacy clients still sending header      | Medium | Ignore unknown header safely and ensure behavior remains platform-driven        |
| Pricing mismatch after removing hardcoded adapter rates      | High   | Single source of truth in `llm_models`; add fallback and validation in resolver |
| Admin role settings regressions after removing `byokEnabled` | Medium | Contract tests for roles endpoints + UI form validation updates                 |
| Missing routing config for scenario at runtime               | Medium | deterministic fallback to provider default + warning logs                       |
| Data migration side effects on usage analytics               | Low    | keep backward-compatible storage interpretation and normalize at query layer    |

## Dependencies

- Phase 2A must complete before 2B/2D.
- Phase 2B must complete before parse/generate runtime tests.
- Phase 2D must complete before 2E.
- Phase 2C and 2F are tightly coupled and should be validated together.
- Phase 2G runs after all implementation phases.

## Complexity Tracking

No constitution violations requiring justification.
