# Feature Specification: Cover Letter Generation MVP

**Feature Branch**: `015-cover-letter-generation`
**Created**: 2026-02-21
**Status**: Finalized
**Input**: Final concept from `docs/product-concepts/2026-02-21_cover-letter-final-concept.md`

## Documentation Gate _(mandatory)_

- Before code changes, follow `docs/codestyle/base.md`.
- For architecture/API decisions, follow `docs/architecture/*` and `docs/api/*`.
- Keep Nuxt v4 + NuxtUI v4 invariants.

## Clarifications

### Session 2026-02-21

- Q: Which LLM pipeline is used in MVP? -> A: Single high-quality model call (`Option 1`), no cheap pre-translation/extraction.
- Q: Output languages for MVP? -> A: `en` and `da` only, with scalable language-pack architecture.
- Q: Should `cover_letter_generation` remain a single scenario key in MVP? -> A: Yes.
- Q: Should vacancy statuses change for cover letters? -> A: No.
- Q: Save model for cover letters in MVP? -> A: Latest-only persistence per vacancy, with editor undo/redo interaction history (no DB version history).
- Q: Update method for edits? -> A: `PATCH`-first for incremental content/settings changes.
- Q: LLM response format for cover scenario? -> A: `json` (not free-form text).
- Q: PDF strategy in MVP? -> A: Dedicated cover-letter PDF endpoints and preview route; shared export unification deferred.
- Q: Stale behavior in MVP? -> A: Regenerate action in MVP; stale badge deferred to MVP+1.

## Goals

- Deliver `/vacancies/:id/cover` as a real workflow (not placeholder).
- Generate tailored output as `letter` or `message` using latest tailored resume + vacancy data.
- Support editing, previewing, copying (plain text), and PDF export.
- Keep MVP simple and fast while preserving architecture for growth.

## Non-goals

- No extraction checklist UI in MVP.
- No universal stale badge UI in MVP.
- No shared `docType` export refactor in MVP.
- No additional output languages beyond `en` and `da` in MVP.

## User Scenarios & Testing

### User Story 1 - Generate cover letter/message draft (Priority: P1)

User opens vacancy cover page, configures basic generation inputs, and gets a draft.

**Why this priority**: Core product value for this feature.

**Independent Test**: With a vacancy that already has tailored resume generation, user can generate `letter` or `message` and get persisted output.

**Acceptance Scenarios**:

1. **Given** vacancy has latest tailored resume generation, **When** user submits generation settings, **Then** system returns and persists cover letter content with metadata.
2. **Given** vacancy has no tailored resume generation, **When** user opens cover page, **Then** system shows blocked empty state with CTA to generate resume first.
3. **Given** `message` type selected with `includeSubjectLine`, **When** generation succeeds, **Then** subject line is produced and persisted when available.

---

### User Story 2 - Edit and persist output incrementally (Priority: P1)

User edits generated content/settings and changes are autosaved through `PATCH`.

**Why this priority**: Generated text must be controllable before use.

**Independent Test**: Modify content and metadata fields, verify PATCH persists changes and page reload restores latest values.

**Acceptance Scenarios**:

1. **Given** existing generated cover letter, **When** user edits markdown content, **Then** autosave PATCH persists the updated content.
2. **Given** existing generated cover letter, **When** user edits allowed settings (recipient/subject toggle/subject), **Then** autosave PATCH persists incremental changes.
3. **Given** user performs undo/redo in editor session, **When** state changes, **Then** editor allows moving through recent local states without data loss.

---

### User Story 3 - Use output immediately (Priority: P2)

User can preview, copy, and download PDF.

**Why this priority**: Core completion path to submit application externally.

**Independent Test**: User toggles preview, copies clean plain text, downloads PDF from dedicated cover-letter export endpoints.

**Acceptance Scenarios**:

1. **Given** generated or edited content, **When** user clicks Copy, **Then** clipboard receives plain text (markdown syntax removed).
2. **Given** generated or edited content, **When** user downloads PDF, **Then** file is generated via dedicated cover-letter PDF flow.
3. **Given** `letter` vs `message` type, **When** preview is rendered, **Then** unified white-page surface uses type-specific rendering template.

## Edge Cases

- Vacancy exists but latest generation expired -> treat as no tailored resume available for cover generation.
- PATCH payload with empty/no-op fields -> no corruption of existing saved content.
- LLM returns malformed JSON -> fail generation with clear error and no partial persistence.
- `includeSubjectLine=true` but model omits subject -> persist with `subjectLine = null` without breaking output.

## Requirements

### Functional Requirements

- **FR-001**: System MUST expose runtime cover-letter APIs:
  - `GET /api/vacancies/:id/cover-letter`
  - `POST /api/vacancies/:id/cover-letter/generate`
  - `PATCH /api/cover-letters/:id`
- **FR-002**: System MUST require ownership checks for all cover-letter operations.
- **FR-003**: Cover generation MUST use `cover_letter_generation` scenario and structured JSON response handling.
- **FR-004**: Cover generation MUST require an available latest tailored resume generation for the target vacancy.
- **FR-005**: Cover-letter persistence MUST keep latest record per vacancy in MVP.
- **FR-006**: System MUST support generation inputs in MVP: language (`en|da`), type (`letter|message`), tone, length preset, recipient name, include-subject toggle (message only), additional instructions.
- **FR-007**: UI MUST separate generation input settings from post-generation edit/format controls.
- **FR-008**: UI MUST provide Edit/Preview toggle in one fixed-height workspace.
- **FR-009**: Copy action MUST produce plain text output.
- **FR-010**: PDF export MUST use dedicated cover-letter prepare/payload/file endpoints and preview route in MVP.
- **FR-011**: Cover scenario default response format SHOULD be JSON in routing defaults.
- **FR-012**: MVP MUST keep vacancy status model unchanged.

### Key Entities

- **CoverLetter**: persisted generated/editable artifact tied to vacancy and source generation; includes output metadata and markdown content.
- **CoverLetterGenerationRequest**: runtime input bundle controlling output language/type/tone/length and optional guidance.
- **CoverLetterPdfPayload**: short-lived export payload for dedicated cover-letter PDF generation.

## Success Criteria

### Measurable Outcomes

- **SC-001**: User can generate first usable draft on `/vacancies/:id/cover` in one action when tailored resume exists.
- **SC-002**: Edits are persisted through PATCH autosave and survive refresh/reopen of cover page.
- **SC-003**: Copy and PDF actions work from generated output without manual JSON/text cleanup.
- **SC-004**: Existing resume generation and PDF export flows remain regression-free.
