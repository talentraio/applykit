# Feature Specification: Cached Two-Step Resume Adaptation Scoring

## Overview

Implement a production-ready two-step adaptation flow in `resume-editor` where:

1. Step A generates tailored resume content.
2. Step B calculates match scores (`matchScoreBefore`, `matchScoreAfter`) as a separate LLM call.

The second call must reuse shared prompt context to reduce repeated token cost and allow separate model/temperature tuning for scoring.

Integration must use npm packages from Mullion (`@mullion/*`) and run inside existing platform-managed LLM architecture (BYOK remains removed).

## Goals

- Split current single-call adaptation+scoring into two explicit steps.
- Enable independent tuning of scoring call (including higher temperature if configured).
- Reuse shared context between step A and step B to improve cache efficiency/cost.
- Keep current API contract for vacancy generation stable for UI consumers.
- Integrate `@mullion/*` packages from npm into LLM orchestration in `packages/nuxt-layer-api/` (package: `@int/api`).
- Preserve role limits, budget caps, and admin routing overrides/defaults.
- Remove residual BYOK artifacts everywhere they still exist (runtime, schemas, API/docs comments).

## Non-goals

- No BYOK re-introduction (API/UI/runtime).
- No rewrite of all LLM scenarios (parse, cover letter) in this iteration unless required by shared infrastructure extraction.
- No billing redesign in this feature.
- No UX redesign for vacancy overview pages beyond current score display behavior.

## Scope

In scope:

- Backend flow for `POST /api/vacancies/:id/generate`.
- LLM prompt strategy and response schemas for adaptation + scoring.
- LLM routing extension for dedicated scoring scenario.
- Usage logging updates for split-call accounting.
- Runtime fallback behavior for missing scenario routing.
- Tests for generation flow, scoring variability, and cache-aware behavior.

Out of scope:

- New admin pages.
- End-user page layout changes.
- Historical backfill/recalculation of existing generations.

## Roles & limits

Roles remain unchanged:

- `super_admin`
- `friend`
- `public`

Limits policy remains unchanged:

- Operation limit check still enforced through `requireLimit(userId, 'generate', role)` before generation.
- Platform budget constraints (daily/weekly/monthly role caps + global budget cap) still enforced for each LLM call.

BYOK policy:

- BYOK is out of scope and remains removed from runtime/API/UI.
- All calls in this feature are platform-only provider executions.

## User flows

### Flow 1: Successful generate + score

1. User clicks Generate/Re-generate on `/vacancies/[id]/overview`.
2. API validates auth, ownership, `canGenerateResume`, limits, and resume availability.
3. Step A runs adaptation call and returns tailored `ResumeContent`.
4. Step B runs scoring call using shared context from step A and returns `matchScoreBefore`/`matchScoreAfter`.
5. Generation row is created with tailored content + scores.
6. Usage logs include both adaptation and scoring call costs/tokens.
7. API returns created generation (compatible shape for current UI).

### Flow 2: Scoring call fails (non-blocking)

1. Step A succeeds (tailored content available).
2. Step B fails (provider error/invalid output/retries exceeded).
3. Endpoint still saves generation using fallback scoring values from deterministic local scoring logic.
4. Usage logs keep adaptation call usage; scoring fallback does not add extra LLM usage.
5. API returns created generation as success.

### Flow 3: Missing routing config for scoring

1. Scoring scenario has no active route.
2. Service resolves runtime fallback model from `runtimeConfig.llm.fallbackLlmModel`.
3. Flow continues unless provider key/model resolution fails.

## UI/pages

No new pages.

Existing pages in read-only integration scope:

- `apps/site/layers/vacancy/app/pages/vacancies/[id]/overview.vue`
- `apps/site/layers/vacancy/app/components/Item/overview/Content/*`

Admin routing pages remain operational and must include new scenario key automatically in current routing list:

- `apps/admin/layers/llm/app/pages/llm/routing.vue`
- `apps/admin/layers/roles/app/pages/roles/[role].vue`

## Data model

Strict schemas continue to live in `packages/schema/` (package: `@int/schema`) with Zod + inferred types.

Required changes:

- Extend `LlmScenarioKey` enum with dedicated scoring scenario:
  - `resume_adaptation_scoring`
- Ensure routing schemas and DB-backed scenario catalog include this new key.
- Keep `generations.matchScoreBefore` and `generations.matchScoreAfter` as required integers (0..100).
- Extend usage context enum with dedicated scoring context:
  - `resume_adaptation_scoring`

No schema change required for `generations` table in this iteration.

## API surface

External endpoint contract remains stable:

- `POST /api/vacancies/:id/generate`
  - request: unchanged
  - response: generation object unchanged

Internal service contract changes:

- Replace monolithic `generateResumeWithLLM()` behavior with orchestrated two-step service:
  - `generateTailoredResume(...)`
  - `scoreTailoredResume(...)`
  - orchestration function that aggregates both outputs and usage metadata.

