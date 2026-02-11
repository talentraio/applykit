# Feature Specification: Strategy-Based Resume Adaptation and Deterministic Scoring

## Overview

Implement a configurable generation architecture where resume adaptation and scoring run through
switchable strategies (`economy`, `quality`) without changing current user UX:

1. User generates a tailored resume once.
2. User later chooses ATS/Human visual export.

The generated content remains one canonical `ResumeContent` that is both ATS-friendly and
human-readable. Strategy selection must be manageable globally (LLM routing defaults) and overridable
per role.

## Clarifications

### Session 2026-02-11

- Q: Where should scoring breakdown be stored? -> A: Persist per generation in a JSON field and keep
  aggregate telemetry in usage logs.
- Q: Do we need retry model for scoring in this phase? -> A: No, retry model is in scope only for
  adaptation in this phase.
- Q: How should strategy rollout happen? -> A: Immediate global defaults with optional per-role
  overrides, no feature flag in this phase.

## Goals

- Introduce pluggable generation strategies for the adaptation+scoring scenario.
- Keep current frontend API contract for vacancy generation and overview pages stable.
- Add configurable retry model for adaptation scenario in admin routing when needed.
- Replace LLM-native "single-number judging" with deterministic scoring computation driven by
  structured LLM extraction/mapping.
- Preserve provider-agnostic behavior for non-IT office professions.
- Maintain cache-friendly prompt architecture (stable shared prefix) to reduce repeated token cost.

## Non-goals

- No redesign of ATS/Human page layouts.
- No split into separate generated contents for ATS and Human.
- No reintroduction of BYOK flows.
- No billing system redesign in this feature.
- No rewrite of unrelated scenarios unless needed for shared infrastructure compatibility.

## Scope

In scope:

- Scenario architecture for `resume_adaptation` + `resume_adaptation_scoring`.
- Strategy config, selection, and resolution (global defaults + role overrides).
- Prompt packs for `economy` and `quality` strategies.
- Deterministic scoring pipeline (`extractSignals` -> `mapEvidence` -> code-based score).
- Admin UI/API changes needed for strategy/retry model selection.
- Internal scoring breakdown persistence/telemetry for observability.

Out of scope:

- Migration of historical generations to new scoring breakdown.
- New payment plans or monetization UX.
- New public-facing pages.

## Roles & limits

Roles stay unchanged:

- `super_admin`
- `friend`
- `public`

Limits/safety policy stays active:

- Per-user usage limits (day/week/month where configured) remain enforced.
- Platform global budget cap remains enforced.
- Admin kill switch remains authoritative.

BYOK policy:

- BYOK is removed and remains unsupported.
- All model calls are platform-managed provider executions only.

## User Scenarios & Testing

### User Story 1 - Role-aware strategy execution (Priority: P1)

As a platform user, I can generate a tailored resume with quality level defined by routing defaults or
my role override, while keeping same generation UX.

**Why this priority**: This is core product behavior and must work before additional scoring
improvements have value.

**Independent Test**: Configure `economy` as default and `quality` override for one role, run
generation for users from different roles, verify different configured models/prompts are used and the
same response shape is returned.

**Acceptance Scenarios**:

1. **Given** default strategy is `economy`, **When** user without role override generates,
   **Then** economy strategy is resolved.
2. **Given** role override is `quality`, **When** user with that role generates,
   **Then** quality strategy is resolved and applied.

---

### User Story 2 - Deterministic, explainable scoring (Priority: P1)

As a platform owner, I need stable scoring that is explainable and less temperature-dependent.

**Why this priority**: Current product confidence depends on score credibility.

**Independent Test**: Run generation twice on same inputs with scoring temperatures fixed; verify score
variance remains within deterministic bounds and breakdown data explains final result.

**Acceptance Scenarios**:

1. **Given** vacancy/base/tailored content, **When** scoring pipeline runs,
   **Then** output includes `matchScoreBefore` and `matchScoreAfter` derived by deterministic code.
2. **Given** scoring extraction fails, **When** fallback path executes,
   **Then** generation still saves with invariant-safe fallback scores.

---

### User Story 3 - Admin strategy and retry configurability (Priority: P2)

As `super_admin`, I can set default strategy/model and optional retry model for adaptation, and
optionally override by role.

**Why this priority**: Enables promo vs paid quality segmentation without deployments.

**Independent Test**: Save defaults on `/llm/routing`, save role override on `/roles/[id]`, reload both
pages, verify persisted and correctly resolved at runtime.

**Acceptance Scenarios**:

1. **Given** adaptation retry model is selected in admin, **When** primary adaptation call fails,
   **Then** retry model is used according to retry policy.
2. **Given** no retry model selected, **When** primary call fails,
   **Then** existing fallback behavior remains consistent and explicit.

## User flows

### Flow A: Generate tailored resume (canonical content)

1. User opens `/vacancies/[id]/overview` and clicks generate/re-generate.
2. API validates auth, ownership, limits, and vacancy generation state.
3. Runtime resolves strategy (`role override` -> `default` -> fallback).
4. Adaptation phase returns canonical tailored `ResumeContent`.
5. Scoring phase runs extraction + evidence mapping.
6. Deterministic scorer computes final scores and breakdown.
7. Generation is saved and returned with existing response shape.

### Flow B: Adaptation failure with retry model

1. Adaptation primary model fails/transient errors.
2. If retry model configured, retry with configured retry model and policy.
3. If all attempts fail, return structured error and preserve existing user-facing behavior.

