# Quickstart: 016 — Centralized API Error Handling

**Date**: 2026-02-25 | **Branch**: `feature/016-errors-handling`

## What this feature does

Adds a centralized error handling layer for all `useApi()` calls. Instead of each form component
manually catching errors and switching on status codes, a shared error handler intercepts all
non-2xx responses and:

- **401** → clears session + redirects to login
- **403** → routes by sub-case code (deleted/blocked user, access denied, etc.)
- **422** → parses Zod validation errors into `FormError[]` for `UForm.setErrors()`
- **429/500/502/503** → shows i18n toast notification
- **400/404/409** → throws `ApiError` silently (caller handles contextually)

## Key files

### Shared utilities (`packages/nuxt-layer-api/` / `@int/api`)

```
app/utils/api-errors/
├── types.ts           # ForbiddenCode, FormError, ApiErrorHandlerConfig
├── api-error.ts       # ApiError class + isApiError() type guard
├── validation.ts      # parseValidationErrors()
├── create-handler.ts  # createApiErrorHandler() factory
└── index.ts           # barrel re-export

app/composables/
└── useApiErrorToast.ts  # toast notification composable
```

### Per-app overrides

```
apps/site/layers/_base/app/
├── composables/useApi.ts          # site useApi() with error handler
└── utils/site-error-handler.ts    # site-specific callbacks

apps/admin/layers/_base/app/
├── composables/useApi.ts          # admin useApi() with error handler
└── utils/admin-error-handler.ts   # admin-specific callbacks
```

## How it works

### 1. Error handler factory (shared)

```typescript
// packages/nuxt-layer-api/app/utils/api-errors/create-handler.ts

export function createApiErrorHandler(config: ApiErrorHandlerConfig) {
  return async ({ response }: { response: Response }) => {
    const apiError = new ApiError(response);

    if (import.meta.client) {
      switch (response.status) {
        case 401:
          await config.onUnauthorized(apiError);
          break;
        case 403:
          await config.onForbidden(apiError, parseForbiddenCode(response));
          break;
        case 422:
          apiError.formErrors = parseValidationErrors(response._data);
          break;
        case 429:
        case 500:
        case 502:
        case 503:
          config.onNotification(apiError);
          break;
      }
    }

    throw apiError; // Always throw — caller's catch block runs
  };
}
```

### 2. Per-app `useApi()` override (example: site)

```typescript
// apps/site/layers/_base/app/composables/useApi.ts

export const useApi: (typeof import('@int/api'))['useApi'] = async (request, opts) => {
  const nuxtApp = useNuxtApp();
  const handler = useSiteErrorHandler(); // creates handler once

  return await nuxtApp.$api(request, {
    ...opts,
    onResponseError: opts?.onResponseError ?? handler
  });
};
```

### 3. Form usage (after migration)

```typescript
// In a form component:
const form = useTemplateRef('form');

try {
  await useApi('/api/vacancies', { method: 'POST', body: formState });
} catch (error) {
  if (isApiError(error) && error.formErrors.length) {
    form.value?.setErrors(error.formErrors); // ← field-level errors
  } else if (isApiError(error)) {
    errorMessage.value = error.data?.message ?? t('errors.api.generic.title');
  }
}
```

## Testing

```bash
# Run unit tests for shared utilities
pnpm --filter @int/api test -- --run api-errors

# Files tested:
# - parseValidationErrors() — flat/nested/array paths, empty/malformed input
# - ApiError — construction, property access, formErrors population
# - isApiError() — true/false cases
```

## i18n keys

New keys under `errors.api.*` in both site and admin locale files:

| Key                              | Value                                                           |
| -------------------------------- | --------------------------------------------------------------- |
| `errors.api.401.title`           | Session expired                                                 |
| `errors.api.401.description`     | Please log in again                                             |
| `errors.api.403.title`           | Access denied                                                   |
| `errors.api.403.description`     | You don't have permission to access this resource               |
| `errors.api.429.title`           | Too many requests                                               |
| `errors.api.429.description`     | Please wait and try again later                                 |
| `errors.api.500.title`           | Server error                                                    |
| `errors.api.500.description`     | Something went wrong. Please try again later                    |
| `errors.api.502.title`           | Service error                                                   |
| `errors.api.502.description`     | AI service returned an unexpected response. Please try again    |
| `errors.api.503.title`           | Service unavailable                                             |
| `errors.api.503.description`     | This service is temporarily unavailable. Please try again later |
| `errors.api.generic.title`       | Error                                                           |
| `errors.api.generic.description` | An unexpected error occurred                                    |

## Migration checklist

- [ ] `create-api.ts` plugin: remove `onResponseError` handler (moved to per-app useApi)
- [ ] Server middleware: add `data: { code }` to 403 responses
- [ ] Vacancy endpoints: 400 → 422 with `{ issues: error.issues }`
- [ ] LoginForm.vue: replace unsafe `as` cast with `isApiError()` type guard
- [ ] RegisterForm.vue: replace unsafe `as` cast with `isApiError()` type guard
- [ ] Locale files: add `errors.api.*` keys
