# Research: 010 - Resume Generation Strategies

## Decision 1: Strategy resolution precedence

- Decision: Resolve strategy in this order: role override -> global default -> runtime fallback.
- Rationale: Matches current routing precedence model and keeps behavior predictable across admin pages.
- Alternatives considered:
  - Feature-flag-first rollout: deferred because it adds infra complexity without immediate product gain.
  - Global-only strategy: rejected because paid/promo segmentation needs role-level control.

## Decision 2: Strategy scope and variants

- Decision: Introduce two strategy variants for adaptation/scoring group: `economy` and `quality`.
- Rationale: Supports immediate pricing/quality segmentation with minimal operational overhead.
- Alternatives considered:
  - Single universal strategy: rejected due lower control and slower tuning cycles.
  - Per-scenario independent strategy matrix: deferred to avoid configuration explosion in MVP.

## Decision 3: Retry model support in this phase

- Decision: Retry model is configurable for adaptation scenario only in this phase.
- Rationale: Adaptation call is the critical content-producing step; scoring already has non-blocking fallback.
- Alternatives considered:
  - Retry for both adaptation and scoring now: deferred to avoid unnecessary cost and config complexity.

## Decision 4: Prompt architecture

- Decision: Keep a stable shared prefix and add strategy-specific prompt packs.
- Rationale: Preserves OpenAI/Gemini cache hit probability while allowing variant behavior.
- Alternatives considered:
  - One long universal prompt: rejected due cache instability and harder maintenance.
  - Fully separate prompts with no shared prefix: rejected due higher token costs.

## Decision 5: Deterministic scoring pipeline

- Decision: Use `extractSignals` + `mapEvidence` (LLM) and compute final score in application code.
- Rationale: Reduces score randomness and improves explainability.
- Alternatives considered:
  - Single LLM judge score: rejected due instability and weak debuggability.
  - Pure regex/keyword scoring: rejected due poor semantic matching for non-IT office roles.

## Decision 6: Scoring breakdown persistence

- Decision: Persist breakdown JSON per generation and keep aggregate telemetry in usage logs.
- Rationale: Enables auditing/debugging and future user-facing explanations without reprocessing.
- Alternatives considered:
  - Store in logs only: rejected due weak per-generation traceability.
  - Compute on read only: rejected due repeat cost and non-deterministic future re-evaluations.

## Decision 7: Domain-agnostic signal model

- Decision: Define signals by role family, requirements, responsibilities, domain terms, and constraints.
- Rationale: Supports office professions beyond IT without changing architecture.
- Alternatives considered:
  - IT-specific taxonomy (stack/seniority focused): rejected for product scope mismatch.

## Decision 8: Rollout mode

- Decision: Immediate global rollout with role overrides enabled.
- Rationale: Fast execution path with explicit administrative controls already in place.
- Alternatives considered:
  - Gradual feature-flag rollout: deferred unless production stability metrics require canary deployment.
