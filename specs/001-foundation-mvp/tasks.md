# Tasks: Foundation MVP

**Input**: Design documents from `/specs/001-foundation-mvp/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Minimal test scaffolding and critical-path tests are included below (IDs `TX***`). Add more tests as needed.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, etc.)
- Include exact file paths in descriptions

## Path Conventions (Nuxt Monorepo)

- **Apps**: `apps/site/`, `apps/admin/`
- **Schema package**: `packages/schema/` (package: `@int/schema`)
- **API layer**: `packages/nuxt-layer-api/` (package: `@int/api`)
- **UI layer**: `packages/nuxt-layer-ui/` (package: `@int/ui`)
- **App layers**: `apps/site/layers/*/`, `apps/admin/layers/*/`
- **App shared layer**: `_base` is mandatory: `apps/site/layers/_base/`, `apps/admin/layers/_base/`

## Design

For any UI work, follow docs/design/mvp.md (Nuxt UI Pro SaaS for apps/site, Dashboard for apps/admin, primary=violet, neutral=slate, system color-mode with dark fallback). 
No custom patterns outside Nuxt UI Pro.

## Testing policy (MVP)

- Treat tests as part of “done” for risky logic (limits, encryption, caching, auth gating).
- Use **Vitest** for unit/integration tests and **Playwright** for e2e smoke tests.
- Test tasks are marked as `TX***` to avoid renumbering the existing `T***` list.

### Test tooling & critical coverage

- [x] TX001 [P] Setup Vitest at repo root (config + `pnpm test`) and add a first smoke unit test
- [x] TX002 [P] Setup Playwright e2e harness (`tests/e2e/` + config + `pnpm e2e`) with a placeholder smoke test
- [x] TX010 [P] Add unit tests for schema helpers (e.g. `getVacancyTitle`) and date format validation in `packages/schema/`
- [x] TX020 Add integration tests for limits/usage counters (daily per-op per-role, 429 responses) in `packages/nuxt-layer-api/server/services/limits/`
- [x] TX021 Add integration tests for BYOK key handling (encrypt at rest, hint only, never log full keys) in `packages/nuxt-layer-api/server/services/`
- [x] TX030 Add integration tests for export caching + invalidation (cache key includes userId + generationId; invalidates on regeneration) in `packages/nuxt-layer-api/server/services/export/`
- [x] TX040 Add a minimal e2e happy-path smoke test (auth → parse → vacancy → generate → export) (can be skipped/flaky-tagged until stable)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, monorepo structure, and tooling

- [x] T001 Initialize pnpm workspace with `pnpm-workspace.yaml` at repo root
- [x] T002 [P] Create `packages/schema/package.json` with name `@int/schema` and TypeScript config
- [x] T003 [P] Create `packages/nuxt-layer-api/package.json` with name `@int/api` and `"main": "./nuxt.config.ts"`
- [x] T004 [P] Create `packages/nuxt-layer-ui/package.json` with name `@int/ui` and `"main": "./nuxt.config.ts"`
- [x] T005 [P] Create `apps/site/package.json` and initial `nuxt.config.ts` extending `@int/ui`, `@int/api`
- [x] T006 [P] Create `apps/admin/package.json` and initial `nuxt.config.ts` extending `@int/ui`, `@int/api`
- [x] T007 Configure ESLint, Prettier, and TypeScript across all packages in root config files
- [x] T008 [P] Create `packages/nuxt-layer-api/.playground/nuxt.config.ts` for isolated API layer testing
- [x] T009 [P] Create `packages/nuxt-layer-ui/.playground/nuxt.config.ts` for isolated UI layer testing
- [x] T010 Setup i18n configuration in `packages/nuxt-layer-ui/nuxt.config.ts` with @nuxtjs/i18n
- [x] T011 [P] Create base locale file `packages/nuxt-layer-ui/locales/en.json` with common keys
- [x] T012 Configure NuxtUI v4 in `packages/nuxt-layer-ui/nuxt.config.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST complete before ANY user story

