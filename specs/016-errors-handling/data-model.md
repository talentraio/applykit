# Data Model: 016 — Centralized API Error Handling

**Date**: 2026-02-25 | **Spec**: `specs/016-errors-handling/spec.md`

## Overview

No database schema changes. This feature operates entirely on HTTP error response structures
and client-side TypeScript types. All entities below are TypeScript interfaces/classes,
not persisted models.

## Client-Side Types

### `ForbiddenCode` (union type)

Enumerates all 403 sub-case codes returned by server middleware/utilities.

```typescript
type ForbiddenCode = 'USER_DELETED' | 'USER_BLOCKED' | 'PROFILE_INCOMPLETE' | 'ACCESS_DENIED';
```

**Source**: `packages/nuxt-layer-api/app/utils/api-errors/types.ts`
**Used by**: `createApiErrorHandler` to route 403 responses to app-specific callbacks.

### `FormError` (interface)

Compatible with NuxtUI v4 `FormError<string>` shape. Defined locally to avoid hard dependency on `@nuxt/ui` in `@int/api` layer.

```typescript
interface FormError {
  name: string; // dot-notation field path, e.g. 'email', 'addresses.0.city'
  message: string; // human-readable validation message
}
```

**Source**: `packages/nuxt-layer-api/app/utils/api-errors/types.ts`
**Used by**: `parseValidationErrors()`, `ApiError.formErrors`, `UForm.setErrors()`.

### `ApiError` (class)

Typed error wrapper thrown by the centralized error handler for all non-2xx API responses.

```typescript
class ApiError extends Error {
  readonly status: number;
  readonly statusText: string;
  readonly url: string;
  readonly data: unknown;
  readonly formErrors: FormError[];
}
```

| Property     | Type          | Description                                                       |
| ------------ | ------------- | ----------------------------------------------------------------- |
| `status`     | `number`      | HTTP status code (e.g. 401, 403, 422, 500)                        |
| `statusText` | `string`      | HTTP status text (e.g. "Forbidden", "Unprocessable Entity")       |
| `url`        | `string`      | Request URL (for debugging; no PII — request body NOT stored)     |
| `data`       | `unknown`     | Parsed response body (`response._data`); shape varies by status   |
| `formErrors` | `FormError[]` | Parsed validation errors for 422 responses; empty array otherwise |

**Source**: `packages/nuxt-layer-api/app/utils/api-errors/api-error.ts`
**Construction**: From `FetchError.response` in `onResponseError` interceptor.

### `ApiErrorHandlerConfig` (interface)

Configuration object for the `createApiErrorHandler()` factory.

```typescript
interface ApiErrorHandlerConfig {
  onUnauthorized: (error: ApiError) => void | Promise<void>;
  onForbidden: (error: ApiError, code: ForbiddenCode) => void | Promise<void>;
  onNotification: (error: ApiError) => void;
}
```

| Callback         | Trigger            | Purpose                                            |
| ---------------- | ------------------ | -------------------------------------------------- |
| `onUnauthorized` | 401                | Clear session, erase store data, redirect to login |
| `onForbidden`    | 403                | Route by `data.code`: clear+redirect or toast      |
| `onNotification` | 429, 500, 502, 503 | Show toast notification                            |

**Source**: `packages/nuxt-layer-api/app/utils/api-errors/types.ts`

## Server-Side Response Shapes (existing, modified)

### 403 Response (modified — `data.code` added)

```typescript
// BEFORE (current):
{
  statusCode: 403;
  message: string;
}

// AFTER (this feature):
{
  statusCode: 403;
  message: string;
  data: {
    code: ForbiddenCode;
  }
}
```

**Affected files**: 6 locations in `packages/nuxt-layer-api/server/` (see research.md R5).

### 422 Response (standardized)

```typescript
{
  statusCode: 422;
  statusMessage: 'Validation Error';
  data: {
    issues: Array<{
      code: string; // Zod issue code
      path: (string | number)[]; // field path
      message: string; // validation message
    }>;
  }
}
```

**Affected files**: 2 vacancy endpoints migrated from 400 → 422 (see research.md R6).

### Unchanged response shapes (reference)

- **401**: Standard H3 error, no `data` field
- **400**: Business logic errors (not validation), no structural change
- **404**: Standard H3 error
- **409**: Conflict (e.g. email exists), no structural change
- **429**: `data: { operation, limit, resetAt }` — already structured, no change
- **500/502/503**: Standard H3 error — no change

## Entity Relationships

```
FetchError (ofetch)
  └── caught by onResponseError interceptor
        └── creates ApiError
              ├── status → determines handler routing
              ├── data → parsed for ForbiddenCode (403) or issues (422)
              └── formErrors → parsed by parseValidationErrors() for 422
                    └── consumed by UForm.setErrors()
```

## Validation Rules

| Rule                                                      | Enforced by                     |
| --------------------------------------------------------- | ------------------------------- |
| `ForbiddenCode` must be one of 4 values                   | TypeScript union type           |
| `FormError.name` uses dot-notation for nested paths       | `parseValidationErrors()`       |
| `ApiError` never stores request body                      | Constructor design (PII safety) |
| `parseValidationErrors()` returns `[]` on malformed input | Defensive parsing (no throw)    |
| `onResponseError` only runs client-side side effects      | `import.meta.client` guard      |

## State Transitions

No state machines. The only stateful element is the `isRedirecting` flag:

```
false → true (on first 401/403 requiring redirect)
true → false (in finally block after navigateTo completes or errors)
```

This prevents concurrent redirect loops when multiple API calls fail simultaneously.
