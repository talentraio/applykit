# Implementation Plan: Strategy-Based Resume Adaptation and Deterministic Scoring

**Branch**: `010-resume-generation-strategies` | **Date**: 2026-02-11 | **Spec**: `/Users/kolobok/WebstormProjects/_My/resume-editor/specs/010-resume-generation-strategies/spec.md`
**Input**: Feature specification from `/specs/010-resume-generation-strategies/spec.md`

## Summary

Introduce strategy-driven generation (`economy`, `quality`) for grouped adaptation+scoring,
keep current site UX/contract stable, add optional adaptation retry model control in admin routing,
and replace score judging with deterministic scoring built from structured LLM extraction/mapping.

## Technical Context

**Language/Version**: TypeScript 5.x (Nuxt 4 / Vue 3)
**Primary Dependencies**: Nuxt 4, NuxtUI 4, Pinia, Zod, Drizzle ORM, `@mullion/core`, `@mullion/ai-sdk`, Vercel AI SDK (`ai` + provider adapters)
**Storage**: PostgreSQL (Drizzle schema in `packages/nuxt-layer-api/server/data/`)
**Testing**: Vitest (unit/integration), Playwright smoke checks, `pnpm typecheck`, `pnpm lint`
**Target Platform**: Web (Nuxt site/admin) + Node/Nitro server runtime
**Project Type**: Nuxt monorepo with internal layer packages (`@int/api`, `@int/schema`, `@int/ui`)
**Performance Goals**:

- Preserve interactive generation behavior (target p95 under practical product thresholds for median resume/vacancy payloads).
- Keep cache hit opportunity high via stable prompt prefix.
- Minimize additional round-trips by keeping existing API response contract.

**Constraints**:

- No BYOK reintroduction.
- No `any` and no unsafe type assertions.
- Schema-first contracts in `packages/schema/` (package: `@int/schema`).
- Keep `POST /api/vacancies/:id/generate` contract backward compatible.
- Keep store/action architecture and i18n-first UI changes.

**Scale/Scope**:

- Routing config extension for strategy key and adaptation retry behavior.
- Generation pipeline split with deterministic scorer.
- Admin routing UI updates in two pages.
- New migration(s) for scoring breakdown persistence and strategy config fields.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                    | Status | Evidence                                                                                                           |
| ---------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------ |
| I. Documentation Is Binding  | PASS   | `docs/codestyle/base.md`, `docs/architecture/README.md`, `docs/api/README.md`, `docs/codestyle/README.md` reviewed |
| II. Nuxt Stack Invariants    | PASS   | Nuxt 4/NuxtUI 4 retained; no framework substitution                                                                |
| III. Schema-First Contracts  | PASS   | Strategy/scoring contracts defined first in `@int/schema`; endpoint handlers consume validated values              |
| IV. Store/Action Data Flow   | PASS   | Admin pages continue using store/composable data flow patterns                                                     |
| V. i18n and SSR Requirements | PASS   | New labels remain i18n-based; SSR flows for ATS/Human remain unchanged                                             |

**Post-Phase 1 re-check**: PASS. No constitutional violations introduced.

## Project Structure

### Documentation (this feature)

```text
specs/010-resume-generation-strategies/
├── plan.md
├── spec.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── llm-routing-strategy.yaml
└── tasks.md
```

### Source Code (repository root)

```text
packages/schema/                                      # package: @int/schema
├── constants/enums.ts                                # strategy enum and related values
├── schemas/enums.ts                                  # strategy validators
├── schemas/llm-routing.ts                            # routing input/output extensions
├── schemas/generation.ts                             # score breakdown schema (or equivalent)
└── index.ts

packages/nuxt-layer-api/                              # package: @int/api
├── server/
│   ├── api/vacancies/[id]/generate.post.ts           # endpoint orchestration remains stable to client
│   ├── api/admin/llm/routing/**                      # default/override assignment updates
│   ├── services/llm/
│   │   ├── generate.ts                               # strategy-aware orchestration
│   │   ├── index.ts                                  # scenario/strategy resolution + call wrappers
│   │   ├── prompts/
│   │   │   ├── shared-context.ts                     # stable cache prefix
│   │   │   ├── generate.ts                           # economy/quality adaptation prompt packs
│   │   │   └── generate-score.ts                     # structured extraction/mapping prompts
│   │   └── scoring/                                  # deterministic scorer utilities (new)
│   ├── data/
│   │   ├── schema.ts                                 # strategy + score breakdown persistence fields
│   │   ├── migrations/                               # DB migrations and seed updates
│   │   └── repositories/
│   │       └── llm-routing.ts                        # strategy/retry resolution in defaults/overrides
│   └── utils/usage.ts                                # usage context + cost accounting compatibility

apps/admin/layers/llm/
├── app/pages/llm/routing.vue                         # grouped strategy + retry controls
└── app/components/routing/Card.vue                   # reusable grouped controls with save/cancel UX

apps/admin/layers/roles/
└── app/pages/roles/[role].vue                        # role override strategy + retry controls
```