**CRITICAL**: No user story work can begin until this phase is complete

### 2.1 Schema Package Setup

- [x] T013 [P] Create base enums in `packages/schema/schemas/enums.ts` (Role, WorkFormat, SourceFileType, LLMProvider, Operation, ProviderType, PlatformProvider)
- [x] T014 [P] Create User schema in `packages/schema/schemas/user.ts` with Zod + inferred types
- [x] T015 [P] Create Profile schema in `packages/schema/schemas/profile.ts` with LanguageEntry, PhoneEntry
- [x] T016 [P] Create ResumeContent schema in `packages/schema/schemas/resume.ts` with all nested types
- [x] T017 [P] Create Vacancy schema in `packages/schema/schemas/vacancy.ts` with VacancyInput, getVacancyTitle helper
- [x] T018 [P] Create Generation schema in `packages/schema/schemas/generation.ts` with getDaysUntilExpiration helper
- [x] T019 [P] Create LLMKey schema in `packages/schema/schemas/llm-key.ts`
- [x] T020 [P] Create UsageLog schema in `packages/schema/schemas/usage.ts`
- [x] T021 [P] Create SystemConfig schema in `packages/schema/schemas/system.ts` with SystemConfigDefaults
- [x] T022 Create barrel export in `packages/schema/index.ts` re-exporting all schemas and types

### 2.2 Database & Data Layer

- [x] T023 Install Drizzle ORM and PostgreSQL driver in `packages/nuxt-layer-api/`
- [x] T024 Create DB connection in `packages/nuxt-layer-api/server/data/db.ts` with env-based config (SQLite local, PostgreSQL prod)
- [x] T025 Create Drizzle schema with all tables in `packages/nuxt-layer-api/server/data/schema.ts`
- [x] T026 Create initial migration SQL in `packages/nuxt-layer-api/server/data/migrations/001_init.sql`
- [x] T027 Add `pnpm db:migrate` and `pnpm db:studio` scripts to `packages/nuxt-layer-api/package.json`
- [x] T028 [P] Create userRepository in `packages/nuxt-layer-api/server/data/repositories/user.ts`
- [x] T029 [P] Create profileRepository in `packages/nuxt-layer-api/server/data/repositories/profile.ts`
- [x] T030 [P] Create resumeRepository in `packages/nuxt-layer-api/server/data/repositories/resume.ts`
- [x] T031 [P] Create vacancyRepository in `packages/nuxt-layer-api/server/data/repositories/vacancy.ts`
- [x] T032 [P] Create generationRepository in `packages/nuxt-layer-api/server/data/repositories/generation.ts`
- [x] T033 [P] Create llmKeyRepository in `packages/nuxt-layer-api/server/data/repositories/llm-key.ts`
- [x] T034 [P] Create usageLogRepository in `packages/nuxt-layer-api/server/data/repositories/usage-log.ts`
- [x] T035 [P] Create systemConfigRepository in `packages/nuxt-layer-api/server/data/repositories/system-config.ts`

### 2.3 Storage Adapter

- [x] T036 Create storage adapter interface in `packages/nuxt-layer-api/server/storage/types.ts` (put, get, delete, getUrl)
- [x] T037 Implement Vercel Blob adapter in `packages/nuxt-layer-api/server/storage/vercel-blob.ts`
- [x] T038 Create storage factory in `packages/nuxt-layer-api/server/storage/index.ts` with env-based selection

### 2.4 Auth Infrastructure

- [x] T039 Install nuxt-auth-utils in `packages/nuxt-layer-api/`
- [x] T040 Configure nuxt-auth-utils in `packages/nuxt-layer-api/nuxt.config.ts` with session secret
- [x] T041 Create auth middleware in `packages/nuxt-layer-api/server/middleware/auth.ts` for protected routes
- [x] T042 Create admin middleware in `packages/nuxt-layer-api/server/middleware/admin.ts` checking super_admin role

### 2.5 Rate Limiting & Limits Service

