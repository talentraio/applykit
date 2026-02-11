# Implementation Plan: Cached Two-Step Adaptation Scoring + Mullion Integration

**Branch**: `009-llm-cached-flow` | **Date**: 2026-02-10 | **Spec**: `/Users/kolobok/WebstormProjects/_My/resume-editor/specs/009-llm-cached-flow/spec.md`
**Input**: Feature specification from `/specs/009-llm-cached-flow/spec.md`

## Summary

Refactor vacancy resume generation into two calls (adaptation then scoring), integrate Mullion (`@mullion/core`, `@mullion/ai-sdk`) via npm for shared context and explicit Gemini cached-content reuse, keep generation non-blocking when scoring fails (deterministic fallback scores), group scoring settings under adaptation in admin UX, and remove remaining BYOK artifacts across runtime/schema/docs.

## Technical Context

**Language/Version**: TypeScript 5.x (Nuxt 4 / Vue 3)
**Primary Dependencies**: Nuxt 4, Pinia, Zod, Drizzle ORM, OpenAI SDK, Google GenAI, Mullion (`@mullion/core`, `@mullion/ai-sdk`), Vercel AI SDK (`ai`, provider adapters)
**Storage**: PostgreSQL (Drizzle schema in `packages/nuxt-layer-api/server/data/`)
**Testing**: Vitest (unit/integration), Playwright (targeted admin/site checks), `pnpm typecheck`
**Target Platform**: Web (Nuxt site/admin) + Node.js/Nitro server runtime
**Project Type**: Nuxt monorepo with internal layers/packages (`@int/api`, `@int/schema`, `@int/ui`)
**Performance Goals**:

- Generation endpoint still responds within practical interactive bounds (target p95 < 5s for median resume/vacancy payloads)
- Added scoring phase should not duplicate full prompt cost on Gemini when cached-content is available
- No extra full-page client round trips for existing UI flows
  **Constraints**:
- no `any` / unsafe type assertions
- schema-first contracts in `@int/schema`
- no BYOK runtime/API/UI paths
- maintain current `POST /api/vacancies/:id/generate` response shape
- preserve role budget enforcement and global platform budget caps
  **Scale/Scope**:
- backend refactor in generation pipeline + LLM routing enums
- one new scenario key and one new usage context
- admin routing UX grouping updates
- docs/test updates for BYOK purge and two-step scoring

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                    | Status | Evidence                                                                                          |
| ---------------------------- | ------ | ------------------------------------------------------------------------------------------------- |
| I. Documentation Is Binding  | PASS   | `docs/codestyle/base.md`, `docs/architecture/*`, `docs/api/*` reviewed and reflected in this plan |
| II. Nuxt Stack Invariants    | PASS   | Nuxt 4/NuxtUI 4 retained; no framework substitution                                               |
| III. Schema-First Contracts  | PASS   | Enum/routing/usage changes are modeled first in `@int/schema` and DB schema                       |
| IV. Store/Action Data Flow   | PASS   | UI remains store/composable-driven; no ad-hoc client fetch divergence                             |
| V. i18n and SSR Requirements | PASS   | No new hardcoded user-facing strings; existing SSR paths preserved                                |

**Post-Phase 1 re-check**: PASS. No principle violations identified.

## Project Structure

### Documentation (this feature)

```text
specs/009-llm-cached-flow/
├── plan.md
├── spec.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── vacancy-generate-two-step.yaml
└── tasks.md
```

### Source Code (repository root)

```text
packages/schema/                                      # package: @int/schema
├── constants/enums.ts                                # scenario/usage/provider enum updates
├── schemas/enums.ts                                  # enum validators
├── schemas/llm-routing.ts                            # scenario typing update
├── schemas/usage.ts                                  # usage context/provider type updates
└── index.ts

packages/nuxt-layer-api/                              # package: @int/api
├── server/
│   ├── api/vacancies/[id]/generate.post.ts           # two-step orchestration endpoint behavior
│   ├── services/llm/
│   │   ├── index.ts                                  # runtime resolution + mullion integration boundary
│   │   ├── generate.ts                               # split adaptation/scoring APIs
│   │   ├── prompts/
│   │   │   ├── generate.ts                           # adaptation prompt only
│   │   │   └── generate-score.ts                     # NEW scoring prompt
│   │   ├── providers/{openai,gemini}.ts             # provider option support as needed
│   │   └── routing.ts
│   ├── utils/usage.ts                                # separate usage context logging
│   ├── data/
│   │   ├── schema.ts                                 # enum changes + scenario seed updates
│   │   ├── migrations/                               # provider_type/byok cleanup + new scenario seed
│   │   └── repositories/
│   │       ├── llm-routing.ts                        # scenario resolution unchanged API, new key support
│   │       └── usage-log.ts                          # platform-only breakdown cleanup
│   └── tests/integration/**                          # generation and routing tests
└── app/
    └── admin llm/roles pages/components             # scenario grouping UX changes

apps/admin/
└── layers/
    ├── llm/app/components/routing/Card.vue           # grouped adaptation+scoring controls
    └── roles/app/pages/roles/[role].vue              # uses grouped routing card

apps/site/
└── layers/vacancy/**                                 # no contract change expected; regression validation only
```

