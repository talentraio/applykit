# Data flow and lifecycle

## Core entities

- `User`
- `Profile` (contact and job-search preferences)
- `Resume` (single base resume per user)
- `ResumeVersion` (snapshot history when base content changes)
- `UserFormatSettings` (user-level ATS/Human formatting preferences)
- `Vacancy` (user-owned target job)
- `Generation` (tailored resume output per vacancy)
- `GenerationScoreDetail` (on-demand detailed scoring payload)

## Resume creation and parsing

`POST /api/resume` supports two modes:

1. Multipart upload (DOCX/PDF)
2. JSON import (`ResumeContent`)

Upload flow:

1. User uploads DOCX/PDF.
2. Server parses document text.
3. LLM parse service returns structured `ResumeContent`.
4. Output is validated and persisted as the user's base resume.

Single-resume behavior:

- The user keeps one base resume.
- New uploads/imports replace base resume data.

## Vacancy lifecycle

1. User creates vacancy (`POST /api/vacancies`).
2. User edits vacancy (`PUT /api/vacancies/:id`) as needed.
3. User generates tailored resume (`POST /api/vacancies/:id/generate`).

Generation behavior:

- Requires complete profile.
- Uses base resume + vacancy context.
- Persists `Generation` with baseline score fields and breakdown.
- Locks `vacancy.canGenerateResume = false` after successful generation.
- Re-enables generation when unlocking vacancy fields change (`company`, `jobPosition`, `description`).

## Scoring lifecycle

### Baseline score (inline with generation)

- Produced during `POST /api/vacancies/:id/generate`.
- Stored on `Generation` (`matchScoreBefore`, `matchScoreAfter`, `scoreBreakdown`).

### Detailed score (on-demand)

- Triggered by `POST /api/vacancies/:id/generations/:generationId/score-details`.
- Reuse-first behavior:
  - returns persisted details if fresh,
  - regenerates only when requested/eligible.
- `GET /api/vacancies/:id/preparation` returns:
  - vacancy meta,
  - latest generation summary,
  - optional detailed scoring payload,
  - UI flags for request/regenerate state.

## Resume editing and generation editing

- Base resume update: `PUT /api/resume`.
  - Content updates create version snapshots.
- Tailored generation update: `PUT /api/vacancies/:id/generation`.
  - Allows manual edits to generated content.
- Score alert dismissal: `PATCH /api/vacancies/:id/generation/dismiss-score-alert`.

## Rendering and PDF export

Current export pipeline is tokenized:

1. `POST /api/pdf/prepare` stores a short-lived payload and returns a token.
2. Preview page reads payload by token (`/pdf/preview` + `GET /api/pdf/payload`).
3. `GET /api/pdf/file?token=...` renders and streams PDF, then deletes token payload.

## Store initialization (Nuxt)

App plugin: `apps/site/layers/_base/app/plugins/init-data.ts`

- `name: 'init-data'`
- `enforce: 'pre'`
- `parallel: false`
- `dependsOn: ['pinia']`

Behavior:

- Tries to fetch authenticated user session/profile (`authStore.fetchMe()`).
- Public visitors proceed without auth errors.
- Leaves hooks for loading global dictionaries.

## Format settings lifecycle

Entity:

- Stored separately from resume in `user_format_settings`.
- Shape: `{ ats, human }` where each branch has `spacing + localization`.

Flow:

1. UI requests `GET /api/user/format-settings`.
2. Server auto-seeds defaults if row is missing.
3. UI saves incremental changes via `PATCH /api/user/format-settings`.
4. Full replace path exists via `PUT /api/user/format-settings`.

## Preferences lifecycle

Vacancy list UI preferences:

- `PATCH /api/user/preferences/vacancy-list`
- Upserts `columnVisibility` per user.

## Related docs

- LLM scenario model: [`./llm-scenarios.md`](./llm-scenarios.md)
- Security/privacy: [`./security-privacy.md`](./security-privacy.md)
- API endpoints: [`../api/endpoints.md`](../api/endpoints.md)
