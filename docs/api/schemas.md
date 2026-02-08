# Schemas (high level)

All schema definitions live in `@int/schema` (Zod + inferred TS types).

## Resume root

**Content** (`ResumeContent`):

- `personalInfo` (fullName, email, phone, location, etc.)
- `summary` (optional)
- `skills[]`
- `experience[]`
- `education[]`
- `projects[]` (optional)
- `certifications[]` (optional)
- `languages[]` (optional)

**Note**: Format settings (atsSettings/humanSettings) were removed from Resume entity. See UserFormatSettings below.

Dates:

- Use `YYYY-MM` format

## Pagination (Base)

Reusable schemas for any paginated endpoint.

**Request** (`PaginationQuery`):

- `currentPage: number` (default 1, min 1)
- `pageSize: number` (default 10, min 1, max 100)

**Response** (`PaginationResponse`):

- `totalItems: number`
- `totalPages: number`

## Vacancy

- company: required
- jobPosition: optional
- description: string (MVP)
- url: optional
- notes: optional
- status: VacancyStatus enum (created, generated, screening, rejected, interview, offer)
- generatedVersions: array (store as array even if UI shows only latest)

## VacancyList

**Query** (`VacancyListQuery` extends `PaginationQuery`):

- `sortBy?: 'updatedAt' | 'createdAt'`
- `sortOrder?: 'asc' | 'desc'`
- `status?: VacancyStatus[]` (accepts string or array, transforms to array)
- `search?: string` (min 3, max 255)

**Response** (`VacancyListResponse`):

- `items: Vacancy[]`
- `pagination: PaginationResponse`
- `columnVisibility: VacancyListColumnVisibility` (Record<string, boolean>)

**Column Visibility** (`VacancyListColumnVisibility`): `Record<string, boolean>`

**Preferences Patch** (`VacancyListPreferencesPatch`): `{ columnVisibility }`

**Bulk Delete** (`VacancyBulkDelete`): `{ ids: string[] }` (1-100 UUIDs)

## Relevance metrics (store now, visualize later)

Inside `generatedVersions[n].metrics`:

- `matchBefore: number` (0..100)
- `matchAfter: number` (0..100)
- `delta: number`
- `tuning: number` (0..100, user-controlled “push closer to vacancy”)

MVP UI: show a simple percentage number.
Backlog: dashboards and visualisations.

## UserFormatSettings (User-Level Entity)

Separate from Resume. Persisted per-user in `user_format_settings` table.

**Structure**:

- `ats: ResumeFormatSettingsAts`
  - `spacing: SpacingSettings` (marginX, marginY, fontSize, lineHeight, blockSpacing)
  - `localization: LocalizationSettings` (language, dateFormat, pageFormat)
- `human: ResumeFormatSettingsHuman`
  - `spacing: SpacingSettings`
  - `localization: LocalizationSettings`

**Types**:

- `SpacingSettings`: marginX (10-26mm), marginY (10-26mm), fontSize (9-13pt), lineHeight (1.1-1.5), blockSpacing (1-9)
- `LocalizationSettings`: language (ISO like "en-US"), dateFormat (date-fns pattern like "MMM yyyy"), pageFormat ("A4" | "us_letter")
- `ResumeFormatSettingsAts`: { spacing, localization }
- `ResumeFormatSettingsHuman`: { spacing, localization }
- `UserFormatSettings`: { ats, human }

**Notes**:

- ATS and Human are separate types (will diverge in future)
- Defaults stored in `runtimeConfig.formatSettings.defaults`
- Auto-seeded on user creation
- Managed by `useFormatSettingsStore` in `_base` layer
- Lazy-loaded on first access to `/resume` or `/vacancies/:id/resume`
