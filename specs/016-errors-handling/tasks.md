# Tasks: 016 — Centralized API Error Handling

**Input**: Design documents from `/specs/016-errors-handling/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/
**Documentation Gate**: Read and follow `docs/codestyle/base.md` before any code changes. Also read:

- `docs/codestyle/api-fetching.md` (API transport patterns)
- `docs/codestyle/i18n.md` (i18n rules)
- `docs/architecture/monorepo.md` (layer structure)
- `docs/architecture/security-privacy.md` (session/auth patterns)

**Tests**: Unit tests are included (spec explicitly requests Vitest tests for `parseValidationErrors`, `ApiError`, `isApiError`).

**Organization**: Tasks are grouped into functional phases matching the plan. This feature has no traditional user stories — it's infrastructure. Phases map to plan.md phases A–F.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[US*]**: Which functional area this task belongs to
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Types & Error Class)

**Purpose**: Build the reusable error handling foundation in `packages/nuxt-layer-api/` (`@int/api`).

- [x] T001 [P] Create shared error types (`ForbiddenCode`, `FormError`, `ApiErrorHandlerConfig`) in `packages/nuxt-layer-api/app/utils/api-errors/types.ts`
- [x] T002 [P] Create `ApiError` class and `isApiError()` type guard in `packages/nuxt-layer-api/app/utils/api-errors/api-error.ts`
- [x] T003 [P] Create `parseValidationErrors()` utility (Zod issues → `FormError[]` with dot-notation paths) in `packages/nuxt-layer-api/app/utils/api-errors/validation.ts`
- [x] T004 Create `createApiErrorHandler(config)` factory (returns `onResponseError` callback, routes by status code, `import.meta.client` guard) in `packages/nuxt-layer-api/app/utils/api-errors/create-handler.ts`
- [x] T005 Create barrel re-export of all public API in `packages/nuxt-layer-api/app/utils/api-errors/index.ts`
- [x] T006 Create `useApiErrorToast()` composable (uses `useToast()` + `useI18n()`, resolves `errors.api.{status}.*` keys) in `packages/nuxt-layer-api/app/composables/useApiErrorToast.ts`

**Checkpoint**: Shared utilities ready. No app behavior changed yet.

---

## Phase 2: Server-Side Changes

**Purpose**: Add 403 code enum and migrate 400→422 for 2 vacancy endpoints.

### 403 code additions

- [x] T007 [P] Add `data: { code: 'USER_DELETED' }` and `data: { code: 'USER_BLOCKED' }` to 403 errors in `packages/nuxt-layer-api/server/middleware/auth.ts`
- [x] T008 [P] Add `data: { code: 'ACCESS_DENIED' }` to 403 error in `packages/nuxt-layer-api/server/middleware/admin.ts`
- [x] T009 [P] Add `data: { code: 'PROFILE_INCOMPLETE' }` to 403 error in `packages/nuxt-layer-api/server/services/profile.ts`
- [x] T010 [P] Add `data: { code: 'ACCESS_DENIED' }` to 403 error in `packages/nuxt-layer-api/server/utils/session-helpers.ts`
- [x] T011 [P] Add `data: { code: 'ACCESS_DENIED' }` to 403 error in `packages/nuxt-layer-api/server/utils/suppression-guard.ts`

### 400→422 migration

- [x] T012 [P] Migrate vacancy create endpoint: change `statusCode: 400` + `error.format()` to `statusCode: 422` + `{ issues: error.issues }` in `packages/nuxt-layer-api/server/api/vacancies/index.post.ts`
- [x] T013 [P] Migrate vacancy update endpoint: change `statusCode: 400` + `error.format()` to `statusCode: 422` + `{ issues: error.issues }` in `packages/nuxt-layer-api/server/api/vacancies/[id].put.ts`

**Checkpoint**: Server responses now carry structured error data. Client still uses old handler.

---

## Phase 3: Plugin Cleanup & Per-App `useApi()` Overrides

**Purpose**: Wire centralized error handler into each app; remove hardcoded handler from plugin.

### Plugin cleanup

- [x] T014 Remove hardcoded `onResponseError` handler (403→redirect) from `packages/nuxt-layer-api/app/plugins/create-api.ts` — keep only transport concerns (SSR headers, credentials, timeout, `$api` provider)

### Site app error handler

- [x] T015 Create site error handler config (callbacks: `onUnauthorized` → `clear()` + `eraseSessionData()` + `navigateTo('/login')`; `onForbidden` → route by `data.code`; `onNotification` → `showErrorToast()`) with `isRedirecting` flag in `apps/site/layers/_base/app/utils/site-error-handler.ts`
- [x] T016 Create site `useApi()` override (wraps `$api` with `onResponseError` from site error handler; preserves caller opt-out via `opts?.onResponseError`) in `apps/site/layers/_base/app/composables/useApi.ts`

### Admin app error handler

- [x] T017 Create admin error handler config (callbacks: `onUnauthorized` → `clear()` + `$reset()` + `navigateTo('/login')`; `onForbidden` → route by `data.code`; `onNotification` → `showErrorToast()`) with `isRedirecting` flag in `apps/admin/layers/_base/app/utils/admin-error-handler.ts`
- [x] T018 Create admin `useApi()` override (wraps `$api` with `onResponseError` from admin error handler; preserves caller opt-out) in `apps/admin/layers/_base/app/composables/useApi.ts`

**Checkpoint**: All `useApi()` calls now route through centralized error handler. Auth errors trigger automatic session clear + redirect. Server errors show toast.

---

## Phase 4: i18n Keys

**Purpose**: Add error message translations for toast notifications.

- [x] T019 [P] Add `errors.api.*` i18n keys (401, 403, 429, 500, 502, 503, generic — each with `title` and `description`) to `apps/site/i18n/locales/en.json`
- [x] T020 [P] Add `errors.api.*` i18n keys (same set) to `apps/admin/i18n/locales/en.json`

**Checkpoint**: Toast notifications display localized messages.

---

## Phase 5: Form Migration

**Purpose**: Migrate existing forms from unsafe `as` casts to `isApiError()` + `setErrors()` pattern.

- [x] T021 [P] Migrate `LoginForm.vue`: replace `error as { data?...; statusCode?... }` with `isApiError(error)` type guard; keep 401 as inline alert, 403 handled by centralized handler in `apps/site/layers/auth/app/components/modal/LoginForm.vue`
- [x] T022 [P] Migrate `RegisterForm.vue`: replace `error as { ... }` with `isApiError(error)` type guard; 409 stays as inline alert; add `form.setErrors(error.formErrors)` for future 422 support in `apps/site/layers/auth/app/components/modal/RegisterForm.vue`
- [x] T023 Search for any other forms using manual `statusCode` switching or unsafe `as` casts for API errors across `apps/site/` and `apps/admin/` and migrate them to the new pattern (migrated: ForgotPasswordForm.vue, reset-password.vue, llm/models.vue, llm/routing.vue, roles/item/Scenarios.vue)

**Checkpoint**: All form components use type-safe error handling. No unsafe `as` casts for API errors remain.

---

## Phase 6: Unit Tests

**Purpose**: Test shared utilities with Vitest.

- [x] T024 [P] Write unit tests for `parseValidationErrors()` — flat paths, nested paths (`['user', 'email']` → `'user.email'`), array paths (`['items', 0, 'name']` → `'items.0.name'`), empty/missing issues → `[]`, malformed data → `[]` (no throw) in `packages/nuxt-layer-api/tests/unit/utils/api-errors/validation.test.ts` (18 tests, all passing)
- [x] T025 [P] Write unit tests for `ApiError` class — construction from mock response, property access (`status`, `statusText`, `url`, `data`), `formErrors` population; and `isApiError()` type guard — true for ApiError instances, false for Error/FetchError/plain objects in `packages/nuxt-layer-api/tests/unit/utils/api-errors/api-error.test.ts` (23 tests, all passing)

**Checkpoint**: All shared utilities have passing unit tests.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and cleanup.

- [x] T026 Verify Nuxt layer resolution order: confirmed `_base` layer composable overrides `@int/api` layer composable in both apps — `@int/api` listed before `./layers/_base` in `extends` (later = higher priority)
- [x] T027 Search for remaining `statusCode === 400` checks: only match is `reset-password.vue:129` (auth token validation, not a migrated vacancy endpoint — correct as-is)
- [x] T028 Run `pnpm typecheck` (or `vue-tsc --noEmit`) from both `apps/site` and `apps/admin` — zero type errors. Fixed: TS1166 (ApiError brand via defineProperty), auto-import config for api-errors subdirectory, removed explicit `~/utils/api-errors` imports
- [ ] T029 Manual smoke test: test 401 flow (expire session → API call → verify redirect), 422 flow (submit invalid form → verify field errors), 500 flow (simulate error → verify toast)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — can start immediately
  - T001, T002, T003 can run in parallel (independent type/class/utility files)
  - T004 depends on T001, T002, T003 (uses all three)
  - T005 depends on T001–T004 (barrel export)
  - T006 depends on T002 (uses `ApiError` type)
- **Phase 2 (Server)**: No dependency on Phase 1 — can run in parallel with Phase 1
  - All T007–T013 can run in parallel (independent server files)
- **Phase 3 (Per-App Overrides)**: Depends on Phase 1 completion (uses shared utilities)
  - T014 can start after Phase 1
  - T015 depends on T004, T006
  - T016 depends on T015
  - T017 depends on T004, T006
  - T018 depends on T017
  - Site (T015–T016) and Admin (T017–T018) can run in parallel
- **Phase 4 (i18n)**: No dependency on Phases 1–3 — can run in parallel
  - T019 and T020 can run in parallel
- **Phase 5 (Form Migration)**: Depends on Phase 3 (centralized handler must be wired)
  - T021 and T022 can run in parallel
  - T023 depends on T021–T022 (same pattern applied to remaining forms)
- **Phase 6 (Tests)**: Depends on Phase 1 (tests the shared utilities)
  - T024 and T025 can run in parallel
- **Phase 7 (Polish)**: Depends on all previous phases

### Critical Path

```
Phase 1 (T001–T006) → Phase 3 (T014–T018) → Phase 5 (T021–T023) → Phase 7 (T026–T029)
                    ↘ Phase 6 (T024–T025) ↗
