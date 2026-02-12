# Research: Lightweight Score + On-Demand Detailed Scoring

## R1: Execution mode for detailed scoring endpoint

**Decision**: Use synchronous endpoint in this phase.

**Rationale**:

- Faster delivery without queue/worker/job-state infrastructure.
- Keeps UX simple: click `Details` -> wait -> redirect to preparation.
- Matches current system architecture where generation operations are synchronous.

**Alternatives considered**:

- Async job with polling/websocket: better for long workloads but adds substantial infra/UI complexity.
- Hybrid sync-then-async fallback: flexible but raises implementation complexity for MVP scope.

## R2: Behavior on repeated `Details` requests

**Decision**: Reuse persisted detailed score by default.

**Rationale**:

- Prevents accidental repeated expensive calls.
- Gives deterministic user experience when no source data changed.
- Supports idempotent endpoint semantics and concurrency safety.

**Alternatives considered**:

- Always regenerate: simple mentally, but high and unnecessary cost.
- TTL-based auto-regeneration: harder to reason about and not aligned to vacancy-change signal.

## R3: Regeneration gating for detailed scoring

**Decision**: Enable `Regenerate details` only when vacancy text changed under the same condition used
for resume regeneration availability.

**Rationale**:

- Reuses existing product semantics already understood by users.
- Avoids introducing separate “stale” business rules for details.
- Keeps UI logic consistent between resume regeneration and details regeneration.

**Alternatives considered**:

- Independent details-specific stale logic based on custom hash only.
- Manual regenerate always available.

## R4: Baseline score implementation strategy

**Decision**: Keep baseline generation score lightweight and contract-stable (`before/after` only), with
no mandatory expensive detailed mapping during generation path.

**Rationale**:

- Achieves the primary goal: fast, cheap generation for all users.
- Preserves existing overview/resume UX fields.
- Moves heavy analysis to explicit premium action.

**Alternatives considered**:

- Keep current full detailed scoring in generation and hide details in UI.
- Inline adaptation+score in one large prompt.

## R5: Admin routing semantics for detailed scoring

**Decision**: Add dedicated detailed scoring scenario block in both `/llm/routing` and `/roles/[id]`.

**Rationale**:

- Detailed scoring has different cost/quality profile than baseline generation.
- Fits existing routing model (default + role override).
- Enables independent model selection for premium flows.

**Alternatives considered**:

- Reuse existing `resume_adaptation_scoring` scenario without explicit UI separation.
- Hardcode detailed scoring model in runtime config only.
