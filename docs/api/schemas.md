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

## RoleSettings (Admin)

Role-level platform controls stored in `role_settings`:

- `role: Role`
- `platformLlmEnabled: boolean`
- `dailyBudgetCap: number`
- `weeklyBudgetCap: number`
- `monthlyBudgetCap: number`
- `updatedAt: Date`

## LLM Model Catalog

`LlmModel` (admin-managed source of truth for model metadata/pricing):

- `id: uuid`
- `provider: 'openai' | 'gemini'`
- `modelKey: string`
- `displayName: string`
- `status: 'active' | 'disabled' | 'archived'`
- `inputPricePer1mUsd: number`
- `outputPricePer1mUsd: number`
- `cachedInputPricePer1mUsd?: number | null`
- `maxContextTokens?: number | null`
- `maxOutputTokens?: number | null`
- `supportsJson: boolean`
- `supportsTools: boolean`
- `supportsStreaming: boolean`
- `notes?: string | null`
- `createdAt`, `updatedAt`

## LLM Scenario Routing

`LlmScenarioKey` enum:

- `resume_parse`
- `resume_adaptation`
- `resume_adaptation_scoring`
- `resume_adaptation_scoring_detail`
- `cover_letter_generation`

Routing schemas:

- `RoutingAssignmentInput`:
  - `modelId: uuid`
  - `retryModelId?: uuid | null`
  - `temperature?: number | null`
  - `maxTokens?: number | null`
  - `responseFormat?: 'text' | 'json' | null`
  - `strategyKey?: 'economy' | 'quality' | null`
  - persistence rules by scenario:
    - `retryModelId` is used for `resume_parse`, `resume_adaptation`, and
      `resume_adaptation_scoring_detail`
    - `strategyKey` is used only for `resume_adaptation`
- `LlmRoutingItem`:
  - `scenarioKey`
  - `default?: RoutingAssignmentInput & { updatedAt } | null`
  - `overrides: Array<RoutingAssignmentInput & { role, updatedAt }>`

`LlmStrategyKey` enum:

- `economy`
- `quality`

## Generation Score Breakdown

`Generation` includes baseline scoring metadata:

- `matchScoreBefore: number (0..100)`
- `matchScoreAfter: number (0..100)`
- `scoreBreakdown`:
  - `version: string`
  - `components`:
    - `core: { before, after, weight }`
    - `mustHave: { before, after, weight }`
    - `niceToHave: { before, after, weight }`
    - `responsibilities: { before, after, weight }`
    - `human: { before, after, weight }`
  - `gateStatus`:
    - `schemaValid: boolean`
    - `identityStable: boolean`
    - `hallucinationFree: boolean`

`scoreBreakdown.version`:

- baseline / fallback path: `fallback-keyword-v1`
- deterministic detailed path: `deterministic-v1`

## Generation Detailed Scoring

Detailed scoring is stored separately and requested on-demand.

`GenerationScoreDetailPayload`:

- `summary`: `{ before, after, improvement }` (0..100 integers)
- `matched[]`: weighted matched signals with evidence refs
- `gaps[]`: weighted missing/weak signals with evidence refs
- `recommendations[]`: short actionable recommendations
- `scoreBreakdown`: deterministic component breakdown snapshot used for the details output

`GenerationScoreDetail`:

- `id: uuid`
- `generationId: uuid`
- `vacancyId: uuid`
- `vacancyVersionMarker: string` (used to detect stale details when vacancy changes)
- `details: GenerationScoreDetailPayload`
- `provider: 'openai' | 'gemini'`
- `model: string`
- `strategyKey: 'economy' | 'quality' | null`
- `createdAt`, `updatedAt`

## Usage Provider Type

Runtime writes platform-only usage records.
