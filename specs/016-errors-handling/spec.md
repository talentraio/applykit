# 016 — Centralized API Error Handling

## Overview

Implement a centralized error handling layer for all client-side API requests (`useApi()`).
Currently, error handling is scattered across form components and stores with inconsistent patterns,
unsafe type casts (`error as { data?... }`), and no standardized 422 → form field error connector.

This feature introduces:

- A shared `ApiError` class and error utilities in `@int/api`
- A configurable error handler factory (`createApiErrorHandler`) in `@int/api`
- Per-app `useApi()` overrides with app-specific reactions (401, 403)
- A standardized 422 → NuxtUI `UForm.setErrors()` connector
- Toast notifications for non-form errors (429, 500, 502, 503)

Reference implementation studied: `/Users/kolobok/WebstormProjects/Warp/nuxt-monorepo/apps/customer-site/errors/`

## Goals

- **Centralize** all API error interception into a single composable per app
- **Standardize** 422 validation errors → NuxtUI `FormError[]` format for form field highlighting
- **Minimize boilerplate** when building forms: no manual try/catch + status-code switching per form
- **Handle auth errors uniformly**: 401 → session clear + redirect, 403 → contextual handling
- **Provide toast notifications** for server/infrastructure errors (500, 502, 503, 429)
- **Maintain type safety**: no `any`, no unsafe type assertions — use `FetchError` from `ofetch`
- **i18n from day 1**: all user-facing error messages through translation keys

## Clarifications

### Session 2026-02-25

- Q: How to distinguish 403 sub-cases (deleted/blocked user vs incomplete profile vs access denied)? → A: Add a `code` enum field to server 403 responses (`USER_DELETED`, `USER_BLOCKED`, `PROFILE_INCOMPLETE`, `ACCESS_DENIED`). Client error handler routes by `data.code`.
- Q: Should we parse both 400 `ZodFormattedError` and 422 `issues[]` into `FormError[]`? → A: Standardize all validation endpoints on 422 + `data.issues[]`. Migrate ~2-3 endpoints returning 400 with `error.format()` to use 422 + `issues`. One parser, one contract.
- Q: Should server 422 form errors persist until next submit or clear on first field input? → A: Use NuxtUI default behavior — errors clear on input/change/blur event per `validateOn` config. Zero custom code needed.
- Q: Should admin `useApi()` override include 422 handling or keep minimal? → A: Include full handling (422 + all codes). `createApiErrorHandler` already contains the logic — no extra code. Ready for future admin forms.

## Non-goals

- Custom 429 rate-limit UI (planned as separate feature — only toast for now)
- Global error boundary / error page routing (existing `error.vue` stays unchanged)
- Retry logic / automatic request retry on transient failures
- Offline detection / network error handling
- Error tracking / logging service integration (Sentry, etc.)

## Scope

### In scope

- Shared error utilities in `packages/nuxt-layer-api/` (package: `@int/api`)
- Per-app `useApi()` override in `apps/site/layers/_base/` and `apps/admin/layers/_base/`
- Removal of hardcoded 403 handler from `create-api.ts` plugin (moved to error handler)
- 422 validation error parser → `FormError[]` utility
- `useApiErrorToast()` composable for standard toast notifications
- i18n keys for error messages
- Migration of existing form error handling to the new pattern
- Minimal server-side change: add `code` enum field to 403 `createError()` responses for sub-case routing
- Migrate ~2-3 server endpoints from 400 + `error.format()` to 422 + `data.issues[]` for unified validation contract

### Out of scope

- Large server-side error response structure changes (only minimal `code` field added to 403 responses)
- New server endpoints
- New Pinia stores (no `useErrorStore`)
- Changes to `error.vue` page

## Roles & limits

Errors apply uniformly to all roles. Role-specific behavior:

| Role              | 401 behavior                                  | 403 behavior                                                                                                                                                                            |
| ----------------- | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `public`          | Redirect to `/login`                          | Routed by `data.code`: `USER_DELETED`/`USER_BLOCKED` → clear session + redirect `/login?error=forbidden`; `PROFILE_INCOMPLETE` → ignore (profile gate handles); `ACCESS_DENIED` → toast |
| `friend` / `user` | Clear session + redirect `/login`             | Same `data.code` routing as above                                                                                                                                                       |
| `super_admin`     | Clear session + redirect `/login` (admin app) | `USER_DELETED`/`USER_BLOCKED` → clear + redirect; `ACCESS_DENIED` → toast                                                                                                               |