- [x] T043 Create limits service in `packages/nuxt-layer-api/server/services/limits/index.ts` with role-based daily limits
- [x] T044 Create rate limiter utility in `packages/nuxt-layer-api/server/utils/rate-limiter.ts` (in-memory sliding window)
- [x] T045 Create usage tracking utility in `packages/nuxt-layer-api/server/utils/usage.ts` for logging operations

### 2.6 LLM Service Infrastructure

- [x] T046 Create LLM provider interface in `packages/nuxt-layer-api/server/services/llm/types.ts`
- [x] T047 [P] Implement OpenAI provider in `packages/nuxt-layer-api/server/services/llm/providers/openai.ts`
- [x] T048 [P] Implement Gemini provider in `packages/nuxt-layer-api/server/services/llm/providers/gemini.ts`
- [x] T049 Create LLM service factory in `packages/nuxt-layer-api/server/services/llm/index.ts` with provider selection logic

### 2.7 Site App Layers Structure

- [x] T050 [P] Create `apps/site/layers/_base/nuxt.config.ts` with alias `@site/base` + scaffold shared folders (`app/components`, `app/composables`, `app/stores`, `app/utils`, `app/middleware`)
- [x] T051 [P] Create `apps/site/layers/auth/nuxt.config.ts` with alias `@site/auth`
- [x] T052 [P] Create `apps/site/layers/user/nuxt.config.ts` with alias `@site/user`
- [x] T053 [P] Create `apps/site/layers/landing/nuxt.config.ts` with alias `@site/landing`
- [x] T054 Create `apps/site/layers/vacancy/nuxt.config.ts` with alias `@site/vacancy` + update `apps/site/nuxt.config.ts` to extend internal layers in order (`_base` first)

### 2.8 Admin App Layers Structure

- [ ] T055 [P] Create `apps/admin/layers/_base/nuxt.config.ts` with alias `@admin/base` + scaffold shared folders (`app/components`, `app/composables`, `app/stores`, `app/utils`, `app/middleware`)
- [ ] T056 [P] Create `apps/admin/layers/auth/nuxt.config.ts` with alias `@admin/auth`
- [ ] T057 [P] Create `apps/admin/layers/users/nuxt.config.ts` with alias `@admin/users`
- [ ] T058 Create `apps/admin/layers/system/nuxt.config.ts` with alias `@admin/system` + update `apps/admin/nuxt.config.ts` to extend internal layers in order (`_base` first)

**Checkpoint**: Foundation ready - user story implementation can now begin


---

## Phase 3: User Story 1 - Authentication (Priority: P1) MVP

**Goal**: Users can sign in with Google, maintain session, and sign out

**Independent Test**: User can complete Google OAuth flow and see their email on dashboard

### Implementation for US1

- [ ] T059 [US1] Create GET `/api/auth/google` endpoint in `packages/nuxt-layer-api/server/api/auth/google.get.ts`
- [ ] T060 [US1] Create GET `/api/auth/google/callback` route in `packages/nuxt-layer-api/server/routes/auth/google/callback.get.ts`
- [ ] T061 [US1] Create POST `/api/auth/logout` endpoint in `packages/nuxt-layer-api/server/api/auth/logout.post.ts`
- [ ] T062 [US1] Create GET `/api/auth/me` endpoint in `packages/nuxt-layer-api/server/api/auth/me.get.ts`
- [ ] T063 [US1] Create useAuth composable in `packages/nuxt-layer-api/app/composables/useAuth.ts`
- [ ] T064 [US1] Add auth i18n keys to `packages/nuxt-layer-ui/locales/en.json` (auth.login.google, auth.logout, auth.error.*)
- [ ] T065 [US1] Create login page in `apps/site/layers/auth/app/pages/login.vue` with Google sign-in button
- [ ] T066 [US1] Create auth layout in `apps/site/layers/auth/app/layouts/auth.vue`
- [ ] T067 [US1] Create auth guard middleware in `apps/site/layers/auth/app/middleware/auth.global.ts`
- [ ] T068 [US1] Create useCurrentUser composable in `apps/site/layers/_base/app/composables/useCurrentUser.ts` (shared across site layers)
- [ ] T069 [US1] Create dashboard page in `apps/site/app/pages/dashboard.vue` showing current user