**Structure Decision**: Keep changes within existing monorepo boundaries. Implement Mullion in `@int/api` service layer and keep page/store contracts stable.

## Phase 0: Research

Research output is captured in `/Users/kolobok/WebstormProjects/_My/resume-editor/specs/009-llm-cached-flow/research.md`.

Resolved decisions:

1. Two-step generate+score architecture with non-blocking fallback save.
2. Dedicated scoring scenario key remains in backend routing model; admin UI groups it under adaptation.
3. Introduce dedicated scoring usage context for clearer analytics.
4. Enable explicit Gemini cached-content support now.
5. Purge BYOK residuals fully, including enum/runtime/docs references.

## Phase 1: Design and Contracts

Generated design artifacts:

- `/Users/kolobok/WebstormProjects/_My/resume-editor/specs/009-llm-cached-flow/data-model.md`
- `/Users/kolobok/WebstormProjects/_My/resume-editor/specs/009-llm-cached-flow/contracts/vacancy-generate-two-step.yaml`
- `/Users/kolobok/WebstormProjects/_My/resume-editor/specs/009-llm-cached-flow/quickstart.md`

### Data model highlights

- Add `resume_adaptation_scoring` to `LlmScenarioKey`.
- Add `resume_adaptation_scoring` to usage context enum.
- Remove `byok` from provider type enum and normalize legacy rows.
- Keep `generations` table score columns required, with deterministic fallback if LLM scoring fails.

### API/contract highlights

- Public `POST /api/vacancies/:id/generate` URL and response shape remain compatible.
- Runtime behavior is two-step internally.
- Admin routing payload supports scoring scenario but UI groups it with adaptation settings.

## Implementation Phases

### Phase 2A: Schema and migration baseline

1. Update `@int/schema` enums and Zod schemas:
   - add `resume_adaptation_scoring` scenario key
   - add `resume_adaptation_scoring` usage context
   - remove `BYOK` from provider type constants/validators
2. Update DB schema and migrations:
   - seed new scenario row
   - normalize `usage_logs.provider_type='byok'` to `platform`
   - migrate provider type enum to platform-only value set
3. Adjust repositories/types relying on provider breakdown shape.

### Phase 2B: LLM orchestration refactor

1. Split generation service into:
   - adaptation call (content)
   - scoring call (scores)
2. Integrate Mullion client for shared context orchestration.
3. Implement Gemini explicit cached-content handoff for second call.
4. Keep routing/budget checks enforced per call.
5. Implement deterministic scoring fallback path when scoring call fails.

### Phase 2C: Endpoint and usage logging

1. Refactor `/api/vacancies/[id]/generate.post.ts` to new orchestration service.
2. Log adaptation and scoring usage separately with distinct usage contexts.
3. Preserve vacancy status/canGenerate lock logic and ownership/limit checks.

### Phase 2D: Admin routing UX grouping

1. Keep separate backend scenario keys.
2. Group adaptation + scoring controls in same admin card UX for:
   - `/llm/routing`
   - `/roles/[id]`
3. Preserve Save/Cancel dirty-state logic and SSR-safe loading behavior.

### Phase 2E: BYOK residual purge

1. Remove/replace BYOK references in active runtime docs (`server/services/llm/README.md`, data/test READMEs, public terms page as product-approved).
2. Ensure integration tests and analytics no longer assume BYOK provider type branch.
3. Verify no runtime path accepts or processes BYOK headers/metadata.

### Phase 2F: Validation and regression

1. Unit tests for adaptation parser, scoring parser, and fallback scoring behavior.
2. Integration tests for two-step generation success/fallback/error paths.
3. Admin routing tests for grouped adaptation/scoring save and role override behavior.
4. Run `pnpm typecheck`, targeted tests, and lint.

## Risk Assessment

| Risk                                                         | Impact | Mitigation                                                                |
| ------------------------------------------------------------ | ------ | ------------------------------------------------------------------------- |
| Gemini cached-content lifecycle misconfiguration             | High   | feature-flag style guard + graceful fallback to non-cached scoring call   |
| Removing BYOK enum value breaks legacy DB records            | High   | data normalization migration before enum switch                           |
| Scoring fallback gives unstable/untrustworthy numbers        | Medium | deterministic algorithm + clamp/validation invariants + test fixtures     |
| Routing/UI grouping introduces config mismatch between pages | Medium | shared card component/composable and integration tests on both pages      |
| Additional call increases latency/cost in uncached providers | Medium | separate model selection, fallback model control, and cache-aware prompts |

## Dependencies

- Phase 2A must complete before 2B/2C.
- Phase 2B must complete before endpoint and usage integration tests.
- Phase 2D depends on scenario enum/API updates from 2A.
- Phase 2E can run in parallel with 2D after enum decisions are locked.
- Phase 2F runs after all implementation phases.

## Complexity Tracking

No constitution violations requiring special justification.