No BYOK policy impact — error handling is transport-level, not LLM-specific.

## User flows

### Flow 1: Form submission with server validation error (422)

1. User fills form and submits
2. `useApi()` sends request → server returns 422 with Zod issues in `data.issues`
3. Error handler intercepts, parses issues into `FormError[]` format
4. Handler attaches parsed errors to `ApiError.formErrors` property
5. Error is thrown (re-thrown) to the caller
6. Form `onSubmit` catches error, calls `form.setErrors(error.formErrors)`
7. `UFormField` components display inline errors under corresponding fields

### Flow 2: Unauthorized request (401)

1. User's session expires while browsing
2. Any `useApi()` call returns 401
3. Error handler intercepts:
   - **Site app**: `useUserSession().clear()` → `useAuthStore().eraseSessionData()` → `navigateTo('/login')`
   - **Admin app**: `useUserSession().clear()` → `useAuthStore().$reset()` → `navigateTo('/login')`
4. Error is thrown — caller's catch block runs but redirect already in progress

### Flow 3: Server error (500/502/503)

1. API call fails with server error
2. Error handler intercepts, shows toast notification with i18n message
3. Error is thrown to caller for optional additional handling

### Flow 4: Conflict / business error (400/404/409)

1. API call returns 400, 404, or 409
2. Error handler does NOT show toast (these are domain-specific)
3. `ApiError` is thrown with parsed response data
4. Caller handles display: toast, inline message, or error page depending on context

### Flow 5: Rate limit (429)

1. API call returns 429 with `data.operation`, `data.limit`, `data.resetAt`
2. Error handler shows generic toast notification
3. Error is thrown with parsed data for optional caller-level handling
4. (Future: dedicated rate-limit UI component will replace generic toast)

## UI/pages

No new pages or layout changes. Affected UI areas:

- **All forms** using `UForm` + `UFormField`: will adopt `setErrors()` pattern for 422
- **Toast area**: standard NuxtUI toast for 429/500/502/503 errors
- **Login page**: receives redirects from 401/403 handlers

## Data model

No schema changes. The feature operates on error response structures already returned by the API.

### Server error response shapes (existing, documented for reference)

```typescript
// Standard H3 error (all error codes)
{
  statusCode: number;
  statusMessage?: string;
  message: string;
  data?: unknown;
}

// 422 with Zod issues
{
  statusCode: 422;
  statusMessage: 'Validation Error';
  data: {
    issues: Array<{
      code: string;
      path: (string | number)[];
      message: string;
    }>;
  };
}

// 429 with rate limit info
{
  statusCode: 429;
  statusMessage: 'Too Many Requests';
  message: string;
  data: {
    operation: string;
    limit: number;
    resetAt: string; // ISO timestamp
  };
}

// 403 with code enum (new — added by this feature)
{
  statusCode: 403;
  message: string;
  data: {
    code: 'USER_DELETED' | 'USER_BLOCKED' | 'PROFILE_INCOMPLETE' | 'ACCESS_DENIED';
  };
}

// 400 Bad Request (non-validation: missing fields, invalid file type, etc.)
// NOTE: Endpoints previously returning 400 with ZodFormattedError are migrated to 422 + issues[]
{
  statusCode: 400;
  message: string;
  data?: unknown;
}
```

## API surface

No new endpoints. Changes are client-side only.

### Affected client-side composables

| Composable             | Layer                                   | Change                                              |
| ---------------------- | --------------------------------------- | --------------------------------------------------- |
| `useApi()`             | `packages/nuxt-layer-api/` (`@int/api`) | Keep as base fallback (no error handler)            |
| `useApi()`             | `apps/site/layers/_base/`               | **New**: override with site-specific error handler  |
| `useApi()`             | `apps/admin/layers/_base/`              | **New**: override with admin-specific error handler |
| `create-api.ts` plugin | `packages/nuxt-layer-api/` (`@int/api`) | **Modify**: remove hardcoded 403 handler            |

### New shared utilities in `@int/api`

