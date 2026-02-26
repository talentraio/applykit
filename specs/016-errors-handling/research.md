# Research: 016 — Centralized API Error Handling

**Date**: 2026-02-25 | **Spec**: `specs/016-errors-handling/spec.md` | **Plan**: `specs/016-errors-handling/plan.md`

## R1: NuxtUI v4 `UForm.setErrors()` API

**Decision**: Use `UForm` exposed `setErrors(errors: FormError[], name?: keyof T | RegExp)` method.

**Rationale**: NuxtUI v4 has a built-in server-side error injection mechanism:

- `setErrors(errors)` — overrides all form errors with the provided array
- `getErrors(path?)` — retrieves errors for a specific field or all
- `clear(path?)` — clears errors for a specific field or all
- Errors auto-clear on input/change/blur events per `validateOn` config (default: `['blur', 'change', 'input']`)

**Type**: `FormError<string>` = `{ name: string, message: string }` (exported from `@nuxt/ui`).

**Access pattern**:

```typescript
const form = useTemplateRef('form');
// After catching API error:
form.value?.setErrors(error.formErrors);
```

**Alternatives considered**:

- Manual error state management (reactive `errors` ref + `UFormField` error prop) — more boilerplate, reimplements built-in functionality
- Warp pattern (error store + page-level error display) — doesn't support field-level errors

## R2: `ofetch` `FetchError` type for error narrowing

**Decision**: Use `FetchError` from `ofetch` for type-safe error narrowing in `onResponseError`.