**Checkpoint**: User can sign in with Google, see dashboard, sign out

---

## Phase 4: User Story 2 - Resume Upload & Parse (Priority: P1) MVP

**Goal**: Users can upload DOCX/PDF and see parsed resume in JSON editor

**Independent Test**: Upload a DOCX, see structured JSON, edit and save

### Implementation for US2

- [ ] T070 [US2] Create document parser service in `packages/nuxt-layer-api/server/services/parser/index.ts` (mammoth + pdf-parse)
- [ ] T071 [US2] Create parse prompt in `packages/nuxt-layer-api/server/services/llm/prompts/parse.ts`
- [ ] T072 [US2] Create LLM parse service in `packages/nuxt-layer-api/server/services/llm/parse.ts` with Zod validation + retry
- [ ] T073 [US2] Create GET `/api/resumes` endpoint in `packages/nuxt-layer-api/server/api/resumes/index.get.ts`
- [ ] T074 [US2] Create POST `/api/resumes` endpoint in `packages/nuxt-layer-api/server/api/resumes/index.post.ts` (multipart upload + parse)
- [ ] T075 [US2] Create GET `/api/resumes/[id]` endpoint in `packages/nuxt-layer-api/server/api/resumes/[id].get.ts`
- [ ] T076 [US2] Create PUT `/api/resumes/[id]` endpoint in `packages/nuxt-layer-api/server/api/resumes/[id].put.ts`
- [ ] T077 [US2] Create DELETE `/api/resumes/[id]` endpoint in `packages/nuxt-layer-api/server/api/resumes/[id].delete.ts`
- [ ] T078 [US2] Create useResumes composable in `packages/nuxt-layer-api/app/composables/useResumes.ts`
- [ ] T079 [US2] Add resume i18n keys to `packages/nuxt-layer-ui/locales/en.json` (resume.list.*, resume.upload.*, resume.editor.*, resume.error.*)
- [ ] T080 [US2] Create ResumeUploader component in `apps/site/layers/vacancy/app/components/ResumeUploader.vue` with dropzone
- [ ] T081 [US2] Create ResumeJsonEditor component in `apps/site/layers/vacancy/app/components/ResumeJsonEditor.vue`
- [ ] T082 [US2] Create resumes list page in `apps/site/app/pages/resumes/index.vue`
- [ ] T083 [US2] Create resume upload page in `apps/site/app/pages/resumes/new.vue`
- [ ] T084 [US2] Create resume detail page in `apps/site/app/pages/resumes/[id].vue` with JSON editor

**Checkpoint**: User can upload resume, see parsed JSON, edit and save

---

## Phase 5: User Story 3 - Profile Management (Priority: P1) MVP

**Goal**: Users can view/edit profile, system checks completeness before generation

**Independent Test**: Fill profile form, verify completeness check returns true

### Implementation for US3

- [ ] T085 [US3] Create GET `/api/profile` endpoint in `packages/nuxt-layer-api/server/api/profile/index.get.ts`
- [ ] T086 [US3] Create PUT `/api/profile` endpoint in `packages/nuxt-layer-api/server/api/profile/index.put.ts`
- [ ] T087 [US3] Create GET `/api/profile/complete` endpoint in `packages/nuxt-layer-api/server/api/profile/complete.get.ts`
- [ ] T088 [US3] Create useProfile composable in `packages/nuxt-layer-api/app/composables/useProfile.ts`
- [ ] T089 [US3] Add profile i18n keys to `packages/nuxt-layer-ui/locales/en.json` (profile.title, profile.form.*, profile.error.*)
- [ ] T090 [US3] Create ProfileForm component in `apps/site/layers/user/app/components/ProfileForm.vue` with all required fields
- [ ] T091 [US3] Create profile page in `apps/site/app/pages/profile.vue`

