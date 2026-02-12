# Feature Specification: Lightweight Score + On-Demand Detailed Scoring

## Overview

Implement a dual-mode scoring flow for tailored resume generation:

1. **Baseline scoring (always-on, low cost)** during `POST /api/vacancies/:id/generate`:
   return only `matchScoreBefore` and `matchScoreAfter`.
2. **Detailed scoring (on demand, premium capability)** triggered by user action (`Details`),
   persisted, then displayed on `/vacancies/[id]/preparation`.

This keeps generation fast and predictable while allowing advanced users to request deep analysis only
when needed.

## Clarifications

### Session 2026-02-11

- Q: Should detailed scoring endpoint be synchronous in this phase, or return async job status for long runs? -> A: Synchronous endpoint in this phase.
- Q: For repeated `Details` click on same generation, should we reuse or regenerate? -> A: Reuse existing by default; show `Regenerate` only when vacancy text changed (same rule as resume regeneration availability).

## Documentation Gate

- Before code changes, follow `docs/codestyle/base.md`.
- For architecture/API decisions, follow `docs/architecture/*` and `docs/api/*`.
- Keep Nuxt v4 + NuxtUI v4 invariants.

## Goals

- Reduce average generation cost by making baseline scoring lightweight.
- Keep current UX contract of showing before/after score after generation.
- Introduce premium detailed scoring as an explicit, user-triggered action.
- Reuse detailed scoring output on `/vacancies/[id]/preparation`.
- Add admin-manageable routing for detailed scoring as a separate scenario block.

## Non-goals

- No BYOK reintroduction.
- No redesign of existing ATS/Human resume output flow.
- No full interview preparation planner implementation in this feature
  (only readiness via detailed scoring data on preparation page).
- No billing system redesign.

## Scope

In scope:

- Baseline scoring refactor to low-cost output (`before`, `after` only).
- New detailed scoring workflow triggered by explicit user action.
- Persisting and retrieving detailed scoring data per generation.
- Site UI updates: `Details` action and preparation page consumption.
- Admin UI/API updates: separate detailed scoring scenario block in routing defaults and role overrides.

Out of scope:

- Long-running async orchestration infrastructure (queues/workers).
- Historical backfill of detailed scoring for old generations.

## Roles & limits

Roles remain:

- `super_admin`
- `friend`
- `public`

Policy:

- BYOK is unsupported and remains removed.
- Platform-only provider execution remains mandatory.
- Existing day/week/month budget caps and global platform cap remain enforced for both baseline and
  detailed scoring calls.

Detailed scoring availability:

- Role-dependent via admin routing/override configuration.
- If no model is configured/resolvable for detailed scoring scenario, `Details` action is hidden.

## User Scenarios & Testing

### User Story 1 - Fast generation with baseline score (Priority: P1)

As a user, I generate tailored resume and immediately get before/after score without paying for deep
analysis.

**Why this priority**: This is the main path and impacts every generation request.

**Independent Test**: Generate on `/vacancies/[id]/overview`; verify response includes valid
`matchScoreBefore` and `matchScoreAfter`; verify no detailed scoring payload is required.

**Acceptance Scenarios**:

1. **Given** valid vacancy and resume context, **When** user generates, **Then** system persists
   tailored resume with baseline score only.
2. **Given** baseline scoring failure, **When** fallback logic is applied, **Then** generation still
   completes with invariant-safe before/after values.

---

### User Story 2 - On-demand detailed score for eligible roles (Priority: P1)

As an eligible user, I can request detailed score only when I need deeper insight.

**Why this priority**: Enables premium value while controlling cost.

**Independent Test**: Click `Details` on generated resume; verify detailed scoring runs, persists, and
user is redirected to `/vacancies/[id]/preparation` where details are shown.

**Acceptance Scenarios**:

1. **Given** generation exists and role is eligible, **When** user clicks `Details`, **Then** detailed
   scoring is generated and saved if not already available.
2. **Given** detailed scoring already exists for generation, **When** user clicks `Details`, **Then**
   system reuses persisted result.
3. **Given** vacancy text changed and detailed scoring exists, **When** user opens resume page,
   **Then** `Regenerate details` action becomes available.

---

### User Story 3 - Admin manages detailed scoring scenario separately (Priority: P2)

As `super_admin`, I can configure detailed scoring model routing independently from baseline scoring.

**Why this priority**: Detailed scoring has different quality/cost targets and should be controlled
separately.

**Independent Test**: Update default + role override model in routing UI; verify runtime resolves
correct model for detailed scoring endpoint.

**Acceptance Scenarios**:

1. **Given** `/llm/routing`, **When** admin edits detailed scoring scenario block,
   **Then** changes persist and are used at runtime.
2. **Given** `/roles/[id]`, **When** admin sets role override for detailed scoring,
   **Then** role-specific model resolution takes precedence over default.

## User flows

### Flow A: Generate tailored resume (baseline only)

1. User clicks generate/re-generate on `/vacancies/[id]/overview`.
2. Adaptation runs as configured.
3. Baseline scoring runs in low-cost mode and returns `before/after` only.
4. Generation is persisted with baseline score fields.
5. UI shows score values as today.

### Flow B: Request detailed scoring

1. Eligible user sees `Details` button near baseline score.
2. User clicks `Details`.
3. API synchronously generates (or loads existing) detailed score for current generation.
4. UI redirects user to `/vacancies/[id]/preparation`.
5. Preparation page displays detailed score breakdown.

### Flow C: Admin config for detailed scenario

1. Admin opens `/llm/routing` and edits dedicated detailed scoring block.
2. Optionally sets role-specific overrides on `/roles/[id]`.
3. Runtime uses standard precedence: role override -> scenario default -> runtime fallback.

