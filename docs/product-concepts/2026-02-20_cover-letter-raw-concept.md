# Cover Letter Page Concept (Raw)

## Meta

- Date: `2026-02-20`
- Status: `raw-concept`
- Input sources:
  - User research draft with 10 points (this conversation)
  - Current repository implementation and docs

## Goal

Implement `/vacancies/:id/cover` as a real production flow for generating, editing, copying, and exporting a
cover letter (or short application message), while preserving fast MVP delivery and clean scalability.

## Current state (verified in code/docs)

1. Cover page is a placeholder:
   - `apps/site/layers/vacancy/app/pages/vacancies/[id]/cover.vue`
2. Cover scenario key already exists in shared schema and routing:
   - `packages/schema/constants/enums.ts`
   - `docs/architecture/llm-scenarios.md`
3. Admin routing UI already exposes `cover_letter_generation` model assignment:
   - `apps/admin/layers/llm/app/components/routing/Scenarios/form/CoverLetter.vue`
4. User runtime API for cover letter does not exist yet:
   - no `/api/vacancies/:id/cover*` routes in `packages/nuxt-layer-api/server/api/vacancies`
5. Data model has no cover-letter entity yet:
   - `packages/nuxt-layer-api/server/data/schema.ts` has `vacancies`, `generations`, `generation_score_details`
6. PDF flow is resume-only:
   - `apps/site/layers/_base/app/infrastructure/pdf.api.ts`
   - `packages/nuxt-layer-api/server/api/pdf/prepare.post.ts`
   - `apps/site/layers/_base/app/pages/pdf/preview.vue`
7. Site i18n locales currently include only English:
   - `apps/site/nuxt.config.ts`
   - `apps/site/i18n/locales/en.json`
8. Vacancy flow already has a "Generate Cover Letter" CTA that links to placeholder route:
   - `apps/site/layers/vacancy/app/components/Item/overview/Content/Actions.vue`

## Groomed concept by the 10 research points

## 1) What already exists in ApplyKit and what matters

### As-is

- Research statement is correct: scenario key and admin routing are ready, but user runtime surface is missing.

### Groomed decision

- Keep `cover_letter_generation` as the main scenario key.
- Add missing runtime surface in API + DB + site layer.
- Reuse existing ownership/limits/profile-completeness/security patterns from vacancy generation flow.

### Extra requirement

- Cover generation must honor scenario enablement/resolution (same runtime routing rules as other scenarios).

## 2) Competitive patterns (from provided research) and how to adopt

### Adopt for MVP

- Pattern A (`minimum inputs -> draft -> edit`) should be default UX.
- Pattern C (`simple style controls + smart editing`) should be included in a limited form.

### Defer after MVP

- Pattern B (`requirements extraction/checklist`) is useful but should be phase-2 to protect MVP speed.

## 3) User needs criteria and MVP fit

### Criteria -> MVP mapping

- Speed (time-to-apply):
  - Auto-use latest tailored resume + vacancy description.
  - Single-click generate/regenerate.
- Control:
  - Tone, length preset, output type, output language, optional recipient name, user instructions.
- Naturalness/localization:
  - Language-specific prompt pack (`en`, `da`) from day one.
- Trust (no hallucinations):
  - Hard prompt rules: no invented facts, no unverifiable claims.
- Output usability:
  - Edit, copy, PDF export on the same page.

## 4) Optimal ApplyKit flow with cover letter included

### Product flow

1. Vacancy created/updated.
2. Tailored resume generated (already implemented).
3. Cover letter generated/edited (new).
4. Export package:
   - Resume ATS/Human PDF
   - Cover letter PDF
5. Apply outside the system and continue vacancy status management.

### Groomed scope note

- Do not add a new vacancy status for cover letter in MVP.
- Treat cover letter as an application artifact attached to vacancy, not as a status-transition gate.

## 5) Base page concept (MVP)

### Route

- Keep: `/vacancies/:id/cover`

### Layout

- Two-column split layout:
  - Left: inputs/settings + generate controls
  - Right: editor + white-page preview + output actions

### Required inputs/settings (MVP)

- Output language: `en`, `da`
- Output type: `letter | message`
- Length preset: `short | standard | long`
- Tone: `professional | friendly | enthusiastic | direct`
- Additional instructions (optional; prefill from vacancy notes when present)

### Optional (low-cost) settings for MVP

- Recipient name
- Include subject line toggle

### Output actions

- Copy text
- Download PDF
- Autosave edited content

## 6) States, UX logic, and settings policy

### Page states

- No tailored resume available:
  - show blocked state with CTA to generate resume first
- Ready to generate:
  - controls visible, no output yet
- Generating:
  - lock main controls and show progress
- Generated:
  - editable content + preview + actions
- Error:
  - recoverable error state with regenerate action

### Stale logic (groomed)