Admin routing endpoints remain unchanged but must support new scenario key data:

- `GET /api/admin/llm/routing`
- `PUT /api/admin/llm/routing/:scenarioKey/default`
- `PUT /api/admin/llm/routing/:scenarioKey/roles/:role`
- `DELETE /api/admin/llm/routing/:scenarioKey/roles/:role`

UI grouping requirement:

- Scoring configuration is grouped under adaptation in admin UX (not shown as a standalone top-level card).
- Backend still stores scoring as a distinct scenario key for independent runtime tuning.

## LLM workflows

### Current (to replace)

- Single prompt returns both tailored content and scores.

### Target

Step A (adaptation):

- Input: base resume + vacancy (+ optional profile context).
- Output: tailored `ResumeContent` only.
- Scenario key: `resume_adaptation`.

Step B (scoring):

- Input: original resume + vacancy + tailored resume from step A.
- Output: `{ matchScoreBefore, matchScoreAfter }`.
- Scenario key: `resume_adaptation_scoring`.
- Temperature and model are independently controlled by routing for this scenario.

Caching/context strategy:

- Use Mullion npm packages (`@mullion/core`, `@mullion/ai-sdk`) in `@int/api` LLM orchestration.
- Build one shared context payload for both steps.
- Reuse same context structure/prefix between step calls to maximize provider prompt-cache hit potential.
- Treat cache behavior as provider-dependent optimization:
  - OpenAI: automatic prompt cache for long shared prefixes.
  - Gemini: implement explicit `cachedContent` flow now via provider options and reuse in step B.

Validation:

- Zod validation at each step output.
- Additional business validation: `matchScoreAfter >= matchScoreBefore`.

## Limits & safety

- Keep operation limit counting unchanged at endpoint-level (`generate` operation).
- Keep platform budget checks on each LLM call.
- Log usage for both calls with provider type `platform` and separate contexts:
  - `resume_adaptation` for step A
  - `resume_adaptation_scoring` for step B
- Preserve vacancy locking behavior (`canGenerateResume`) on successful generation save.

## Security & privacy

- Do not expose provider keys in client/runtime logs.
- Keep platform-only execution path (no user-provided keys).
- Ensure no cross-user state sharing in server context objects.
- Any cache optimization that includes user resume/vacancy content must use explicit, auditable code paths and short-lived semantics.

## i18n keys

No new user-visible text is required by default.

If new error messages are surfaced in UI, they must be added through existing i18n dictionaries (no hardcoded strings in components).

## Monorepo/layers touchpoints

Primary backend:

- `packages/nuxt-layer-api/` (package: `@int/api`)
  - `server/api/vacancies/[id]/generate.post.ts`
  - `server/services/llm/*`
  - `server/data/repositories/llm-routing.ts`
  - `server/data/schema.ts`
  - `server/data/migrations/*`

Shared schema/contracts:

- `packages/schema/` (package: `@int/schema`)
  - scenario enums and routing schemas

Admin app integration (scenario listing only):

- `apps/admin/`
  - routing pages/components that enumerate scenarios via API response

Site app:

- `apps/site/`
  - no contract-breaking changes expected; consumes same generation response

## Acceptance criteria

1. `POST /api/vacancies/:id/generate` executes two separate LLM calls (adapt + score).
2. Score call can use routing-configured temperature/model independently from adaptation.
3. Shared context is reused across both calls through Mullion-based orchestration.
4. Existing vacancy overview UI still renders generation and scores without contract changes.
5. New scenario key is manageable via existing admin routing APIs/UI.
6. If routing data for scoring scenario is missing, runtime fallback model is used.
7. BYOK functionality remains absent.
8. Lint, typecheck, and relevant tests pass in repo CI flow.

## Edge cases

- Adaptation succeeds but scoring output JSON is invalid.
- Scoring returns `matchScoreAfter < matchScoreBefore`.
- Scoring scenario model exists but is disabled/archived.
- Missing provider key for resolved scoring provider.
- Resume/vacancy payload too large for model token budget.
- Admin changes routing between step A and step B while request is in-flight.

## Testing plan

Unit tests:

- Adaptation output parser/validator (content-only schema).
- Scoring output parser/validator (scores-only schema).
- Orchestration logic for two-step flow and error handling.
- Routing resolution for `resume_adaptation_scoring` with fallback.

Integration tests (`@int/api`):

- Generate endpoint success path (two calls, generation saved once).
- Scoring failure path (no generation persisted).
- Fallback path when scoring scenario routing is unavailable.

Regression checks:

- Admin routing endpoints include and persist new scenario key.
- Vacancy overview endpoint still returns latest generation summary correctly.

## Open questions / NEEDS CLARIFICATION

No unresolved questions for this phase.
