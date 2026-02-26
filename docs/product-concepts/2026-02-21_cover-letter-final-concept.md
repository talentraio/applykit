# Cover Letter Page Concept (Final)

## Meta

- Date: `2026-02-21`
- Status: `final-concept`
- Based on:
  - `docs/product-concepts/2026-02-20_cover-letter-raw-concept.md`
  - `tmp/cover-letter-concept-clarification-log.md`
  - `docs/product-concepts/2026-02-20_cover-letter-mvp-plus-1-backlog.md`

## Goal

Implement `/vacancies/:id/cover` as a production-ready flow for generating, editing, copying, and exporting
cover letters/application messages with fast MVP delivery and clear scalability path.

## Final decisions (locked)

## 1) Scenario and model pipeline

- MVP uses one scenario key: `cover_letter_generation`.
- MVP uses one high-quality generation call (no cheap pre-translation/extraction steps).
- Output is generated directly in selected output language.

## 2) Supported languages

- MVP output languages: `en`, `da`.
- Architecture must support adding many languages via language packs without core flow redesign.

## 3) Product flow and statuses

- Vacancy statuses remain unchanged in MVP.
- Cover letter is an application artifact, not a status-transition gate.

## 4) UX flow pattern

- MVP pattern: `minimum inputs -> draft generation -> edit -> output actions`.
- Requirements extraction/checklist is not in MVP.

## 5) Settings separation

- Settings are split by stage:
  - pre-generation input settings,
  - post-generation edit/format settings.

## 6) Input settings (MVP)

- `language`: `en | da`
- `type`: `letter | message`
- `tone`: semantic options
- `lengthPreset`: semantic options
- `recipientName`: included
- `includeSubjectLine`: optional, only for `message` type
- `additionalInstructions`: optional

## 7) Output/edit model (MVP)

- One unified white-page preview surface for both `letter` and `message`.
- Rendering template differs by `type` (same surface, type-specific layout rules).
- Main work area uses `Edit | Preview` toggle with fixed-height container to avoid visual jumps.
- Source of truth is hybrid:
  - `contentMarkdown` for body content,
  - explicit metadata fields for type and settings.
- Copy action outputs clean plain text (markdown syntax removed).

## 8) Data persistence

- Persist only the latest cover letter per vacancy in MVP.
- During editing, user can move through previous edit states via undo/redo history
  (same interaction model as current resume editing).
- No persistent version-history table for cover letters in MVP.

## 9) API contract (MVP)

- `GET /api/vacancies/:id/cover-letter`
- `POST /api/vacancies/:id/cover-letter/generate`
- `PATCH /api/cover-letters/:id` (PATCH-first, incremental updates for content/settings)
- `PUT` is not introduced for cover letters in MVP.
- This PATCH-first approach is the target direction for future resume API alignment.

## 10) LLM response contract

- `cover_letter_generation` must use structured `json` response format in MVP (not `text`).
- Response payload supports reliable save/edit/preview, including `contentMarkdown` and metadata fields.

## 11) PDF strategy

- MVP uses dedicated cover-letter PDF endpoints/preview path (low-risk integration).
- Shared `docType` export pipeline is deferred.

## MVP scope (release 1)

- Runtime cover-letter API and DB persistence.
- `/vacancies/:id/cover` real page with:
  - input settings,
  - generate/regenerate,
  - markdown edit,
  - white-page preview,
  - plain-text copy,
  - PDF download,
  - autosave.
- `en` and `da` output support.
- Scenario routing compatibility with existing LLM configuration model.

## Deferred scope (MVP+1/post-MVP)

- Reusable vacancy extraction cache (`vacancy_extractions`) for multi-flow reuse.
- Requirements extraction + user checklist.
- Universal stale badge mechanism for both resume and cover letter.
- Export pipeline unification via shared `docType`.
- Template library (header/signature/output styles).
- Additional output languages via language packs.

## Notes for Speckit handoff

- This concept is ready to convert into:
  - `spec.md` (product requirements and acceptance criteria),
  - `plan.md` (data model/API/migration details),
  - `tasks.md` (implementation sequence).