**Checkpoint**: User can complete profile, completeness check validates required fields

---

## Phase 6: User Story 4 - Vacancy Management (Priority: P1) MVP

**Goal**: Users can create, list, edit, delete vacancies

**Independent Test**: Create vacancy with company + description, see in list, edit, delete

### Implementation for US4

- [ ] T092 [US4] Create GET `/api/vacancies` endpoint in `packages/nuxt-layer-api/server/api/vacancies/index.get.ts`
- [ ] T093 [US4] Create POST `/api/vacancies` endpoint in `packages/nuxt-layer-api/server/api/vacancies/index.post.ts`
- [ ] T094 [US4] Create GET `/api/vacancies/[id]` endpoint in `packages/nuxt-layer-api/server/api/vacancies/[id].get.ts`
- [ ] T095 [US4] Create PUT `/api/vacancies/[id]` endpoint in `packages/nuxt-layer-api/server/api/vacancies/[id].put.ts`
- [ ] T096 [US4] Create DELETE `/api/vacancies/[id]` endpoint in `packages/nuxt-layer-api/server/api/vacancies/[id].delete.ts`
- [ ] T097 [US4] Create useVacancies composable in `packages/nuxt-layer-api/app/composables/useVacancies.ts`
- [ ] T098 [US4] Add vacancy i18n keys to `packages/nuxt-layer-ui/locales/en.json` (vacancy.list.*, vacancy.form.*, vacancy.detail.*)
- [ ] T099 [US4] Create VacancyForm component in `apps/site/layers/vacancy/app/components/VacancyForm.vue`
- [ ] T100 [US4] Create VacancyCard component in `apps/site/layers/vacancy/app/components/VacancyCard.vue` with "Company (Position)" format
- [ ] T101 [US4] Create vacancies list page in `apps/site/app/pages/vacancies/index.vue`
- [ ] T102 [US4] Create new vacancy page in `apps/site/app/pages/vacancies/new.vue`
- [ ] T103 [US4] Create vacancy detail page in `apps/site/app/pages/vacancies/[id].vue`

**Checkpoint**: User can create, list, edit, delete vacancies

---

## Phase 7: User Story 5 - Resume Generation (Priority: P1) MVP

**Goal**: Generate tailored resume per vacancy with match scores

**Independent Test**: Click generate, see tailored resume with before/after scores

### Implementation for US5

- [ ] T104 [US5] Create generate prompt in `packages/nuxt-layer-api/server/services/llm/prompts/generate.ts`
- [ ] T105 [US5] Create LLM generate service in `packages/nuxt-layer-api/server/services/llm/generate.ts` with Zod validation
- [ ] T106 [US5] Create POST `/api/vacancies/[id]/generate` endpoint in `packages/nuxt-layer-api/server/api/vacancies/[id]/generate.post.ts`
- [ ] T107 [US5] Create GET `/api/vacancies/[id]/generations` endpoint in `packages/nuxt-layer-api/server/api/vacancies/[id]/generations/index.get.ts`
- [ ] T108 [US5] Create GET `/api/vacancies/[id]/generations/latest` endpoint in `packages/nuxt-layer-api/server/api/vacancies/[id]/generations/latest.get.ts`
- [ ] T109 [US5] Create useGenerations composable in `packages/nuxt-layer-api/app/composables/useGenerations.ts`
- [ ] T110 [US5] Add generation i18n keys to `packages/nuxt-layer-ui/locales/en.json` (generation.button, generation.inProgress, generation.matchScore.*, generation.lifetime.*, generation.error.*)
- [ ] T111 [US5] Create GenerateButton component in `apps/site/layers/vacancy/app/components/GenerateButton.vue` with loading state
- [ ] T112 [US5] Create MatchScoreDisplay component in `apps/site/layers/vacancy/app/components/MatchScoreDisplay.vue` (before/after)
- [ ] T113 [US5] Create LifetimeIndicator component in `apps/site/layers/vacancy/app/components/LifetimeIndicator.vue` (days until expiration)
- [ ] T114 [US5] Update vacancy detail page `apps/site/app/pages/vacancies/[id].vue` with generation controls and display