| Utility                         | Purpose                                                          |
| ------------------------------- | ---------------------------------------------------------------- |
| `ApiError` class                | Typed error wrapper with `status`, `data`, `formErrors`, `url`   |
| `createApiErrorHandler(config)` | Factory that builds `onResponseError` callback from app config   |
| `parseValidationErrors(error)`  | Converts 422 Zod issues → NuxtUI `FormError[]`                   |
| `isApiError(error)`             | Type guard for `ApiError`                                        |
| `useApiErrorToast()`            | Composable returning `showError(error)` that displays i18n toast |

## LLM workflows

No direct LLM changes. Existing LLM error codes (502, 503) will be handled by the new
centralized handler (toast notification) instead of ad-hoc patterns in callers.

## Limits & safety

- 401 handler includes `isRedirecting` guard to prevent concurrent redirect loops
  (preserve existing pattern from `create-api.ts`)
- Error handler runs only on client side (`import.meta.client` guard)
- `parseValidationErrors()` safely handles malformed `data.issues` (returns empty array)
- No sensitive data is exposed in toast messages — only i18n keys

## Security & privacy

- 401 handler clears session cookie via `useUserSession().clear()`
- 401 handler erases all Pinia store data (prevent stale auth state)
- Error messages never expose internal server details to the user
- `ApiError` class does NOT store request body (may contain passwords/PII)
- Redirect URLs in 401 handler are validated (same-origin only, existing `getSafeRedirect` pattern)

## i18n keys

New translation keys under `errors.api.*` namespace:

```
errors.api.401.title          = "Session expired"
errors.api.401.description    = "Please log in again"
errors.api.403.title          = "Access denied"
errors.api.403.description    = "You don't have permission to access this resource"
errors.api.429.title          = "Too many requests"
errors.api.429.description    = "Please wait and try again later"
errors.api.500.title          = "Server error"
errors.api.500.description    = "Something went wrong. Please try again later"
errors.api.502.title          = "Service error"
errors.api.502.description    = "AI service returned an unexpected response. Please try again"
errors.api.503.title          = "Service unavailable"
errors.api.503.description    = "This service is temporarily unavailable. Please try again later"
errors.api.generic.title      = "Error"
errors.api.generic.description = "An unexpected error occurred"
```

Keys added to both `apps/site` and `apps/admin` locale files.

## Monorepo/layers touchpoints

### Shared layer: `packages/nuxt-layer-api/` (package: `@int/api`)

- **Modify**: `app/plugins/create-api.ts` — remove hardcoded 403 `onResponseError`
- **Keep**: `app/composables/useApi.ts` — unchanged, serves as fallback
- **Add**: `app/utils/api-errors/api-error.ts` — `ApiError` class
- **Add**: `app/utils/api-errors/types.ts` — shared types, HTTP status code map
- **Add**: `app/utils/api-errors/validation.ts` — `parseValidationErrors()`
- **Add**: `app/utils/api-errors/create-handler.ts` — `createApiErrorHandler()` factory
- **Add**: `app/utils/api-errors/index.ts` — barrel re-export
- **Add**: `app/composables/useApiErrorToast.ts` — toast notification helper

### Server-side: `packages/nuxt-layer-api/` (package: `@int/api`) — minimal changes

- **Modify**: `server/middleware/auth.ts` — add `data: { code: 'USER_DELETED' }` and `data: { code: 'USER_BLOCKED' }` to existing 403 `createError()` calls
- **Modify**: `server/middleware/admin.ts` — add `data: { code: 'ACCESS_DENIED' }` to 403 responses
- **Modify**: `server/services/profile.ts` — add `data: { code: 'PROFILE_INCOMPLETE' }` to 403 response
- **Modify**: `server/utils/session-helpers.ts` — add `data: { code: 'ACCESS_DENIED' }` to 403 responses
- **Modify**: `server/utils/suppression-guard.ts` — add `data: { code: 'ACCESS_DENIED' }` to 403 response

### Shared utils: `packages/npm-utils/` (package: `@int/npm-utils`)

- **Keep**: `utils/h3-error.ts` — existing `isH3Error`/`toH3Error` utilities (used by callers)

### Site app: `apps/site/layers/_base/`

- **Add**: `app/composables/useApi.ts` — site-specific `useApi()` override
- **Add**: `app/utils/api-error-handler.ts` — site error handler config

### Admin app: `apps/admin/layers/_base/`

- **Add**: `app/composables/useApi.ts` — admin-specific `useApi()` override
- **Add**: `app/utils/api-error-handler.ts` — admin error handler config