**Structure Decision**: Keep all runtime logic in `packages/nuxt-layer-api/` (package: `@int/api`),
all shared contracts in `packages/schema/` (package: `@int/schema`), and reuse existing admin
component hierarchy for grouped routing controls.

## Phase 0: Research

Research output: `/Users/kolobok/WebstormProjects/_My/resume-editor/specs/010-resume-generation-strategies/research.md`

Resolved items:

1. Strategy precedence and rollout mode.
2. Adaptation-only retry scope in this phase.
3. Shared-prefix prompt architecture for cache friendliness.
4. Deterministic scoring approach and persistence target.
5. Domain-agnostic signal taxonomy.

## Phase 1: Design and Contracts

Generated artifacts:

- `/Users/kolobok/WebstormProjects/_My/resume-editor/specs/010-resume-generation-strategies/data-model.md`
- `/Users/kolobok/WebstormProjects/_My/resume-editor/specs/010-resume-generation-strategies/contracts/llm-routing-strategy.yaml`
- `/Users/kolobok/WebstormProjects/_My/resume-editor/specs/010-resume-generation-strategies/quickstart.md`

### Data model highlights

- Add strategy key to routing assignments (default and role override path).
- Persist per-generation scoring breakdown JSON with versioning.
- Keep adaptation retry model configurable; scoring retry remains out of this phase.

### Contract highlights

- Extend admin routing input/output contracts to include strategy selection metadata.
- Keep public generation endpoint contract unchanged for site consumers.

## Implementation Phases

### Phase 2A: Schema and migration baseline

1. Extend `@int/schema` enums and routing schemas with strategy key support.
2. Add scoring breakdown schema and exports.
3. Add Drizzle migration(s):
   - strategy fields for routing assignments,
   - `score_breakdown` persistence in `generations`.
4. Backfill existing rows safely with legacy defaults.

### Phase 2B: LLM orchestration and deterministic scoring

1. Introduce strategy resolver and prompt-pack selector.
2. Implement `economy` and `quality` adaptation variants with shared prefix.
3. Add scoring pipeline:
   - `extractSignals`
   - `mapEvidence`
   - deterministic scorer utility
4. Keep non-blocking scoring fallback semantics.

### Phase 2C: Runtime routing and retry policy

1. Extend routing repository/service resolution to carry strategy metadata.
2. Enforce adaptation-only retry model behavior.
3. Preserve fallback model behavior when scenario config missing.

### Phase 2D: Admin UX updates

1. Update `/llm/routing` grouped card behavior for strategy selection + adaptation retry selection.
2. Reuse same card flow in `/roles/[id]` overrides.
3. Keep existing save/cancel dirty-state semantics stable.
4. Add i18n keys for new labels/help text.

### Phase 2E: Validation and regression

1. Unit tests for deterministic scoring and strategy resolution precedence.
2. Integration tests for generation flow (`economy`/`quality`, retry, scoring fallback).
3. Admin integration tests for default + role override persistence.
4. Run `pnpm typecheck`, `pnpm lint`, and relevant test suites.

## Risk Assessment

| Risk                                                          | Impact | Mitigation                                                                       |
| ------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------- |
| Strategy mismatch between routing defaults and role overrides | Medium | Centralize resolver precedence in one service and cover with integration tests   |
| Score breakdown schema drift over time                        | Medium | Add `version` field and backfill migration strategy                              |
| Retry model loops or duplicate retries                        | Medium | Guard against same model primary/retry and enforce bounded retry count           |
| Cache hit degradation after prompt edits                      | Medium | Keep shared prefix immutable and test prompt composition paths                   |
| Non-IT vacancy scoring regressions                            | High   | Use domain-agnostic signal taxonomy and regression fixtures across role families |

## Dependencies

- Phase 2A must complete before 2B/2C.
- Phase 2B and 2C are coupled and should land together.
- Phase 2D depends on schema/runtime contract updates from 2A/2C.
- Phase 2E runs after all implementation phases.

## Complexity Tracking

No constitution violations requiring additional justification.