**Checkpoint**: User can generate tailored resume, see scores and expiration

---

## Phase 8: User Story 6 - View & Export (Priority: P1) MVP

**Goal**: View ATS/Human resume versions and export PDFs

**Independent Test**: View ATS page (SSR), view Human page (SSR), download PDF

### Implementation for US6

- [ ] T115 [US6] Create PDF export service in `packages/nuxt-layer-api/server/services/export/pdf.ts` using Playwright
- [ ] T116 [US6] Create POST `/api/vacancies/[id]/export` endpoint in `packages/nuxt-layer-api/server/api/vacancies/[id]/export.post.ts`
- [ ] T117 [US6] Create useExport composable in `packages/nuxt-layer-api/app/composables/useExport.ts`
- [ ] T118 [US6] Add export i18n keys to `packages/nuxt-layer-ui/locales/en.json` (export.button.ats, export.button.human, export.inProgress, export.success, export.error.*)
- [ ] T119 [US6] Create ResumeAtsView component in `apps/site/layers/vacancy/app/components/ResumeAtsView.vue` (SSR island)
- [ ] T120 [US6] Create ResumeHumanView component in `apps/site/layers/vacancy/app/components/ResumeHumanView.vue` (SSR island)
- [ ] T121 [US6] Create ATS view page in `apps/site/app/pages/vacancies/[id]/ats.vue` with server component
- [ ] T122 [US6] Create Human view page in `apps/site/app/pages/vacancies/[id]/human.vue` with server component
- [ ] T123 [US6] Create ExportButtons component in `apps/site/layers/vacancy/app/components/ExportButtons.vue` (ATS + Human)
- [ ] T124 [US6] Update vacancy detail page `apps/site/app/pages/vacancies/[id].vue` with view/export buttons

**Checkpoint**: User can view ATS/Human versions and export PDFs

---

## Phase 9: User Story 7 - BYOK Keys Management (Priority: P2)

**Goal**: Users can store/manage their own LLM API keys

**Independent Test**: Add OpenAI key hint, see in list, delete

### Implementation for US7

- [ ] T125 [US7] Create GET `/api/keys` endpoint in `packages/nuxt-layer-api/server/api/keys/index.get.ts`
- [ ] T126 [US7] Create POST `/api/keys` endpoint in `packages/nuxt-layer-api/server/api/keys/index.post.ts`
- [ ] T127 [US7] Create DELETE `/api/keys/[id]` endpoint in `packages/nuxt-layer-api/server/api/keys/[id].delete.ts`
- [ ] T128 [US7] Create useKeys composable in `packages/nuxt-layer-api/app/composables/useKeys.ts`
- [ ] T129 [US7] Add settings i18n keys to `packages/nuxt-layer-ui/locales/en.json` (settings.title, settings.keys.*)
- [ ] T130 [US7] Create KeyManager component in `apps/site/layers/user/app/components/KeyManager.vue` with localStorage integration
- [ ] T131 [US7] Create settings page in `apps/site/app/pages/settings.vue` with key management

**Checkpoint**: User can add/remove BYOK key hints, keys stored in browser

---

## Phase 10: User Story 8 - Admin Role Management (Priority: P2)

**Goal**: Admin can search users and assign roles

**Independent Test**: Search user by email, change role to friend, verify change

### Implementation for US8