### Site auth layer: `apps/site/layers/auth/`

- **Modify**: form components — replace manual try/catch error parsing with `form.setErrors()`
- **No changes** to `useAuth.ts` logout flow (it uses its own error handling for logout)

### Admin auth layer: `apps/admin/layers/auth/`

- **Modify**: login form — adopt new pattern if applicable

### i18n

- **Modify**: `apps/site/` locale files — add `errors.api.*` keys
- **Modify**: `apps/admin/` locale files — add `errors.api.*` keys

## Acceptance criteria

1. **All `useApi()` calls** in site and admin apps route through centralized error handler
2. **401 errors** clear session, erase store data, and redirect to `/login` — no stale auth state
3. **403 errors** are routed by `data.code`: `USER_DELETED`/`USER_BLOCKED` → clear session + redirect; `PROFILE_INCOMPLETE` → ignored; `ACCESS_DENIED` → toast
4. **422 errors** with `data.issues` are parsed into `FormError[]` and available on `ApiError.formErrors`
5. **Server errors (500/502/503)** show i18n toast notification automatically
6. **429 errors** show toast notification (basic — future feature will enhance)
7. **400/404/409 errors** are thrown without toast — callers handle display contextually
8. **No `any` or unsafe type assertions** in the error handling code
9. **FetchError from `ofetch`** is used for error narrowing instead of loose casts
10. **Existing form components** (LoginForm, RegisterForm, vacancy forms) migrated to use `setErrors()`
11. **i18n keys** exist for all auto-displayed error messages
12. **`create-api.ts`** plugin only handles transport concerns (SSR headers, credentials, timeout)
13. **Type guard `isApiError()`** is available and used instead of `instanceof` checks where needed

## Edge cases

- **Concurrent 401s**: Multiple API calls fail with 401 simultaneously — `isRedirecting` flag
  prevents multiple redirects. Only the first 401 triggers logout + redirect.
- **401 during logout**: If logout API call itself returns 401, it should be silently ignored
  (existing pattern in `useAuth.ts` already handles this).
- **422 with unknown path**: Zod issue with `path` not matching any `UFormField` `name` —
  error is kept in `formErrors` array but not displayed inline. Caller can show as generic toast.
- **422 with nested paths**: Zod issue with `path: ['addresses', 0, 'city']` → converted to
  dot-notation `'addresses.0.city'` matching NuxtUI nested form field resolution.
- **422 with empty issues**: Server returns 422 but `data.issues` is missing or empty —
  `parseValidationErrors()` returns empty array, error thrown with generic message.
- **Network error (no response)**: Not an HTTP error — not intercepted by `onResponseError`.
  These are handled by `ofetch` as `FetchError` without `response`. Current behavior unchanged.
- **SSR error handling**: `onResponseError` runs on server during SSR `useAsyncData` calls.
  Error handler must guard client-only operations (toast, navigateTo) with `import.meta.client`.
- **Custom `onResponseError` in caller opts**: If a caller passes its own `onResponseError`
  in `useApi()` opts, the app-level handler is overridden by `ofetch` spread. This is intentional —
  allows opt-out per call.
- **HMR / dev mode**: `isRedirecting` flag must reset properly during HMR to avoid stuck state.

## Testing plan

### Unit tests

- `parseValidationErrors()`: various Zod issue shapes → `FormError[]` output
  - Standard flat path: `['email']` → `{ name: 'email', message: '...' }`
  - Nested path: `['user', 'email']` → `{ name: 'user.email', message: '...' }`
  - Array path: `['items', 0, 'name']` → `{ name: 'items.0.name', message: '...' }`
  - Empty/missing issues → empty array
  - Malformed data → empty array (no throw)
- `ApiError` class: construction from `FetchResponse`, property access
- `isApiError()` type guard

### Integration tests (manual or E2E)

- 401 flow: expire session → API call → verify redirect to `/login` and store cleared
- 422 flow: submit form with invalid data → verify field errors displayed under correct fields
- 500 flow: simulate server error → verify toast appears with correct i18n message
- 403 flow: access denied resource → verify appropriate handling per app
- Concurrent 401s: multiple rapid API failures → verify single redirect, no loops

## Open questions / NEEDS CLARIFICATION

All questions resolved — see [Clarifications](#clarifications) section.
