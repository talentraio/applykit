# Endpoints (Current)

This document reflects the current HTTP API implemented under
`packages/nuxt-layer-api/server/api/*` and `packages/nuxt-layer-api/server/routes/*`.

## Access and auth rules

- By default, `/api/*` requires authenticated session.
- Public API exceptions: `/api/auth/*`.
- Admin routes (`/api/admin/*`) require `super_admin`.
- Some routes are outside `/api/*` and live in `server/routes/*`.

## OAuth and non-API routes

- `GET /auth/google`
  - OAuth entry + callback handler (Google).
  - Creates/links/activates user, sets session, redirects.
- `GET /auth/linkedin`
  - OAuth entry + callback handler (LinkedIn).
  - Creates/links/activates user, sets session, redirects.
- `GET /storage/:path` (dev-only)
  - Serves local storage files only in development.

## Authentication

- `GET /api/auth/me`
  - Returns `{ user, profile, isProfileComplete }`.
- `POST /api/auth/logout`
  - Clears session.
  - Response: `{ success: true }`.
- `POST /api/auth/register`
  - Body: `RegisterInput` (`email`, `password`, `firstName`, `lastName`).
  - Creates account or activates invited account (if invite flow), sets session.
  - Response: `{ success: true }`.
- `POST /api/auth/login`
  - Body: `LoginInput` (`email`, `password`).
  - Sets session.
  - Response: `{ success: true }`.
- `POST /api/auth/forgot-password`
  - Body: `ForgotPasswordInput` (`email`).
  - Always returns success (anti-enumeration).
  - Response: `{ success: true }`.
- `POST /api/auth/reset-password`
  - Body: `ResetPasswordInput` (`token`, `password`).
  - Response: `{ success: true }`.
- `POST /api/auth/send-verification`
  - Requires auth.
  - Resends verification email unless already verified.
  - Response: `{ success: true }` or `{ success: true, message }`.
- `GET /api/auth/verify-email?token=...&flow=verification|invite`
  - Verifies email by token, then redirects.
  - `flow=verification` -> profile redirect.
  - `flow=invite` -> invite redirect (expiry bypass while user stays `invited`).

## User and profile

- `POST /api/user/accept-terms`
  - Body: `AcceptTermsInput` (`legalVersion` as `dd.MM.yyyy`).
  - Response: `{ termsAcceptedAt, legalVersion }`.
- `GET /api/profile`
  - Returns current profile or `null`.
- `PUT /api/profile`
  - Body: `ProfileInput`.
  - Creates profile if missing, otherwise updates.
- `GET /api/profile/complete`
  - Response: `{ complete: boolean }`.
- `POST /api/profile/photo`
  - Multipart upload (`file`).
  - Supports JPEG/PNG/WebP, max 5MB.
  - Response: `{ photoUrl }`.
- `DELETE /api/profile/photo`
  - Deletes profile photo(s).
  - Response: `{ success: true, deletedCount }`.
- `DELETE /api/profile/account`
  - GDPR-style account deletion flow.
  - Deletes user content, sanitizes account, clears session.
  - Response: `{ success: true }`.

## Resume

### Primary single-resume API

- `GET /api/resume`
  - Returns current base resume.
  - `404` if no resume.
- `POST /api/resume`
  - Two modes:
    - `multipart/form-data` with `file` (DOCX/PDF) + optional `title`.
    - `application/json` with `{ content, title, sourceFileName?, sourceFileType? }`.
  - Creates or replaces user base resume.
- `PUT /api/resume`
  - Body: `{ content?: ResumeContent, title?: string }`.
  - Updates base resume; creates version snapshot when content changes.

### Deprecated aliases (`/api/resumes*`)

All endpoints below set deprecation headers:

- `GET /api/resumes`
- `POST /api/resumes` (multipart upload + parse)
- `GET /api/resumes/:id`
- `PUT /api/resumes/:id`
- `DELETE /api/resumes/:id`

Use `/api/resume` instead.

## User preferences and format settings

- `GET /api/user/format-settings`
  - Returns `{ ats, human }`.
  - Auto-seeds defaults if missing.
- `PATCH /api/user/format-settings`
  - Body: deep partial patch of `{ ats?, human? }`.
  - Deep-merges + validates, returns full `{ ats, human }`.
- `PUT /api/user/format-settings`
  - Body: full replacement `{ ats, human }`.
  - Returns full `{ ats, human }`.
- `PATCH /api/user/preferences/vacancy-list`
  - Body: `{ columnVisibility: Record<string, boolean> }`.
  - Upsert behavior.
  - Returns `{ columnVisibility }`.

## Vacancies and generations

- `POST /api/vacancies`
  - Body: `VacancyInput` (`company`, optional `jobPosition`, `description`, optional `url`, `notes`, optional `status`).
- `GET /api/vacancies`
  - Query: `currentPage`, `pageSize`, `sortBy`, `sortOrder`, `status`, `search`.
  - Response: `{ items, pagination, columnVisibility }`.
- `PUT /api/vacancies/:id`
  - Body: partial `VacancyInput`.
  - Applies status-transition validation.
  - Unlocks generation if `company` / `jobPosition` / `description` changed.
- `DELETE /api/vacancies/:id`
  - Deletes vacancy (and related generations via cascade).
  - Response: `204`.