- [ ] T132 [US8] Create GET `/api/admin/users` endpoint in `packages/nuxt-layer-api/server/api/admin/users/index.get.ts` with search
- [ ] T133 [US8] Create GET `/api/admin/users/[id]` endpoint in `packages/nuxt-layer-api/server/api/admin/users/[id].get.ts`
- [ ] T134 [US8] Create PUT `/api/admin/users/[id]/role` endpoint in `packages/nuxt-layer-api/server/api/admin/users/[id]/role.put.ts`
- [ ] T135 [US8] Create useAdminUsers composable in `packages/nuxt-layer-api/app/composables/useAdminUsers.ts`
- [ ] T136 [US8] Add admin users i18n keys to `packages/nuxt-layer-ui/locales/en.json` (admin.users.title, admin.users.search, admin.users.role)
- [ ] T137 [US8] Create UserSearch component in `apps/admin/layers/users/app/components/UserSearch.vue`
- [ ] T138 [US8] Create UserRoleSelector component in `apps/admin/layers/users/app/components/UserRoleSelector.vue`
- [ ] T139 [US8] Create admin login page in `apps/admin/layers/auth/app/pages/login.vue`
- [ ] T140 [US8] Create admin users page in `apps/admin/app/pages/users.vue`

**Checkpoint**: Admin can search users and change roles

---

## Phase 11: User Story 9 - Admin System Controls (Priority: P2)

**Goal**: Admin can toggle kill switches, set budget, select provider

**Independent Test**: Disable platform LLM, verify generations blocked for non-BYOK users

### Implementation for US9

- [ ] T141 [US9] Create GET `/api/admin/system` endpoint in `packages/nuxt-layer-api/server/api/admin/system/index.get.ts`
- [ ] T142 [US9] Create PUT `/api/admin/system` endpoint in `packages/nuxt-layer-api/server/api/admin/system/index.put.ts`
- [ ] T143 [US9] Create GET `/api/admin/usage` endpoint in `packages/nuxt-layer-api/server/api/admin/usage/index.get.ts`
- [ ] T144 [US9] Create useAdminSystem composable in `packages/nuxt-layer-api/app/composables/useAdminSystem.ts`
- [ ] T145 [US9] Add admin system i18n keys to `packages/nuxt-layer-ui/locales/en.json` (admin.system.title, admin.system.platformLlm, admin.system.byok, admin.system.budget)
- [ ] T146 [US9] Create SystemControls component in `apps/admin/layers/system/app/components/SystemControls.vue`
- [ ] T147 [US9] Create BudgetDisplay component in `apps/admin/layers/system/app/components/BudgetDisplay.vue`
- [ ] T148 [US9] Create UsageStats component in `apps/admin/layers/system/app/components/UsageStats.vue`
- [ ] T149 [US9] Create admin system page in `apps/admin/app/pages/system.vue`
- [ ] T150 [US9] Create admin home page in `apps/admin/app/pages/index.vue` with dashboard overview

**Checkpoint**: Admin can control platform settings and view usage

---

## Phase 12: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T151 [P] Create landing page in `apps/site/layers/landing/app/pages/index.vue` with marketing content
- [ ] T152 [P] Create default layout in `apps/site/app/layouts/default.vue` with navigation
- [ ] T153 [P] Create admin default layout in `apps/admin/app/layouts/default.vue` with admin navigation
- [ ] T154 Create background cleanup task in `packages/nuxt-layer-api/server/tasks/cleanup.ts` (expired generations, old logs)
- [ ] T155 Add `vercel.json` with cron job configuration for cleanup task
- [ ] T156 [P] Add common i18n keys to `packages/nuxt-layer-ui/locales/en.json` (common.save, common.cancel, common.delete, common.loading, common.error.generic)
- [ ] T157 Create error page in `apps/site/app/pages/error.vue`
- [ ] T158 [P] Create 404 page in `apps/site/app/pages/[...slug].vue`
- [ ] T159 Security audit: verify no PII/keys logged in `packages/nuxt-layer-api/server/utils/logger.ts`
- [ ] T160 Run quickstart.md validation: complete manual test of happy path

---

## Dependencies & Execution Order

### Phase Dependencies

```
Phase 1 (Setup)
    ↓
Phase 2 (Foundational) ← BLOCKS all user stories
    ↓
Phases 3-11 (User Stories) ← Can proceed in priority order or parallel
    ↓
Phase 12 (Polish)
```

