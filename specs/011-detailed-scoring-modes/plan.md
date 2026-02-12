# Implementation Plan: Lightweight Score + On-Demand Detailed Scoring

**Branch**: `011-detailed-scoring-modes` | **Date**: 2026-02-11 | **Spec**: `/Users/kolobok/WebstormProjects/_My/resume-editor/specs/011-detailed-scoring-modes/spec.md`
**Input**: Feature specification from `/specs/011-detailed-scoring-modes/spec.md`

## Summary

Split scoring into two execution modes:

1. **Baseline score** in generation flow: always returned (`before/after`), lightweight and low-cost.
2. **Detailed score** on demand: generated only via explicit `Details` action, persisted and reused,
   with optional regeneration only when vacancy text changed (same condition as resume regeneration availability).

Add a dedicated admin routing scenario block for detailed scoring model management at defaults and role
override levels.

## Technical Context

**Language/Version**: TypeScript 5.x (Nuxt 4 / Vue 3)
**Primary Dependencies**: Nuxt 4, NuxtUI 4, Pinia, Zod, Drizzle ORM, Vercel AI SDK adapters, `@mullion/ai-sdk`
**Storage**: PostgreSQL (Drizzle schema under `packages/nuxt-layer-api/server/data/`)
**Testing**: Vitest unit/integration, Playwright smoke checks, `pnpm typecheck`, `pnpm lint`
**Target Platform**: Web (Nuxt site/admin) + Node/Nitro runtime
**Project Type**: Nuxt monorepo with layer packages (`@int/api`, `@int/schema`, `@int/ui`)
**Performance Goals**:

- Keep generation latency close to adaptation-only path (remove expensive always-on detailed scoring calls).
- Keep details action responsive for median vacancy/resume sizes with synchronous endpoint behavior.
- Preserve existing page responsiveness on `/vacancies/[id]/resume` and `/vacancies/[id]/preparation`.

**Constraints**:

- BYOK remains removed in UI/API/runtime.
- No `any` and no unsafe type assertions.
- Schema-first contracts in `packages/schema/` (package: `@int/schema`).
- Maintain backward compatibility for generation endpoint consumer fields used in site UI.
- Detailed scoring endpoint remains synchronous in this phase.

**Scale/Scope**:

- One new detailed scoring execution endpoint and preparation read integration.
- One new routing scenario key for detailed scoring in admin defaults/overrides.
- Persisted detailed scoring payload linked to generation.
- UI updates in site resume/preparation and admin routing/role pages.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                    | Status | Evidence                                                                                                           |
| ---------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------ |
| I. Documentation Is Binding  | PASS   | `docs/codestyle/base.md`, `docs/architecture/README.md`, `docs/api/README.md`, `docs/codestyle/README.md` reviewed |
| II. Nuxt Stack Invariants    | PASS   | Nuxt 4 / NuxtUI 4 retained; no framework substitution                                                              |
| III. Schema-First Contracts  | PASS   | New scenario and detailed score payload designed in `@int/schema` first                                            |
| IV. Store/Action Data Flow   | PASS   | Site/admin pages stay store/composable-driven                                                                      |
| V. i18n and SSR Requirements | PASS   | New UI labels are i18n-based; vacancy SSR structure remains unchanged                                              |

**Post-Phase 1 re-check**: PASS. No constitutional violations introduced.

## Project Structure

### Documentation (this feature)

```text
specs/011-detailed-scoring-modes/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── detailed-scoring-api.yaml
└── tasks.md
```

### Source Code (repository root)

```text
packages/schema/                                      # package: @int/schema
├── constants/enums.ts                                # add dedicated detailed scoring scenario key
├── schemas/llm-routing.ts                            # routing contracts include new scenario key
├── schemas/generation.ts                             # detailed scoring payload schema(s)
└── index.ts

packages/nuxt-layer-api/                              # package: @int/api
├── server/
│   ├── api/vacancies/[id]/generate.post.ts           # baseline score only in generate response path
│   ├── api/vacancies/[id]/generations/[generationId]/score-details.post.ts
│   ├── api/vacancies/[id]/preparation.get.ts         # include detailed scoring payload if available
│   ├── api/admin/llm/routing/**                      # support dedicated detailed scoring scenario in defaults/overrides
│   ├── services/llm/
│   │   ├── generate.ts                               # baseline scoring path
│   │   ├── score-details.ts                          # on-demand detailed scoring orchestration (new)
│   │   ├── scoring/                                  # reuse deterministic scoring extraction/mapping utilities
│   │   └── routing.ts
│   ├── data/
│   │   ├── schema.ts                                 # persist detailed scoring linked to generation
│   │   ├── migrations/                               # migration for detailed scoring persistence if needed
│   │   └── repositories/
│   │       ├── generation.ts
│   │       └── generation-score-detail.ts            # new repository (if separate table)
│   └── stores/
│       └── vacancy.ts                                # actions for details endpoint and preparation data

apps/site/layers/vacancy/
├── app/pages/vacancies/[id]/resume.vue               # Details/Regenerate details CTA behavior
├── app/pages/vacancies/[id]/preparation.vue          # render detailed score data
└── app/components/**                                 # optional details blocks and states

apps/admin/layers/llm/
└── app/pages/llm/routing.vue                         # separate scenario block for detailed scoring

apps/admin/layers/roles/
└── app/pages/roles/[role].vue                        # role override block for detailed scoring
```

