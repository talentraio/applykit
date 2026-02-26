# Implementation Plan: 016 — Centralized API Error Handling

**Branch**: `feature/016-errors-handling` | **Date**: 2026-02-25 | **Spec**: `specs/016-errors-handling/spec.md`
**Input**: Feature specification from `/specs/016-errors-handling/spec.md`

## Summary

Implement a centralized error handling layer for all client-side `useApi()` calls. The approach:
shared error utilities (ApiError class, validation parser, toast composable, handler factory) in
`@int/api`, per-app `useApi()` overrides with app-specific 401/403 behavior, minimal server-side
changes (403 code enum, 400→422 migration for 2 endpoints).

## Technical Context

**Language/Version**: TypeScript 5.7 (Nuxt 4 / Node.js 20 LTS)
**Primary Dependencies**: Nuxt 4, NuxtUI v4 (UForm/UFormField/useToast), ofetch (FetchError), Pinia, nuxt-auth-utils
**Storage**: N/A (no data model changes)
**Testing**: Vitest (unit tests for parseValidationErrors, ApiError, isApiError)
**Target Platform**: Web (SSR + CSR via Nuxt)
**Project Type**: Monorepo (pnpm workspaces, Nuxt layers)
**Performance Goals**: N/A (error handling is not on hot path)
**Constraints**: No `any` or unsafe type assertions; i18n for all user-facing strings
**Scale/Scope**: ~15 files modified/added across 4 layers + server

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                    | Status  | Notes                                                                                        |
| ---------------------------- | ------- | -------------------------------------------------------------------------------------------- |
| I. Documentation Is Binding  | ✅ PASS | `docs/codestyle/base.md` and `docs/codestyle/api-fetching.md` read and followed              |
| II. Nuxt Stack Invariants    | ✅ PASS | NuxtUI v4 `UForm.setErrors()` and `useToast()` used; VueUse checked — no relevant composable |
| III. Schema-First Contracts  | ✅ PASS | Error types defined in `@int/api`; no generics on `$fetch`; Zod issues reused from server    |
| IV. Store/Action Data Flow   | ✅ PASS | Error handler calls store actions (`eraseSessionData`/`$reset`); no ad-hoc fetch logic       |
| V. i18n and SSR Requirements | ✅ PASS | All toast messages use i18n keys; `import.meta.client` guard for client-only operations      |
| Additional: No `any`         | ✅ PASS | `FetchError` from `ofetch` used for narrowing; `isApiError()` type guard provided            |

## Project Structure

### Documentation (this feature)

```text
specs/016-errors-handling/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (error response types)
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (no new API endpoints — client-only contracts)
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
packages/nuxt-layer-api/ (@int/api)
├── app/
│   ├── plugins/create-api.ts                    # MODIFY: remove hardcoded 403 handler
│   ├── composables/
│   │   ├── useApi.ts                            # KEEP: base fallback (unchanged)
│   │   └── useApiErrorToast.ts                  # ADD: toast notification composable
│   └── utils/api-errors/
│       ├── index.ts                             # ADD: barrel re-export
│       ├── api-error.ts                         # ADD: ApiError class
│       ├── types.ts                             # ADD: shared types, ForbiddenCode enum
│       ├── validation.ts                        # ADD: parseValidationErrors()
│       └── create-handler.ts                    # ADD: createApiErrorHandler() factory
├── server/
│   ├── middleware/auth.ts                        # MODIFY: add data.code to 403
│   ├── middleware/admin.ts                       # MODIFY: add data.code to 403
│   ├── services/profile.ts                      # MODIFY: add data.code to 403
│   ├── utils/session-helpers.ts                  # MODIFY: add data.code to 403
│   ├── utils/suppression-guard.ts                # MODIFY: add data.code to 403
│   ├── api/vacancies/index.post.ts               # MODIFY: 400→422 migration
│   └── api/vacancies/[id].put.ts                 # MODIFY: 400→422 migration

apps/site/
├── layers/_base/app/
│   ├── composables/useApi.ts                     # ADD: site-specific override
│   └── utils/site-error-handler.ts               # ADD: site error handler config
├── layers/auth/app/components/modal/
│   ├── LoginForm.vue                             # MODIFY: adopt setErrors() pattern
│   └── RegisterForm.vue                          # MODIFY: adopt setErrors() pattern
└── i18n/locales/en.json                          # MODIFY: add errors.api.* keys

apps/admin/
├── layers/_base/app/
│   ├── composables/useApi.ts                     # ADD: admin-specific override
│   └── utils/admin-error-handler.ts              # ADD: admin error handler config
└── i18n/locales/en.json                          # MODIFY: add errors.api.* keys
```

**Structure Decision**: Monorepo with Nuxt layers. Shared utilities in `@int/api` layer, per-app
overrides in `_base` layers. No new packages or layers created.

## Implementation Phases

### Phase A: Shared Error Utilities (`@int/api`)

**Goal**: Build the reusable error handling foundation.

1. **`api-errors/types.ts`** — Define types:
   - `ForbiddenCode` union: `'USER_DELETED' | 'USER_BLOCKED' | 'PROFILE_INCOMPLETE' | 'ACCESS_DENIED'`
   - `ApiErrorHandlerConfig` interface with callbacks: `onUnauthorized`, `onForbidden`, `onNotification`
   - `ValidationIssue` type matching Zod issue shape
   - Re-export `FormError` from `@nuxt/ui`

2. **`api-errors/api-error.ts`** — `ApiError` class:
   - Extends `Error`
   - Properties: `status`, `statusText`, `url`, `data`, `formErrors` (readonly `FormError[]`)
   - Constructor accepts `FetchResponse` — no request body stored (PII safety)
   - `isApiError()` type guard exported alongside