### User Story Dependencies

| Story | Priority | Depends On | Can Start After |
|-------|----------|------------|-----------------|
| US1 (Auth) | P1 | Foundational | Phase 2 complete |
| US2 (Resume) | P1 | US1 (auth required) | T069 complete |
| US3 (Profile) | P1 | US1 (auth required) | T069 complete |
| US4 (Vacancy) | P1 | US1 (auth required) | T069 complete |
| US5 (Generation) | P1 | US2, US3, US4 | T084, T091, T103 complete |
| US6 (Export) | P1 | US5 (needs generation) | T114 complete |
| US7 (BYOK) | P2 | US1 (auth required) | T069 complete |
| US8 (Admin Users) | P2 | Foundational | Phase 2 complete |
| US9 (Admin System) | P2 | US8 (admin auth) | T140 complete |

### Within Each User Story

1. API endpoints before composables
2. Composables before components
3. Components before pages
4. i18n keys can be parallel with implementation

### Parallel Opportunities

**Phase 2 (Foundational)**:
- All schema tasks (T013-T021) can run in parallel
- All repository tasks (T028-T035) can run in parallel after T025
- LLM providers (T047-T048) can run in parallel
- Site layers (T050-T053) can run in parallel
- Admin layers (T055-T057) can run in parallel

**User Stories (after Phase 2)**:
- US2, US3, US4, US7 can start in parallel (all depend only on US1)
- US8 can start in parallel with US1-US7

---

## Parallel Example: Phase 2 Schemas

```bash
# Launch all schema tasks together:
Task: "Create base enums in packages/schema/schemas/enums.ts"
Task: "Create User schema in packages/schema/schemas/user.ts"
Task: "Create Profile schema in packages/schema/schemas/profile.ts"
Task: "Create ResumeContent schema in packages/schema/schemas/resume.ts"
Task: "Create Vacancy schema in packages/schema/schemas/vacancy.ts"
Task: "Create Generation schema in packages/schema/schemas/generation.ts"
Task: "Create LLMKey schema in packages/schema/schemas/llm-key.ts"
Task: "Create UsageLog schema in packages/schema/schemas/usage.ts"
Task: "Create SystemConfig schema in packages/schema/schemas/system.ts"
```

---

## Implementation Strategy

### MVP First (US1-US6)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL)
3. Complete US1: Authentication
4. Complete US2: Resume Upload & Parse
5. Complete US3: Profile Management
6. Complete US4: Vacancy Management
7. Complete US5: Resume Generation
8. Complete US6: View & Export
9. **STOP and VALIDATE**: Run automated checks (typecheck/lint + TX001/TX002 baseline) and ensure happy path works
10. Deploy MVP

### Incremental Delivery

| Increment | Stories | Value Delivered |
|-----------|---------|-----------------|
| MVP | US1-US6 | Full happy path: sign in → upload → vacancy → generate → export |
| +BYOK | US7 | Users can use own API keys |
| +Admin | US8-US9 | Admin can manage users and system |
| +Polish | Phase 12 | Landing page, error handling, cleanup |

### Critical Path

```
Setup → Foundational → US1 (Auth) → US2/US3/US4 (parallel) → US5 → US6 → MVP Complete
```

---

## Notes

- **[P] tasks**: Different files, no dependencies on incomplete tasks
- **[Story] label**: Maps task to specific user story for traceability
- **Path convention**: Both repo path (`packages/nuxt-layer-api/`) and package name (`@int/api`) referenced per monorepo rules
- **i18n**: All UI strings go through i18n; add keys before/during component implementation
- **SSR islands**: ATS/Human views use Nuxt server components for SEO and performance
- **MCP rule**: Use Nuxt/NuxtUI MCP docs when implementing framework-specific features
- **VueUse**: Check for existing composables before writing custom ones
- **Testing**: Prefer completing relevant `TX***` tasks alongside the user-story work (especially limits, caching, encryption)