## UI/pages

Site:

- `apps/site/layers/vacancy/app/pages/vacancies/[id]/resume.vue`
  - show baseline score (`before/after`) as today.
  - show `Details` action only when eligible.
  - show `Regenerate details` only when vacancy text changed under the same condition used for resume
    re-generation availability.
- `apps/site/layers/vacancy/app/pages/vacancies/[id]/preparation.vue`
  - show persisted detailed score breakdown.
  - remain compatible with future preparation plan generation.

Admin:

- `apps/admin/layers/llm/app/pages/llm/routing.vue`
  - add separate scenario block/card for detailed scoring config.
- `apps/admin/layers/roles/app/pages/roles/[role].vue`
  - add corresponding override block for detailed scoring.

## Data model

Strict contracts stay in `packages/schema/` (package: `@int/schema`) using Zod + inferred types.

Planned entities/contracts:

- Baseline score contract: before/after integers (0..100).
- Detailed score contract (persisted JSON):
  - matched requirements/evidence
  - gaps/missing signals
  - weighted breakdown used for explanation
  - model/strategy metadata used for traceability
- Scenario key addition for dedicated detailed scoring routing
  (e.g. `resume_adaptation_scoring_detail`).

Persistence approach:

- Store detailed scoring separately from baseline fields to keep generation payload lightweight.
- Link detailed scoring data to a concrete generation record.

## API surface

Existing:

- `POST /api/vacancies/:id/generate`
  - remains backward-compatible for baseline score fields.

New/extended:

- `POST /api/vacancies/:id/generations/:generationId/score-details`
  - synchronous endpoint in this phase.
  - return persisted detailed scoring by default when available.
  - regenerate only when explicitly requested and vacancy text changed.
  - enforce auth/ownership/role eligibility.
- `GET /api/vacancies/:id/preparation`
  - include detailed scoring payload (if available) for current/latest generation.

Admin routing APIs:

- Extend routing defaults/overrides to support dedicated detailed scoring scenario configuration.
- Keep same admin patterns used by existing scenario routing endpoints.

## LLM workflows

### Parse workflow

- Unchanged.

### Generate workflow (baseline)

- Adaptation workflow remains strategy-aware (`economy` / `quality`).
- Baseline scoring uses lightweight output path and returns only two numbers.
- Keep fallback invariants for reliability.

### Detailed scoring workflow (on demand)

- Triggered only by explicit user action (`Details`).
- Default behavior is read-through reuse of persisted detailed scoring for same generation.
- Uses dedicated scenario routing config (primary + optional retry model).
- Produces structured, explainable breakdown persisted for preparation page reuse.

Validation:

- Zod validation remains in services for external/LLM outputs.
- Endpoint handlers remain thin and typed.

## Limits & safety

- Existing limits and budget checks apply to detailed scoring endpoint too.
- Detailed scoring must not run implicitly during normal generation.
- All outputs must preserve no-hallucination constraints and schema validity.

## Security & privacy

- Provider keys remain server-only.
- No cross-user data reuse in detailed scoring payload.
- Ownership checks required for detailed scoring generation/read.

## i18n keys

- Add keys for:
  - `Details` action label and states (`loading`, `failed`, `ready`).
  - preparation page detailed scoring labels/messages.
  - admin detailed scoring scenario title/description/capabilities labels.
- No hardcoded user-facing strings.

## Monorepo/layers touchpoints

- `packages/nuxt-layer-api/` (package: `@int/api`)
  - generation and new detailed scoring endpoint/service orchestration.
  - routing resolver updates for dedicated detailed scoring scenario.
- `packages/schema/` (package: `@int/schema`)
  - scenario key updates and detailed scoring schema contracts.
- `apps/site/layers/vacancy/`
  - resume/preparation pages and related store actions.
- `apps/admin/layers/llm/`
  - global scenario routing block for detailed scoring.
- `apps/admin/layers/roles/`
  - role override block for detailed scoring.

## Acceptance criteria

1. Generation endpoint returns baseline before/after score without mandatory detailed payload.
2. Detailed scoring is triggered only by explicit `Details` action.
3. Detailed scoring result is persisted and displayed on `/vacancies/[id]/preparation`.
4. Detailed scoring scenario is configurable independently in admin routing defaults and role overrides.
5. Runtime model resolution for detailed scoring follows precedence:
   role override -> default -> fallback.
6. Non-eligible roles do not see or cannot invoke detailed scoring.
7. BYOK remains absent from UI/API/runtime.
8. Lint/typecheck/tests for touched areas pass.

## Edge cases

- User clicks `Details` before any generation exists.
- Detailed scoring requested for expired or deleted generation.
- Detailed scoring model is missing/disabled after config change.
- Concurrent `Details` requests for same generation.
- Role changed between generation and details request.
- Preparation page opened before detailed scoring exists.

## Testing plan

- Unit tests:
  - baseline scoring invariants and fallback behavior.
  - detailed scoring eligibility checks.
  - routing precedence for detailed scenario.
- Integration tests (`packages/nuxt-layer-api/tests/integration`):
  - generate -> baseline score only contract.
  - detailed scoring endpoint success/failure and persistence.
  - role-based access behavior for detailed scoring.
  - admin default/override resolution for detailed scenario.
- UI smoke tests:
  - `Details` button visibility rules and redirect behavior.
  - preparation page rendering with/without detailed data.
  - admin routing card save/cancel flow for detailed scenario block.

## Open questions / NEEDS CLARIFICATION

No critical ambiguities remain for planning.