- `DELETE /api/vacancies/bulk`
  - Body: `{ ids: string[] }` (1-100 UUIDs).
  - Response: `204`.
- `GET /api/vacancies/:id/meta`
  - Returns minimal vacancy meta + score-detail action flags.
- `GET /api/vacancies/:id/overview`
  - Returns `{ vacancy, latestGeneration, canGenerateResume }`.
- `POST /api/vacancies/:id/generate`
  - Optional body: `{ resumeId?, provider? }`.
  - Requires complete profile + generation limit.
  - Creates new generation and locks `canGenerateResume=false` until unlock conditions.
- `PUT /api/vacancies/:id/generation`
  - Body: `{ content, generationId? }`.
  - Updates generation content.
- `PATCH /api/vacancies/:id/generation/dismiss-score-alert`
  - Body: `{ generationId? }`.
  - Marks score alert dismissed.
- `GET /api/vacancies/:id/generations`
  - Returns all generations for vacancy.
- `GET /api/vacancies/:id/generations/latest`
  - Returns `{ isValid, generation }` (null if none/expired).
- `POST /api/vacancies/:id/generations/:generationId/score-details?regenerate=true|false`
  - Reuse-first detailed scoring endpoint.
  - Response: `{ generationId, vacancyId, reused, stale, details }`.
- `GET /api/vacancies/:id/preparation`
  - Returns preparation payload:
    - vacancy meta
    - latest generation summary
    - optional score details
    - detailed-scoring availability flags

## PDF export flow

Current export flow is tokenized and route-based:

- `POST /api/pdf/prepare`
  - Body: `{ format, content, settings?, photoUrl?, filename? }`.
  - Response: `{ token, expiresAt }`.
- `GET /api/pdf/payload?token=...`
  - Returns stored payload for preview.
- `GET /api/pdf/file?token=...`
  - Generates and streams downloadable PDF.
  - Deletes token payload after use.

## Admin: users

- `GET /api/admin/users`
  - Query: `search`, `role`, `status`, `limit`, `offset`.
  - Response: `{ users, total }`.
- `POST /api/admin/users`
  - Body: `{ email, role }`.
  - Creates invited user + sends invite email.
  - Response includes `inviteEmailSent` and optional `inviteEmailError`.
- `GET /api/admin/users/:id`
  - User detail + profile + usage metrics.
- `PUT /api/admin/users/:id/role`
  - Body: `{ role }`.
- `PUT /api/admin/users/:id/status`
  - Body: `{ blocked: boolean }`.
- `DELETE /api/admin/users/:id`
  - Soft delete.
- `POST /api/admin/users/:id/restore`
  - Restore soft-deleted user.
- `DELETE /api/admin/users/:id/hard`
  - Hard delete (allowed only for soft-deleted users).
- `POST /api/admin/users/:id/invite`
  - Resend invite email for invited user.

## Admin: roles, system, usage

- `GET /api/admin/roles`
- `GET /api/admin/roles/:role`
- `PUT /api/admin/roles/:role`
  - Body supports partial updates:
    - `platformLlmEnabled?`, `dailyBudgetCap?`, `weeklyBudgetCap?`, `monthlyBudgetCap?`.
- `GET /api/admin/system`
  - Returns `{ globalBudgetCap, globalBudgetUsed }`.
- `PUT /api/admin/system`
  - Body: `{ globalBudgetCap? }`.
  - Returns `{ globalBudgetCap, globalBudgetUsed }`.
- `GET /api/admin/usage?period=day|week|month`
  - Returns aggregate usage/cost/user metrics.

## Admin: LLM models and routing

### Model catalog

- `GET /api/admin/llm/models`
  - Response: `{ items }`.
- `POST /api/admin/llm/models`
  - Body: `LlmModelCreateInput`.
- `PUT /api/admin/llm/models/:id`
  - Body: `LlmModelUpdateInput` (at least one field).
- `DELETE /api/admin/llm/models/:id`
  - `204` on success.
  - `409` when model is referenced in routing.

### Scenario routing

- `GET /api/admin/llm/routing`
  - Response: `{ items }`.
- `PUT /api/admin/llm/routing/:scenarioKey/default`
  - Body: `RoutingAssignmentInput`.
  - Normalization:
    - `retryModelId` kept only for `resume_parse`, `resume_adaptation`, `resume_adaptation_scoring_detail`.
    - `reasoningEffort` kept only for `resume_adaptation`.
    - `strategyKey` kept only for `resume_adaptation`.
- `PUT /api/admin/llm/routing/:scenarioKey/enabled`
  - Body: `{ enabled: boolean }`.
- `PUT /api/admin/llm/routing/:scenarioKey/roles/:role`
  - Body: `RoutingAssignmentInput` with same normalization rules.
- `DELETE /api/admin/llm/routing/:scenarioKey/roles/:role`
  - Removes role override (`204`).
- `PUT /api/admin/llm/routing/:scenarioKey/roles/:role/enabled`
  - Body: `{ enabled: boolean }`.
- `DELETE /api/admin/llm/routing/:scenarioKey/roles/:role/enabled`
  - Removes role enabled override (`204`).

## Related docs

- Contracts and schemas: `./schemas.md`
- Data flow: `../architecture/data-flow.md`
- LLM scenarios: `../architecture/llm-scenarios.md`
