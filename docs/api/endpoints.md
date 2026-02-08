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
- `GET /api/auth/verify-email?token=xxx` - Verify email
  - redirects to `/profile?verified=true|false`

## Resume

- `POST /api/resume/parse`
  - body: multipart file (DOCX or PDF)
  - returns: `ResumeJson`
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
  - returns vacancy details + latest generated version (MVP)
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
  - appends to `generatedVersions[]`
  - returns latest version

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
- `GET /api/admin/users/:id` (detail + profile + usage stats)
- `PUT /api/admin/users/:id/role`
- `PUT /api/admin/users/:id/status` (block/unblock)
- `DELETE /api/admin/users/:id` (soft delete)
- `GET /api/admin/roles`
- `GET /api/admin/roles/:role`
- `PUT /api/admin/roles/:role`
- `GET /api/admin/system` (budget + usage)
- `PUT /api/admin/system`
- `GET /api/admin/usage`

Notes:

- All admin endpoints require `super_admin`
- Blocked users receive `403` on protected endpoints
