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

- `GET /api/admin/users`
- `PUT /api/admin/users/:id/role`
- `GET /api/admin/limits`
- `PUT /api/admin/limits`

Backlog: dynamic roles settings UI (add/remove roles, configure per-role limits).