### Flow C: Scoring non-blocking fallback

1. Adaptation succeeds.
2. Scoring extraction/map fails.
3. Generation is still persisted with deterministic fallback score invariants.

## UI/pages

No new pages. In-scope updates:

- `apps/admin/layers/llm/app/pages/llm/routing.vue`
- `apps/admin/layers/roles/app/pages/roles/[role].vue`
- Reused routing card/components for strategy + optional retry selection.

Site generation pages must keep current behavior:

- `apps/site/layers/vacancy/app/pages/vacancies/[id]/overview.vue`

## Data model

Strict schemas remain in `packages/schema/` (package: `@int/schema`) with Zod + inferred types.

Required model additions/adjustments:

- Strategy key enum/validation for adaptation flow (`economy`, `quality`) where configuration is
  stored.
- Optional retry model linkage for adaptation scenario routing entries.
- Scoring breakdown entity/schema persisted on generation records (with telemetry export), including
  components:
  `core`, `mustHave`, `niceToHave`, `responsibilities`, `human`.
- Domain-agnostic vacancy signal schema (`jobFamily`, requirements, responsibilities, terms,
  constraints).

## API surface

Public contract stays stable:

- `POST /api/vacancies/:id/generate` response remains backward compatible for site UI.

Admin/runtime contract updates in scope:

- Routing defaults/overrides payloads support:
  - strategy selection for grouped adaptation flow.
  - optional retry model for adaptation scenario.
- Scoring scenario keeps existing model selection path and does not add a dedicated retry model in this
  phase.
- Runtime model resolution for strategy-aware adaptation/scoring phases.

All endpoints follow Nitro server conventions in `packages/nuxt-layer-api/server/api/*`.

## LLM workflows

### Parse workflow

- Resume parsing remains separate scenario.
- Existing parse primary+retry model pattern is reference behavior for adaptation retry UX.
- Zod validation remains in services, not endpoint handlers.

### Generate workflow (target)

- Shared stable context prefix built once for adaptation+scoring.
- Strategy-specific prompt pack:
  - `economy`: shorter, minimal-edit constraints, low cost.
  - `quality`: stronger anti-plastic constraints and richer rewrite guidance.
- Scoring pipeline:
  1. `extractSignals(vacancy)` (LLM, structured JSON, temp low)
  2. `mapEvidence(base/tailored, signals)` (LLM, structured JSON, temp low)
  3. `computeScoreDeterministic(mappedEvidence)` (application code)
- Zod validation gates both extraction and mapping outputs.

## Limits & safety

- Daily/weekly/monthly per-user limits remain enforced by existing limit services.
- Global platform budget cap remains enforced for each LLM call.
- Admin kill switch remains effective for generation flows.
- Hard-gates before persistence:
  - schema-valid output,
  - identity/contact unchanged,
  - no unsupported hallucinated facts.

## Security & privacy

- Never expose provider keys to client or logs.
- Shared context caching must remain request/user scoped and auditable.
- No cross-user content leakage through cache orchestration.
- Continue platform-only provider model (no BYOK).

## i18n keys

- Any new admin labels/messages for strategy and retry selection must be added to admin locale files.
- No hardcoded user-facing strings in pages/components.

## Monorepo/layers touchpoints

- `packages/nuxt-layer-api/` (package: `@int/api`)
  - LLM orchestration, routing resolution, generation endpoint, usage logging.
- `packages/schema/` (package: `@int/schema`)
  - enums and Zod contracts for strategies/scoring breakdown.
- `apps/admin/layers/llm/`
  - routing defaults UI and grouped adaptation controls.
- `apps/admin/layers/roles/`
  - per-role override UI for grouped adaptation controls.
- `apps/site/layers/vacancy/`
  - consumer of unchanged generation contract.

## Acceptance criteria

1. Strategy resolution works in precedence order: role override -> global default -> runtime fallback.
2. `economy` and `quality` strategies are switchable without deploy.
3. Adaptation scenario supports optional retry model in admin configuration.
4. Strategy rollout is immediate via global defaults and supports per-role override without feature
   flags.
5. Generation endpoint response shape remains compatible with current site UI.
6. Scoring uses structured extraction+mapping and deterministic code computation.
7. Scoring breakdown is persisted per generation and available internally for debugging/analysis.
8. BYOK remains fully absent from runtime/API/UI.
9. Typecheck/lint/tests for touched areas pass.

## Edge cases

- Role override points to archived/disabled model.
- Retry model equals primary model (should avoid duplicate retry loop behavior).
- Vacancy description extremely short or extremely long.
- Non-IT office vacancy with sparse explicit keywords.
- Scoring extraction succeeds but evidence mapping partially fails.
- Admin changes routing while generation request is in-flight.

## Testing plan

- Unit tests:
  - strategy resolver precedence.
  - deterministic scorer math and invariants.
  - prompt-pack selection and shared-prefix composition.
- Integration tests (`packages/nuxt-layer-api/tests/integration`):
  - generation success for economy and quality strategy.
  - adaptation retry model path.
  - scoring fallback non-blocking behavior.
  - routing default + role override persistence and runtime resolution.
- UI smoke tests (admin):
  - `/llm/routing` save/cancel state and retry selector behavior.
  - `/roles/[id]` override behavior for grouped adaptation controls.

## Open questions / NEEDS CLARIFICATION

No critical ambiguities remain for planning.
