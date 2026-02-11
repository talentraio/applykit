# Research: 009 - Cached Two-Step Resume Adaptation Scoring

## R1: Adaptation + scoring execution model

**Decision**: Use a two-step pipeline:

1. Adaptation call generates tailored resume content.
2. Scoring call computes `matchScoreBefore`/`matchScoreAfter`.

**Rationale**: This enables independent model/temperature tuning for scoring and avoids coupling score quality to adaptation prompt constraints.

**Alternatives considered**:

- Keep single-call response with content + scores:
  - Rejected. Scores stay tied to same sampling and often become static.
- Run scoring as asynchronous background task only:
  - Rejected for current product UX because score is expected immediately on completion.

## R2: Behavior when scoring fails

**Decision**: Scoring failure must not block generation save.

Use deterministic local fallback scoring to keep required DB fields populated and avoid an additional paid retry loop.

**Rationale**: Product decision explicitly requires non-blocking save. `generations.matchScore*` fields are required, so fallback values are needed.

**Alternatives considered**:

- Fail whole request if scoring fails:
  - Rejected by product requirement.
- Make score fields nullable and save without scores:
  - Rejected in this phase to avoid broad schema/UI ripple and sorting/filtering regressions.

## R3: Scenario key strategy vs admin UX grouping

**Decision**: Keep scoring as a distinct backend scenario key (`resume_adaptation_scoring`) but group it with adaptation controls in admin UI.

**Rationale**: Distinct key is required for independent runtime settings (model/temperature), while grouped UX reduces operational complexity for admins.

**Alternatives considered**:

- Reuse `retryModelId` of `resume_adaptation` for scoring:
  - Rejected. Retry semantics differ and do not provide independent temperature/limits cleanly.
- Separate standalone admin card for scoring:
  - Rejected by product UX direction.

## R4: Usage accounting granularity

**Decision**: Introduce dedicated usage context `resume_adaptation_scoring`.

**Rationale**: Gives clear analytics/cost attribution per phase and supports future billing/limits work without significant implementation overhead.

**Alternatives considered**:

- Keep both calls under `resume_adaptation` context:
  - Rejected for lower observability and future billing ambiguity.

## R5: Mullion integration boundary

**Decision**: Integrate Mullion in `@int/api` service layer for this pipeline first, without forcing immediate migration of every existing LLM flow.

**Rationale**: Delivers requested architecture where needed now, while keeping refactor blast radius controlled.

**Alternatives considered**:

- Full migration of all LLM workflows to Mullion in one pass:
  - Rejected for higher risk and slower delivery.
- No Mullion, custom cache logic only:
  - Rejected because product explicitly allows/requests `@mullion/*` usage.

## R6: Gemini cache behavior

**Decision**: Implement explicit Gemini cached-content reuse now for the scoring call.

**Rationale**: Product requested immediate implementation. This provides tangible cost/latency reduction for repeated shared context in provider-native manner.

**Alternatives considered**:

- Defer Gemini explicit cache and rely only on shared prefix:
  - Rejected by product direction.

## R7: BYOK removal completeness

**Decision**: Remove BYOK residuals everywhere in active runtime contracts and docs, including enum/runtime branches still exposing `byok` provider type semantics.

**Rationale**: Product decision is definitive. Keeping remnants creates confusion and future architectural drag.

**Alternatives considered**:

- Keep legacy `byok` enum branch indefinitely:
  - Rejected due to explicit requirement and cleanup goal.

## R8: Public API compatibility

**Decision**: Keep `POST /api/vacancies/:id/generate` request/response contract unchanged.

**Rationale**: Avoids site-layer breaking changes and keeps current overview flow stable during backend architecture upgrade.

**Alternatives considered**:

- Return additional step/debug metadata in response:
  - Rejected for now; can be added later behind admin/debug endpoint if needed.
