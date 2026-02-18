# Endpoints (MVP)

## Authentication

### OAuth Routes (server/routes/)

- `GET /auth/google` - Google OAuth flow (redirect + callback)
- `GET /auth/linkedin` - LinkedIn OAuth flow (redirect + callback)

### Auth API Endpoints

- `GET /api/auth/me` - Get current user and profile
- `POST /api/auth/logout` - Logout current session
- `POST /api/auth/register` - Register with email/password
  - body: `{ email, password, firstName, lastName }`
  - returns: `{ success: true }` + auto-login
- `POST /api/auth/login` - Login with email/password
  - body: `{ email, password }`
  - returns: `{ success: true }` + session cookie
- `POST /api/auth/forgot-password` - Request password reset
  - body: `{ email }`
  - returns: `{ success: true }` (always, to prevent enumeration)
- `POST /api/auth/reset-password` - Reset password with token
  - body: `{ token, password }`
  - returns: `{ success: true }`
- `POST /api/auth/send-verification` - Resend verification email (requires auth)
  - returns: `{ success: true }`
- `GET /api/auth/verify-email?token=xxx&flow=verification|invite` - Verify email
  - `flow=verification` (default): redirects to `/profile?verified=true|false`
  - `flow=invite`: redirects to `/resume?verified=true|false`
  - error redirects append `error=missing_token|invalid_token|expired_token`

## Resume

- `POST /api/resume`
  - supports multipart upload (DOCX/PDF) and JSON payload
  - parses uploaded resume content via platform-managed LLM
  - returns current base resume
- `POST /api/resumes` (deprecated alias for upload+parse flow)
- `GET /api/resume`
  - returns current base resume (content only, no format settings)
- `PUT /api/resume`
  - body: `{ content?: ResumeContent, title?: string }`
  - returns saved resume (content only, no format settings)

## Format Settings (User-Level)

- `GET /api/user/format-settings`
  - returns: `{ ats: ResumeFormatSettingsAts, human: ResumeFormatSettingsHuman }`
  - auto-seeds defaults if no settings exist
- `PATCH /api/user/format-settings`
  - body: deep partial of `{ ats?: { spacing?, localization? }, human?: { spacing?, localization? } }`
  - returns: full settings after merge
  - validates merged result with schemas
  - requires at least one of `ats` or `human`

## Vacancies

- `POST /api/vacancies`
  - body: `{ company: string, jobPosition?: string, description: string, url?: string, notes?: string }`
  - returns: vacancy
- `GET /api/vacancies`
  - query: `{ currentPage?, pageSize?, sortBy?, sortOrder?, status?, search? }`
  - returns: `{ items: Vacancy[], pagination: { totalItems, totalPages }, columnVisibility: Record<string, boolean> }`
  - supports server-side pagination, sorting (updatedAt, createdAt), status filter (array), ILIKE search on company+jobPosition
  - default sort: status-group ordering + updatedAt DESC
- `GET /api/vacancies/:id`
  - returns vacancy details
- `GET /api/vacancies/:id/meta`
  - returns minimal vacancy metadata for layout/header
- `GET /api/vacancies/:id/overview`
  - returns overview payload: vacancy + latest generation summary + canGenerateResume flag
- `PUT /api/vacancies/:id`
  - update vacancy fields
- `DELETE /api/vacancies/:id`
  - delete single vacancy (cascade deletes generations)
  - returns: 204 No Content
- `DELETE /api/vacancies/bulk`
  - body: `{ ids: string[] }` (1-100 UUIDs)
  - verifies all IDs belong to current user (403 if not)
  - returns: 204 No Content
- `POST /api/vacancies/:id/generate`
  - generates a new adapted version from current base resume + vacancy
  - executes two-step pipeline:
    - adaptation (`resume_adaptation`, strategy-aware, retry model optional)
    - lightweight baseline scoring (`resume_adaptation_scoring`)
  - if baseline scoring fails, generation is still persisted with deterministic fallback scoring
  - platform-managed execution path only
  - returns created generation (`matchScoreBefore`, `matchScoreAfter`, `scoreBreakdown`)
- `POST /api/vacancies/:id/generations/:generationId/score-details`
  - sync endpoint for on-demand detailed scoring
  - default behavior reuses latest stored details for the generation
  - `?regenerate=true` forces recompute when details are stale/eligible
  - uses dedicated scenario routing key `resume_adaptation_scoring_detail`
  - returns `{ generationId, vacancyId, reused, stale, details }`
- `GET /api/vacancies/:id/preparation`
  - returns preparation payload:
    - vacancy meta
    - latest generation summary
    - optional detailed scoring payload
    - flags for `canRequestDetails` / `canRegenerateDetails`

## Vacancy List Preferences

- `PATCH /api/user/preferences/vacancy-list`
  - body: `{ columnVisibility: Record<string, boolean> }`
  - returns: `{ columnVisibility }`
  - upserts column visibility preferences for the current user

## Export

- `POST /api/vacancies/:id/export?type=ats|human`
  - returns: `{ url: string }` or streams a PDF
  - uses caching and invalidates cache on regeneration

## Admin (MVP)

- `GET /api/admin/users` (search, role filter, pagination)
- `POST /api/admin/users` (invite user by email + role)
  - creates invited user even if email delivery fails
  - returns created user summary + `inviteEmailSent: boolean` + optional `inviteEmailError`
- `POST /api/admin/users/:id/invite` (resend invite email for invited user)
  - regenerates verification token and retries invite email delivery
  - invite verification links do not expire while user remains in `invited` status
  - returns `inviteEmailSent: boolean` + optional `inviteEmailError`
- `GET /api/admin/users/:id` (detail + profile + usage stats)
- `PUT /api/admin/users/:id/role`
- `PUT /api/admin/users/:id/status` (block/unblock)
- `DELETE /api/admin/users/:id` (soft delete)
- `POST /api/admin/users/:id/restore` (restore soft-deleted user)
- `DELETE /api/admin/users/:id/hard` (permanent delete for soft-deleted user, clears suppression for re-registration)
- `GET /api/admin/roles`
- `GET /api/admin/roles/:role`
- `PUT /api/admin/roles/:role`
- `GET /api/admin/system` (budget + usage)
- `PUT /api/admin/system`
- `GET /api/admin/usage`
- `GET /api/admin/llm/models`
- `POST /api/admin/llm/models`
- `PUT /api/admin/llm/models/:id`
- `DELETE /api/admin/llm/models/:id`
- `GET /api/admin/llm/routing`
- `PUT /api/admin/llm/routing/:scenarioKey/default`
  - body: `RoutingAssignmentInput`
  - normalization rules:
    - `retryModelId` is persisted only for `resume_parse`, `resume_adaptation`, and
      `resume_adaptation_scoring_detail`
    - `strategyKey` is persisted only for `resume_adaptation`
- `PUT /api/admin/llm/routing/:scenarioKey/roles/:role`
  - body: `RoutingAssignmentInput`
  - normalization rules:
    - `retryModelId` is persisted only for `resume_parse`, `resume_adaptation`, and
      `resume_adaptation_scoring_detail`
    - `strategyKey` is persisted only for `resume_adaptation`
- `DELETE /api/admin/llm/routing/:scenarioKey/roles/:role`

Notes:

- All admin endpoints require `super_admin`
- Blocked users receive `403` on protected endpoints
- Runtime uses platform-managed provider credentials only
