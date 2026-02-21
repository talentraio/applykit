# Cover Letter Concept (MVP+1 Backlog)

## Meta

- Date: `2026-02-20`
- Status: `mvp-plus-1-backlog`
- Related raw concept:
  - `docs/product-concepts/2026-02-20_cover-letter-raw-concept.md`
- Related clarification log:
  - `tmp/cover-letter-concept-clarification-log.md`

## Purpose

Capture agreed improvements that are intentionally deferred from MVP, so they stay visible and ready for
planned implementation after first release.

## Backlog rules

- Items in this file are `not MVP`.
- Each item must include: reason, scope, data/API impact, and expected rollout phase.
- Do not move an item into MVP without explicit decision.

## Items

## CL-MVP1-001 - Reusable vacancy extraction cache

- Status: `approved for MVP+1`
- Priority: `high`
- Target phase: `MVP+1`
- Reason:
  - Avoid repeated extraction calls across multiple flows.
  - Reuse one canonical extraction for detailed scoring, cover letter preparation, and future features.

### Scope

- Add independent persistence for vacancy-level extraction (not tied to `generationId`).
- Provide shared `get-or-create` extraction service that:
  - returns existing extraction when version is current,
  - regenerates when version is stale/missing.

### Proposed data model

Table: `vacancy_extractions`

- `id`
- `vacancyId`
- `vacancyVersionMarker`
- `extractionKind` (for example: `signals`, `values`)
- `language` (for multilingual extraction paths when needed)
- `payload` (jsonb)
- `schemaVersion`
- `provider`
- `model`
- `strategyKey` (nullable)
- `tokensUsed` (nullable)
- `cost` (nullable)
- `createdAt`
- `updatedAt`

Recommended uniqueness key:

- (`vacancyId`, `vacancyVersionMarker`, `extractionKind`, `language`, `schemaVersion`)

### Invalidation policy

- Do not hard-delete rows on vacancy edit by default.
- Use new `vacancyVersionMarker` to mark previous extraction as stale.
- Optional cleanup can run asynchronously later.

### Reuse points

- Current detailed scoring flow (replace repeated extraction step where possible).
- Future cover letter context preparation (controlled prompt compaction/briefing).
- Future checklist UI ("what to emphasize").

### Notes

- Existing `generation_score_details` remains generation-scoped and should not be treated as universal extraction cache.
- Concurrency control is required to avoid duplicate extraction generation under parallel requests.

## CL-MVP1-002 - Universal stale badge mechanism (resume + cover letter)

- Status: `approved for MVP+1`
- Priority: `high`
- Target phase: `MVP+1`
- Reason:
  - Prevent outdated artifacts from being used after vacancy or source updates.
  - Keep UX behavior consistent between resume and cover letter flows.

### Scope

- Add shared stale-state calculation service based on version markers and source linkage.
- Expose stale flags in preparation/meta payloads for both resume and cover-letter surfaces.
- Add unified badge pattern (for example: `Needs update`) with explicit regenerate action guidance.

### Data/API impact

- Reuse existing `vacancyVersionMarker` pattern.
- Ensure cover-letter entity keeps source generation linkage and marker needed for stale checks.
- Extend API responses with stable stale-state fields that can be consumed by both pages.

### Notes

- In MVP, regenerate action is available without badge dependency.
- Badge visualization and cross-feature consistency are introduced in MVP+1.

## CL-MVP1-003 - Export pipeline unification via docType

- Status: `approved for MVP+1/post-MVP`
- Priority: `medium`
- Target phase: `MVP+1/post-MVP`
- Reason:
  - Eliminate duplicated export logic between resume and cover letter.
  - Prepare single scalable export infrastructure for future document types.

### Scope

- Introduce shared export payload with explicit document discriminator (`docType`).
- Rework prepare/file/preview flow to route rendering by docType.
- Keep compatibility with existing resume export behavior during migration.

### Data/API impact

- Align export contracts for:
  - `resume`
  - `cover_letter`
- Add migration path from dedicated cover-letter PDF endpoints introduced in MVP.

### Notes

- MVP uses dedicated cover-letter endpoints for fast, low-risk delivery.
- Unified pipeline is a follow-up once cover flow proves stable in production.

## Candidate items to append next

- Requirement checklist UI based on extracted signals.
- Additional language packs beyond `en`/`da`.