3. **`api-errors/validation.ts`** — `parseValidationErrors()`:
   - Input: `unknown` (error response data)
   - Output: `FormError[]` (NuxtUI format: `{ name: string, message: string }`)
   - Converts Zod issue paths to dot-notation: `['a', 0, 'b']` → `'a.0.b'`
   - Graceful: returns `[]` on malformed/missing data

4. **`api-errors/create-handler.ts`** — `createApiErrorHandler(config)`:
   - Returns `onResponseError` callback for `$fetch.create()`
   - `import.meta.client` guard — skip on SSR
   - Status code routing:
     - 401 → `config.onUnauthorized(error)`
     - 403 → `config.onForbidden(error)` (receives parsed `data.code`)
     - 422 → parse validation errors → attach to `ApiError.formErrors`
     - 429, 500, 502, 503 → `config.onNotification(error)`
     - 400, 404, 409 → no side effects
   - Always throws `ApiError`

5. **`useApiErrorToast.ts`** composable:
   - Uses `useToast()` from NuxtUI + `useI18n()`
   - `showErrorToast(error: ApiError)`: resolves i18n key `errors.api.{status}.title/description`
   - Fallback to `errors.api.generic.*` for unknown codes

6. **`api-errors/index.ts`** — barrel re-export all public API

### Phase B: Server-Side Minimal Changes

**Goal**: Add 403 code enum and migrate 400→422 for 2 endpoints.

1. **403 code enum** — Add `data: { code: '...' }` to all existing `createError({ statusCode: 403 })`:
   - `server/middleware/auth.ts`: `USER_DELETED`, `USER_BLOCKED`
   - `server/middleware/admin.ts`: `ACCESS_DENIED`
   - `server/services/profile.ts`: `PROFILE_INCOMPLETE`
   - `server/utils/session-helpers.ts`: `ACCESS_DENIED`
   - `server/utils/suppression-guard.ts`: `ACCESS_DENIED`

2. **400→422 migration** — 2 vacancy endpoints:
   - `server/api/vacancies/index.post.ts`: `statusCode: 400` → `422`, `data: error.format()` → `{ issues: error.issues }`
   - `server/api/vacancies/[id].put.ts`: same pattern

### Phase C: Per-App `useApi()` Overrides

**Goal**: Wire error handler into each app's API transport.

1. **`create-api.ts` cleanup** — Remove hardcoded 403 handler from plugin; keep only transport
   (SSR headers, credentials, timeout, `isRedirecting` guard moves to error handler)

2. **Site `useApi()`** — `apps/site/layers/_base/app/composables/useApi.ts`:
   - Uses `createApiErrorHandler` with site-specific callbacks:
     - `onUnauthorized`: `clear()` → `eraseSessionData()` → `navigateTo('/login')`
     - `onForbidden`: route by `data.code` (USER_DELETED/BLOCKED → clear + redirect; PROFILE_INCOMPLETE → ignore; ACCESS_DENIED → toast)
     - `onNotification`: `showErrorToast(error)`
   - `isRedirecting` flag for concurrent 401 protection

3. **Admin `useApi()`** — `apps/admin/layers/_base/app/composables/useApi.ts`:
   - Same factory, admin-specific callbacks:
     - `onUnauthorized`: `clear()` → `$reset()` → `navigateTo('/login')`
     - `onForbidden`: USER_DELETED/BLOCKED → clear + redirect; ACCESS_DENIED → toast
     - `onNotification`: `showErrorToast(error)`

### Phase D: i18n Keys

**Goal**: Add error message translations.

1. **Site** — `apps/site/i18n/locales/en.json`: add `errors.api.*` keys
2. **Admin** — `apps/admin/i18n/locales/en.json`: add `errors.api.*` keys

### Phase E: Form Migration

**Goal**: Migrate existing forms to use `setErrors()` pattern.

1. **LoginForm.vue** — Replace manual `statusCode` switch with:

   ```
   catch (error) {
     if (isApiError(error) && error.formErrors.length) {
       form.value?.setErrors(error.formErrors);
     } else if (isApiError(error)) {
       errorMessage.value = error.statusCode === 401
         ? t('auth.modal.login.invalidCredentials')
         : error.data?.message ?? t('errors.api.generic.title');
     }
   }
   ```

2. **RegisterForm.vue** — Similar migration; 409 (email exists) stays as inline alert (not field error)

3. **Vacancy forms** — If any use manual error parsing, migrate to `setErrors()`

### Phase F: Unit Tests

**Goal**: Test shared utilities.

1. `parseValidationErrors()` — flat/nested/array paths, empty/malformed input
2. `ApiError` — construction, property access, `formErrors` population
3. `isApiError()` — true/false cases

## Risk Assessment

| Risk                                             | Impact | Mitigation                                                                    |
| ------------------------------------------------ | ------ | ----------------------------------------------------------------------------- |
| `useApi()` override not picked up by auto-import | High   | Verify Nuxt layer resolution order; `_base` layer registered after `@int/api` |
| Concurrent 401 redirect loop                     | Medium | `isRedirecting` flag with `finally` reset; test manually                      |
| SSR error handler runs toast/navigateTo          | Medium | `import.meta.client` guard in `createApiErrorHandler`                         |
| 400→422 migration breaks existing callers        | Low    | Only 2 endpoints; search for all callers and update                           |
| FormError type import from `@nuxt/ui`            | Low    | Verify export path via NuxtUI MCP docs                                        |
