# Endpoints (MVP)

## Resume

- `POST /api/resume/parse`
  - body: multipart file (DOCX or PDF)
  - returns: `ResumeJson`
- `GET /api/resume`
  - returns current base resume JSON
- `PUT /api/resume`
  - body: `ResumeJson` (strict)
  - returns saved resume

## Vacancies

- `POST /api/vacancies`
  - body: `{ company: string, jobPosition?: string, description: string, url?: string, notes?: string }`
  - returns: vacancy
- `GET /api/vacancies`
  - returns list (title rendered as `company (jobPosition)` when position exists)
- `GET /api/vacancies/:id`
  - returns vacancy details + latest generated version (MVP)
- `PUT /api/vacancies/:id`
  - update vacancy fields
- `POST /api/vacancies/:id/generate`
  - generates a new adapted version from current base resume + vacancy
  - appends to `generatedVersions[]`
  - returns latest version

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