- Use vacancy version marker + source generation link to detect stale content.
- For fast MVP, stale badge/regenerate-warning can be delivered as phase `MVP+1` if needed.

### Settings policy

- Include presets and semantic controls.
- Exclude direct temperature slider and hard min/max char controls from MVP UI.

## 7) Backend/data architecture for scalability

### Data model (new entity)

Create `cover_letters` table (MVP fields):

- `id`
- `vacancyId`
- `generationId` (source tailored resume generation)
- `vacancyVersionMarker`
- `language` (`en`, `da`)
- `type` (`letter`, `message`)
- `tone`
- `lengthPreset`
- `recipientName` (nullable)
- `includeSubjectLine` (bool)
- `subjectLine` (nullable)
- `instructions` (snapshot of user comment)
- `contentMarkdown`
- `createdAt`, `updatedAt`
- optional observability fields:
  - `provider`, `model`, `tokensUsed`, `cost`

### API surface (minimum)

- `GET /api/vacancies/:id/cover-letter` -> latest saved cover letter or `null`
- `POST /api/vacancies/:id/cover-letter/generate` -> generate and persist
- `PUT /api/cover-letters/:id` -> persist manual edits/settings

### LLM integration

- Add dedicated service (for example `server/services/llm/cover-letter.ts`).
- Call `callLLM` with scenario `cover_letter_generation`.
- Prefer structured JSON response payload:
  - `contentMarkdown`
  - `language`
  - `type`
  - `subjectLine?`

### Critical alignment note

- Current seed for cover scenario uses `response_format = text` in migration
  (`packages/nuxt-layer-api/server/data/migrations/0009_admin_llm_routing.sql`).
- For structured output, default should be switched to `json` (migration or admin config baseline).

## 8) Languages, Danish, and scale path

### As-is

- UI locale infrastructure exists but only English locale files are configured.
- Cover letter output language is a feature-level setting and can be implemented independently from full
  site locale expansion.

### Groomed decision

- Introduce server-side `language packs` for cover generation:
  - `en`
  - `da`
- Pack content:
  - writing guidelines
  - greeting/closing defaults
  - tone mapping
  - type-specific rules (`letter` vs `message`)

### Translation pipeline decision

- MVP should generate directly in target output language with the primary model.
- Do not use two-step cheap translation for Danish in MVP due quality risk.
- Possible phase-2 optimization: low-cost vacancy brief extraction to reduce tokens.

## 9) PDF export integration

### As-is

- Current `/api/pdf/*` pipeline is resume-specific by schema and preview rendering.

### Groomed MVP choice

- Use dedicated cover-letter PDF endpoints and preview route in MVP to avoid regression risk in resume export:
  - example: `/api/cover-letter/pdf/prepare`, `/api/cover-letter/pdf/file`
- Reuse the same tokenized short-lived export mechanics.

### Scale path

- Plan a later unification to `docType`-based shared export pipeline once cover flow is stable.

## 10) MVP release package and phased rollout

### MVP (release 1)

- Runtime generation endpoint for cover letter
- `cover_letters` persistence
- `/vacancies/:id/cover` real UI with:
  - settings
  - generate/regenerate
  - markdown edit
  - white-page preview
  - copy
  - PDF download
- Language support in output: `en` + `da`
- Ownership/limits/security rules aligned with existing vacancy flows

### After MVP (release 2+)

- Stale badge + guided regenerate with latest vacancy/generation
- Vacancy requirement extraction/checklist ("what to emphasize")
- Header/signature template library
- Additional output languages via language-pack extension
- Export pipeline unification via `docType`

## Additional decisions introduced in this grooming pass

1. Keep vacancy status model unchanged in MVP.
2. Prefer structured LLM output (`json`) for reliable save/edit/export.
3. Treat stale detection UI as flexible scope boundary (`MVP` or `MVP+1`).
4. Keep translation quality over token optimization for Danish in MVP.
5. Keep PDF integration low-risk first, then unify.

## Open questions to resolve in clarification step

1. Should stale warning be in MVP or moved to MVP+1?
2. Should we expose recipient and subject settings in MVP UI or hide behind "advanced"?
3. Should cover generation require profile completeness exactly like resume generation?
4. Should `cover_letters` keep one latest record per vacancy or version history from day one?
5. Should we switch cover scenario default response format to JSON by migration now?
6. Should language output be limited to `en/da` hardcoded in MVP, or read from config registry immediately?
7. Should PDF integration use dedicated endpoints now (recommended) or immediate shared `docType` refactor?

## Speckit readiness

This raw concept is ready for point-by-point clarification. After clarifications are captured, the final concept
can be transformed into Speckit artifacts:

- `spec.md` (product requirements + acceptance criteria)
- `plan.md` (technical decisions + migration/API contracts)
- `tasks.md` (implementation checklist)
