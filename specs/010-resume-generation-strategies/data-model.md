# Data Model: 010 - Resume Generation Strategies

## Overview

Feature extends routing configuration and generation artifacts to support strategy selection and
explainable deterministic scoring.

## Entities

## 1) StrategyKey (enum)

- Values:
  - `economy`
  - `quality`
- Usage:
  - Applied to grouped adaptation+scoring flow resolution.
  - Stored on routing assignments (default + role override).

## 2) RoutingAssignment (existing entity extension)

Source tables:

- `llm_scenario_models` (`packages/nuxt-layer-api/`, package: `@int/api`)
- `llm_role_scenario_overrides` (`packages/nuxt-layer-api/`, package: `@int/api`)

Fields (extended logical model):

- `scenarioKey` (existing)
- `modelId` (existing)
- `retryModelId` (existing, adaptation-only in this phase)
- `temperature` (existing)
- `maxTokens` (existing)
- `responseFormat` (existing)
- `strategyKey` (new, nullable for non-adaptation scenarios)
- `updatedAt` (existing)

Validation rules:

- For adaptation/scoring grouped scenarios, `strategyKey` must resolve to a supported value.
- `retryModelId` is used only when scenario is adaptation; ignored for scoring scenario in this phase.
- Referenced models must be active.

## 3) Generation (existing entity extension)

Source table:

- `generations` (`packages/nuxt-layer-api/`, package: `@int/api`)

Existing fields retained:

- `content`
- `matchScoreBefore`
- `matchScoreAfter`

New field:

- `scoreBreakdown` (JSON, required for new records after migration)

`scoreBreakdown` structure:

- `core`: { `before`: number, `after`: number, `weight`: number }
- `mustHave`: { `before`: number, `after`: number, `weight`: number }
- `niceToHave`: { `before`: number, `after`: number, `weight`: number }
- `responsibilities`: { `before`: number, `after`: number, `weight`: number }
- `human`: { `before`: number, `after`: number, `weight`: number }
- `gateStatus`: {
  - `schemaValid`: boolean,
  - `identityStable`: boolean,
  - `hallucinationFree`: boolean
    }
- `version`: string (scoring algorithm version)

Validation rules:

- `matchScoreBefore` and `matchScoreAfter` remain 0..100.
- `matchScoreAfter >= matchScoreBefore` invariant enforced by scoring output policy.
- `scoreBreakdown.version` is required for future migration compatibility.

## 4) VacancySignals (transient contract entity)

Used in scoring pipeline; not required to persist initially.

Fields:

- `jobFamily`: string
- `seniority`: string | null
- `coreRequirements`: Array<{ `name`: string; `weight`: number; `confidence`: number }>
- `mustHave`: Array<{ `name`: string; `weight`: number; `confidence`: number }>
- `niceToHave`: Array<{ `name`: string; `weight`: number; `confidence`: number }>
- `responsibilities`: Array<{ `name`: string; `weight`: number; `confidence`: number }>
- `domainTerms`: string[]
- `constraints`: string[]

Validation rules:

- weights/confidence normalized to `0..1`.
- output validated through Zod before downstream use.

## 5) EvidenceMap (transient contract entity)

Maps signals to evidence in base and tailored resume.

Fields:

- `items`: Array<{
  - `signalType`: `core` | `mustHave` | `niceToHave` | `responsibility`,
  - `signalName`: string,
  - `strengthBefore`: number,
  - `strengthAfter`: number,
  - `presentBefore`: boolean,
  - `presentAfter`: boolean,
  - `evidenceRefsBefore`: string[],
  - `evidenceRefsAfter`: string[]
    }>

Validation rules:

- strengths normalized to `0..1`.
- references must point to known resume sections or path keys.

## State transitions

## Generation flow

1. `requested`
2. `adapted` (canonical content created)
3. `scored` (deterministic score computed)
4. `saved`

Failure transitions:

- If adaptation fails and retries exhausted -> request fails.
- If scoring fails -> fallback scoring -> `saved` still succeeds.

## Referential integrity notes

- `retryModelId` and `modelId` must reference active `llm_models` rows when used.
- Strategy values must remain compatible with enum in `@int/schema`.

## Migration notes

- Add `strategy_key` columns to routing tables with null-safe backfill.
- Add `score_breakdown` JSON column to `generations` with safe default for historical rows.
- Backfill existing generations with `version: "legacy"` and minimal breakdown structure.