Phase 2 (T007–T013) ──────────────────────────────────────────────↗
Phase 4 (T019–T020) ──────────────────────────────────────────────↗
```

### Parallel Opportunities

**Maximum parallelism** (4 parallel tracks):

```
Track A: Phase 1 (shared utilities)    → Phase 3 (per-app handlers) → Phase 5 (form migration)
Track B: Phase 2 (server changes)      → (done)
Track C: Phase 4 (i18n keys)           → (done)
Track D: Phase 6 (unit tests, after Phase 1)
```

---

## Parallel Example: Phase 1 (Setup)

```bash
# Launch independent type/class/utility files together:
Task T001: "Create shared error types in packages/nuxt-layer-api/app/utils/api-errors/types.ts"
Task T002: "Create ApiError class in packages/nuxt-layer-api/app/utils/api-errors/api-error.ts"
Task T003: "Create parseValidationErrors in packages/nuxt-layer-api/app/utils/api-errors/validation.ts"

# Then sequentially:
Task T004: "Create createApiErrorHandler factory (depends on T001–T003)"
Task T005: "Create barrel re-export (depends on T001–T004)"
Task T006: "Create useApiErrorToast composable (depends on T002)"
```

## Parallel Example: Phase 2 (Server Changes)

```bash
# All server changes are independent — launch all together:
Task T007: "Add data.code to auth middleware 403s"
Task T008: "Add data.code to admin middleware 403"
Task T009: "Add data.code to profile service 403"
Task T010: "Add data.code to session-helpers 403"
Task T011: "Add data.code to suppression-guard 403"
Task T012: "Migrate vacancy create 400→422"
Task T013: "Migrate vacancy update 400→422"
```

---

## Implementation Strategy

### Sequential Execution (Single Developer)

1. Complete Phase 1 (T001–T006) — shared utilities foundation
2. Complete Phase 2 (T007–T013) — server-side changes
3. Complete Phase 4 (T019–T020) — i18n keys
4. Complete Phase 3 (T014–T018) — plugin cleanup + per-app overrides
5. Complete Phase 5 (T021–T023) — form migration
6. Complete Phase 6 (T024–T025) — unit tests
7. Complete Phase 7 (T026–T029) — polish & validation

### Incremental Validation

After each phase, validate:

- **Phase 1**: Types compile, no import errors
- **Phase 2**: Server endpoints return correct error shapes (test with curl/httpie)
- **Phase 3**: `useApi()` calls trigger toast on 500, redirect on 401
- **Phase 4**: Toast messages show localized strings
- **Phase 5**: Form field errors appear under correct fields on 422
- **Phase 6**: All unit tests pass
- **Phase 7**: Full smoke test passes

---

## Notes

- [P] tasks = different files, no dependencies
- This feature has no traditional user stories — it's cross-cutting infrastructure
- Phases map to plan.md phases A–F
- All server changes (Phase 2) are backward-compatible — existing clients won't break
- The `create-api.ts` plugin cleanup (T014) is the riskiest change — verify both apps still work after
- Commit after each phase for easy rollback
- Total: 29 tasks across 7 phases