**Structure Decision**: Keep runtime orchestration in `packages/nuxt-layer-api/` (package: `@int/api`),
shared contracts in `packages/schema/` (package: `@int/schema`), and extend existing site/admin layer
pages rather than introducing new app-level modules.

## Phase 0: Research

Research output: `/Users/kolobok/WebstormProjects/_My/resume-editor/specs/011-detailed-scoring-modes/research.md`

Resolved decisions:

1. Detailed scoring endpoint is synchronous in this phase.
2. Repeated details requests reuse persisted result by default.
3. Regeneration is explicitly gated by vacancy-text-change condition (same as current resume
   regeneration availability gate).
4. Detailed scoring model routing is managed as a separate scenario block in admin defaults/overrides.
5. Baseline generation score remains cheap and contract-stable (`before/after` only).

## Phase 1: Design and Contracts

Generated artifacts:

- `/Users/kolobok/WebstormProjects/_My/resume-editor/specs/011-detailed-scoring-modes/data-model.md`
- `/Users/kolobok/WebstormProjects/_My/resume-editor/specs/011-detailed-scoring-modes/contracts/detailed-scoring-api.yaml`
- `/Users/kolobok/WebstormProjects/_My/resume-editor/specs/011-detailed-scoring-modes/quickstart.md`

### Data model highlights

- Preserve baseline score fields on generation for fast overview rendering.
- Persist detailed scoring payload independently and link to generation.
- Store/compare version marker (or vacancy fingerprint) to detect stale details and control regenerate
  CTA visibility.

### Contract highlights

- New endpoint for details generation/read-through behavior.
- Preparation endpoint includes details when available.
- Admin routing contract supports new detailed scoring scenario key.

## Implementation Phases

### Phase 2A: Schema and persistence foundation

1. Extend `@int/schema` with detailed scoring scenario key and payload schema.
2. Update DB schema/migrations for detailed scoring persistence (new table or explicit dedicated fieldset).
3. Add repository methods for read/write and stale-check metadata.

### Phase 2B: API and service orchestration

1. Refactor generation service path to keep baseline score lightweight.
2. Add detailed scoring orchestration service for on-demand execution.
3. Implement `POST /score-details` sync endpoint:
   - default reuse persisted,
   - regenerate only when allowed.
4. Wire preparation endpoint data assembly with detailed scoring payload.

### Phase 2C: Site UI integration

1. Update resume page score block:
   - always show baseline score,
   - show `Details` for eligible roles,
   - show `Regenerate details` only under vacancy-change condition.
2. Add loading/error/success states with toast handling.
3. Update preparation page to render detailed data or empty state.

### Phase 2D: Admin routing updates

1. Add separate detailed scoring scenario card in `/llm/routing`.
2. Add corresponding override card in `/roles/[id]`.
3. Reuse shared scenarios list/modal patterns where applicable.
4. Add i18n keys for new labels/capabilities text.

### Phase 2E: Validation and regression

1. Unit tests for eligibility/reuse/regenerate gating logic.
2. Integration tests for details endpoint and preparation payload.
3. Admin integration tests for detailed scenario defaults/overrides.
4. Run `pnpm typecheck`, `pnpm lint`, and targeted test suites.

## Risk Assessment

| Risk                                                        | Impact | Mitigation                                                                             |
| ----------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------- |
| Baseline score perceived as too coarse                      | Medium | Keep deterministic invariants, document semantics, provide clear `Details` upsell path |
| Sync detailed scoring latency spikes                        | Medium | Strict output limits, bounded retries, and clear UI loading state                      |
| Regenerate gate mismatch with existing vacancy-change logic | High   | Reuse same source-of-truth flag/condition already used by resume regeneration          |
| Scenario config drift between defaults and overrides        | Medium | Centralized resolver precedence tests (`role override -> default -> fallback`)         |
| Duplicate concurrent details requests                       | Medium | Add idempotent read-through behavior and repository-level upsert guards                |

## Dependencies

- Phase 2A is prerequisite for 2B/2D.
- Phase 2B is prerequisite for 2C.
- Phase 2D can proceed in parallel with 2C after 2A contract changes.
- Phase 2E runs after all implementation phases.

## Complexity Tracking

No constitution violations requiring additional justification.
