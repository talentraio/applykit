# Schemas and Contracts (Current)

Canonical schema source: `@int/schema` (`packages/schema/*`).

This page summarizes the contracts used by current endpoints.

## Auth contracts

From `packages/schema/schemas/auth.ts`:

- `RegisterInput`
  - `{ email, password, firstName, lastName }`
- `LoginInput`
  - `{ email, password }`
- `ForgotPasswordInput`
  - `{ email }`
- `ResetPasswordInput`
  - `{ token, password }`
- `AcceptTermsInput`
  - `{ legalVersion }` where `legalVersion` is `dd.MM.yyyy`
- `AuthMeResponse`
  - `{ user: UserPublic, profile: Profile | null, isProfileComplete: boolean }`

## User and profile contracts

### User

- `UserPublic` includes:
  - identity + account fields: `id`, `email`, `role`, `status`
  - verification/legal fields: `emailVerified`, `emailVerificationExpires`, `termsAcceptedAt`, `legalVersion`
  - timestamps: `createdAt`, `updatedAt`, `lastLoginAt`, `deletedAt`

### Profile

From `packages/schema/schemas/profile.ts`:

- `ProfileInput` (PUT `/api/profile`)
  - `firstName`, `lastName`, `email`, `country`, `searchRegion`, `workFormat`
  - optional: `languages[]`, `phones[]`, `photoUrl`
- `PhoneEntry`
  - `{ number, label? }`
- `LanguageEntry`
  - `{ language, level }`

Profile completeness gate (runtime repository logic) currently requires:

- `firstName`, `lastName`, `email`, `country`, `searchRegion`

`languages` is temporarily not required in completeness check.

## Resume contracts

From `packages/schema/schemas/resume.ts`:

- `ResumeContent`
  - `personalInfo`
  - optional `summary`
  - `experience[]`
  - `education[]`
  - `skills[]` as **skill groups** (`{ type, skills[] }`)
  - optional `certifications[]`
  - optional `languages[]`
  - optional `customSections[]`
- date fields inside resume entries use `YYYY-MM` format.

Resume entity (`Resume`):

- `id`, `userId`, `title`, `content`, `sourceFileName`, `sourceFileType`, `createdAt`, `updatedAt`

Primary endpoint payloads:

- `POST /api/resume` (JSON mode)
  - `{ content: ResumeContent, title, sourceFileName?, sourceFileType? }`
- `PUT /api/resume`
  - `{ content?: ResumeContent, title?: string }`

## Format settings contracts

From `packages/schema/schemas/format-settings.ts`:

- `UserFormatSettings`
  - `{ ats, human }`
- `ats` and `human` each contain:
  - `spacing`: `marginX`, `marginY`, `fontSize`, `lineHeight`, `blockSpacing`
  - `localization`: `language`, `dateFormat`, `pageFormat`
- `PatchFormatSettingsBody`
  - deep partial patch of `{ ats?, human? }`
- `PutFormatSettingsBody`
  - full replacement `{ ats, human }`

## Vacancy contracts

From `packages/schema/schemas/vacancy.ts` and `vacancy-list.ts`:

- `VacancyInput`
  - required: `company`, `description`
  - optional/nullable: `jobPosition`, `url`, `notes`
  - optional status field (validated by `VacancyStatus` enum)
- `VacancyListQuery`
  - pagination: `currentPage`, `pageSize`
  - sorting: `sortBy`, `sortOrder`
  - filters: `status[]`, `search`
- `VacancyListResponse`
  - `{ items, pagination, columnVisibility }`
- `VacancyBulkDelete`
  - `{ ids: string[] }` (1..100 UUID)
- `VacancyListPreferencesPatch`
  - `{ columnVisibility: Record<string, boolean> }`

## Generation and scoring contracts

From `packages/schema/schemas/generation.ts`:

- `Generation`
  - `id`, `vacancyId`, `resumeId`, `content`
  - `matchScoreBefore`, `matchScoreAfter`
  - `scoreBreakdown`
  - `generatedAt`, `expiresAt`, `scoreAlertDismissedAt`
- `ScoreBreakdown`
  - `version`
  - weighted components (`core`, `mustHave`, `niceToHave`, `responsibilities`, `human`)
  - `gateStatus` (`schemaValid`, `identityStable`, `hallucinationFree`)
- `GenerationScoreDetailPayload`
  - `summary`, `matched[]`, `gaps[]`, `recommendations[]`, `scoreBreakdown`
- `GenerationScoreDetail`
  - persisted details with vacancy version marker, provider/model metadata

Vacancy response helper types (from `packages/nuxt-layer-api/types/vacancies.ts`):

- `VacancyMeta`
- `VacancyOverview`
- `VacanciesResumeGeneration`
- `VacanciesScoreDetailsResponse`
- `VacancyPreparationResponse`

## PDF export contracts

Runtime payload for tokenized PDF export (`/api/pdf/*`):

- prepare request:
  - `{ format, content, settings?, photoUrl?, filename? }`
  - `format`: `ats | human`
  - `content`: `ResumeContent`
  - `settings`: partial spacing settings
- prepare response:
  - `{ token, expiresAt }`
- payload/file endpoints use query `token`.

## LLM model contracts

From `packages/schema/schemas/llm-model.ts`:

- `LlmModel`
  - provider/model identity
  - status (`active | disabled | archived`)
  - pricing (`input/output/cached` per 1M tokens)
  - capabilities (`supportsJson`, `supportsTools`, `supportsStreaming`)
  - optional context/output token limits
- `LlmModelCreateInput`
- `LlmModelUpdateInput`

## LLM routing contracts

From `packages/schema/schemas/llm-routing.ts`:

- `RoutingAssignmentInput`
  - `modelId`
  - optional: `retryModelId`, `temperature`, `maxTokens`, `responseFormat`, `reasoningEffort`, `strategyKey`
- `RoutingScenarioEnabledInput`
  - `{ enabled: boolean }`
- `LlmRoutingItem`
  - `scenarioKey`, `enabled`, `enabledOverrides[]`, `default`, `overrides[]`

Normalization rules are enforced server-side by scenario:

- `retryModelId` applies only to selected scenarios.
- `reasoningEffort` applies only to `resume_adaptation`.
- `strategyKey` applies only to `resume_adaptation`.

## Role, system, and usage contracts

### Role settings

From `packages/schema/schemas/role-settings.ts`:

- `RoleSettings`
  - `platformLlmEnabled`
  - `dailyBudgetCap`, `weeklyBudgetCap`, `monthlyBudgetCap`

### System config

From `packages/schema/schemas/system.ts`:

- keys: `global_budget_cap`, `global_budget_used`
- admin API exposes mapped fields:
  - `globalBudgetCap`, `globalBudgetUsed`

### Usage

From `packages/schema/schemas/usage.ts`:

- `UsageLog`
  - `operation`: `parse | generate | export`
  - `providerType`: currently `platform`
  - optional context/tokens/cost

## Enums referenced by contracts

From `packages/schema/constants/enums.ts`:

- Roles: `super_admin`, `friend`, `promo`, `public`
- User status: `invited`, `active`, `blocked`, `deleted`
- Vacancy status: `created`, `generated`, `screening`, `rejected`, `interview`, `offer`
- LLM scenarios:
  - `resume_parse`
  - `resume_adaptation`
  - `resume_adaptation_scoring`
  - `resume_adaptation_scoring_detail`
  - `cover_letter_generation`

## Notes

- `/api/resumes*` contracts remain for backward compatibility but are deprecated.
- Prefer singular `/api/resume` and `/api/pdf/*` export flow for new code.
