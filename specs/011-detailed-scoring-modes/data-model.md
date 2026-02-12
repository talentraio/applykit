# Data Model: Lightweight Score + On-Demand Detailed Scoring

## Overview

This feature keeps baseline score fields on generation records and adds persisted detailed-scoring data
linked to a generation.

## Entities

### 1) Generation (existing, adjusted behavior)

Represents a tailored resume generation attempt for a vacancy.

Key fields (existing):

- `id: uuid`
- `vacancyId: uuid`
- `content: jsonb` (ResumeContent)
- `matchScoreBefore: integer (0..100)`
- `matchScoreAfter: integer (0..100)`
- `createdAt: timestamp`
- `updatedAt: timestamp`

Behavior change:

- Baseline `matchScoreBefore/After` remains required and computed in lightweight mode.
- Detailed scoring is no longer required in generation request path.

### 2) GenerationScoreDetail (new)

Represents persisted advanced scoring details for a specific generation.

Proposed fields:

- `id: uuid`
- `generationId: uuid` (FK -> `generations.id`, unique)
- `vacancyId: uuid` (FK -> `vacancies.id`, indexed)
- `vacancyVersionMarker: text` (or hash/fingerprint) used to detect stale details
- `details: jsonb` (strict Zod schema in `@int/schema`)
- `provider: llm_provider enum`
- `model: text`
- `strategyKey: llm_strategy_key enum | null`
- `createdAt: timestamp`
- `updatedAt: timestamp`

Constraints:

- One active detailed-score record per generation (`UNIQUE(generation_id)`).
- `details` must satisfy `GenerationScoreDetailSchema` in `@int/schema`.

### 3) LLM routing scenario enum (existing, extended)

Add dedicated scenario key for detailed scoring routing.

Proposed enum addition:

- `resume_adaptation_scoring_detail`

Used in:

- global defaults (`/llm/routing`)
- role overrides (`/roles/[id]`)
- runtime scenario resolver precedence

## Relationships

- `Vacancy 1 -> N Generation`
- `Generation 1 -> 0..1 GenerationScoreDetail`
- `Vacancy 1 -> N GenerationScoreDetail`

## State transitions

### Detailed score lifecycle

1. Generation created (baseline scores available, no details yet).
2. User clicks `Details`:
   - if detail exists and is fresh: return persisted.
   - else generate and upsert detail.
3. Vacancy text changes (same condition as resume regeneration availability):
   - detail is considered stale for regenerate action.
4. User clicks `Regenerate details` (allowed only when stale condition is true):
   - recompute and upsert detail with new marker.

## Validation rules

- Baseline scores always clamped to `0..100` and `after >= before` invariant.
- Detailed endpoint requires:
  - authenticated owner access,
  - eligible role/model resolution,
  - generation belongs to requested vacancy.
- `regenerate=true` request rejected when vacancy-change condition is not satisfied.

## Indexing and performance

Suggested indexes:

- `generation_score_details(generation_id)` unique
- `generation_score_details(vacancy_id)`
- optional: `generation_score_details(updated_at)` for operational queries

## Migration notes

- Add new table for `generation_score_details` (preferred for separation).
- No backfill required for old generations in this feature.
- Existing `generations.matchScoreBefore/After` remain unchanged.