**Rationale**: `ofetch` (used internally by Nuxt's `$fetch`) provides `FetchError` class with typed properties:

- `response` — the `Response` object with `status`, `statusText`, `url`, `_data`
- `data` — shortcut to `response._data`
- `request` — the original request info
- No need for `error as { statusCode?: number }` unsafe casts

**Import**: `import { FetchError } from 'ofetch'`

**Alternatives considered**:

- Untyped `error as { data?: { ... } }` — current pattern in LoginForm/RegisterForm, violates no-`any` rule
- Custom error class only — would lose native `ofetch` error chain

## R3: `$fetch.create()` `onResponseError` interceptor

**Decision**: Use `onResponseError` in `$fetch.create()` as the centralized interception point.

**Rationale**: This is the existing pattern in `create-api.ts` plugin. The interceptor receives:

```typescript
onResponseError({ request, response, options });
```

- `response.status` — HTTP status code
- `response._data` — parsed response body
- Runs for every non-2xx response on all `useApi()` calls
- Can throw a new error (our `ApiError`) to replace the original `FetchError`

**Key insight**: If the caller also passes `onResponseError` in their `useApi()` opts, ofetch's behavior is that the caller's handler **replaces** the default — it does NOT chain. This is intentional: allows per-call opt-out.

**Alternatives considered**:

- Nuxt `app:error` hook — too late, no access to response data, not suitable for form error extraction
- Vue `onErrorCaptured` — component-level, misses store/composable calls

## R4: Nuxt layer composable resolution order

**Decision**: App-level `useApi()` in `apps/*/layers/_base/app/composables/` overrides `@int/api` layer `useApi()`.

**Rationale**: Nuxt 4 resolves auto-imported composables in layer order, with later layers winning. Since apps `extends` their layers after `@int/api`, the app's `_base` layer composable takes precedence. The `@int/api` version becomes a fallback for any consumer that doesn't override.

**Verification needed at implementation**: Confirm `_base` layer is registered AFTER `@int/api` in each app's `nuxt.config.ts` extends list.

**Alternatives considered**:

- Plugin-level handler (current approach) — no per-app customization, harder to test
- Pinia plugin middleware — wrong abstraction level, adds store dependency to transport

## R5: Server 403 response codes audit

**Decision**: Add `data: { code: ForbiddenCode }` to all 403 `createError()` calls.

**Findings** — all 403 locations in `packages/nuxt-layer-api/server/`:

| File                               | Current message                    | Assigned code        |
| ---------------------------------- | ---------------------------------- | -------------------- |
| `middleware/auth.ts:59-62`         | "User is deleted"                  | `USER_DELETED`       |
| `middleware/auth.ts:65-68`         | "User is blocked"                  | `USER_BLOCKED`       |
| `middleware/admin.ts:43-47`        | "Super admin access required"      | `ACCESS_DENIED`      |
| `services/profile.ts:17-20`        | "Profile is incomplete..."         | `PROFILE_INCOMPLETE` |
| `utils/session-helpers.ts:41-45`   | "Access denied. Super admin..."    | `ACCESS_DENIED`      |
| `utils/suppression-guard.ts:13-16` | "This account can't be created..." | `ACCESS_DENIED`      |

**Additional 403s NOT requiring code** (auth flow, handled before error handler):

- `routes/auth/google.ts` (2 occurrences) — OAuth flow errors, redirected by auth handler
- `routes/auth/linkedin.ts` (2 occurrences) — OAuth flow errors, redirected by auth handler
- `api/auth/register.post.ts` (2 occurrences) — registration blocked/suppressed
- `api/auth/login.post.ts` — account blocked during login
- `api/auth/me.get.ts` (2 occurrences) — deleted/blocked user check
- Various vacancy endpoints — ownership/profile checks

**Strategy**: Phase B of implementation adds `data.code` only to the 6 middleware/utility locations listed above. Endpoint-specific 403s (auth routes, vacancy routes) keep their existing behavior — the client error handler's `onForbidden` callback handles unknown codes gracefully as `ACCESS_DENIED` fallback.

## R6: 400→422 migration audit

**Decision**: Migrate 2 vacancy endpoints from `statusCode: 400` + `error.format()` to `statusCode: 422` + `{ issues: error.issues }`.

**Endpoints**:

1. **`server/api/vacancies/index.post.ts` (line 30-34)**:

   ```typescript
   // BEFORE:
   throw createError({
     statusCode: 400,
     message: 'Invalid vacancy data',
     data: validationResult.error.format()
   });
   // AFTER:
   throw createError({
     statusCode: 422,
     statusMessage: 'Validation Error',
     data: { issues: validationResult.error.issues }
   });
   ```

2. **`server/api/vacancies/[id].put.ts` (line 62-67)**:
   ```typescript
   // Same pattern as above
   ```

**Note**: The `[id].put.ts` endpoint also has non-validation 400 errors (lines 76-79, 82-85) for status transition violations. These stay as 400 — they are business logic errors, not schema validation.

**Client callers**: Search for any client code that checks `statusCode === 400` on these endpoints and update to `422`.

## R7: Current form error handling patterns (to be migrated)

**Decision**: Migrate LoginForm and RegisterForm to use `ApiError` + `setErrors()` pattern.

**Current patterns** (both use unsafe `as` casts):

### LoginForm.vue (line 158-169):

```typescript
catch (error: unknown) {
  const fetchError = error as { data?: { message?: string }; statusCode?: number }; // ← unsafe cast
  if (fetchError.statusCode === 401) {
    errorMessage.value = t('auth.modal.login.invalidCredentials');
  } else if (fetchError.statusCode === 403) {
    errorMessage.value = t('auth.modal.login.accountBlocked');
  } else {
    errorMessage.value = fetchError.data?.message ?? t('auth.modal.login.error');
  }
}
```

### RegisterForm.vue (line 208-214):

```typescript
catch (error: unknown) {
  const fetchError = error as { data?: { message?: string }; statusCode?: number }; // ← unsafe cast
  if (fetchError.statusCode === 409) {
    errorMessage.value = t('auth.modal.register.emailExists');
  } else {
    errorMessage.value = fetchError.data?.message ?? t('auth.modal.register.error');
  }
}
```

**Migration plan**:

- Replace `as { ... }` with `isApiError(error)` type guard
- Login: 401 stays as inline alert (credentials error), 403 handled by centralized handler (won't reach catch), rest uses `errorMessage` fallback
- Register: 409 (email exists) stays as inline alert, 422 uses `form.setErrors(error.formErrors)` if server adds Zod validation

## R8: `isRedirecting` concurrent 401 protection

**Decision**: Move `isRedirecting` flag from `create-api.ts` plugin scope to per-app error handler scope.

**Rationale**: Current pattern works but is in the wrong location (plugin handles only 403). The new location is the app-level `useApi()` composable or handler config file. The flag must be:

- Module-scope `let` (not reactive) — shared across all `useApi()` calls
- Reset in `finally` block to handle errors during redirect
- Checked before any session clear or navigation

**Alternative considered**: `useState('isRedirecting')` — adds unnecessary SSR state serialization overhead for a client-only flag.

## R9: i18n key structure for error messages

**Decision**: Use `errors.api.{statusCode}.title` / `errors.api.{statusCode}.description` pattern.

**Existing structure** in `apps/site/i18n/locales/en.json`:

```json
{
  "errors": {
    "generic": { "title": "...", "description": "..." },
    "notFound": { "title": "...", "description": "...", "pathLabel": "..." },
    "actions": { "home": "...", "back": "...", "retry": "..." }
  }
}
```

**New keys** (added under `errors.api.*`):

```json
{
  "errors": {
    "api": {
      "401": { "title": "Session expired", "description": "Please log in again" },
      "403": {
        "title": "Access denied",
        "description": "You don't have permission to access this resource"
      },
      "429": { "title": "Too many requests", "description": "Please wait and try again later" },
      "500": {
        "title": "Server error",
        "description": "Something went wrong. Please try again later"
      },
      "502": {
        "title": "Service error",
        "description": "AI service returned an unexpected response. Please try again"
      },
      "503": {
        "title": "Service unavailable",
        "description": "This service is temporarily unavailable. Please try again later"
      },
      "generic": { "title": "Error", "description": "An unexpected error occurred" }
    }
  }
}
```

**Same keys** added to both `apps/site/i18n/locales/en.json` and `apps/admin/i18n/locales/en.json`.

## R10: `FormError` type import path

**Decision**: Import `FormError` from `#ui/types` (Nuxt UI v4 auto-import alias) or define a compatible type locally.

**Rationale**: NuxtUI v4 exports `FormError<T extends string = string>` as `{ name: T, message: string }`. Since our error utilities live in `@int/api` layer (which may not directly depend on `@nuxt/ui`), we have two options:

1. Import from `#ui/types` — requires `@nuxt/ui` to be in the layer's dependencies
2. Define a compatible `FormError` type locally in `api-errors/types.ts` — no extra dependency

**Chosen**: Option 2 — define locally as `{ name: string; message: string }`. This is a simple 2-field interface; no coupling needed. NuxtUI accepts any object matching this shape.

## Summary of NEEDS CLARIFICATION resolved

All technical unknowns from the plan have been resolved through code audit and NuxtUI docs research. No blocking questions remain.
