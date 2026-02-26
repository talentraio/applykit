/**
 * Contract: Client-side API error handling types
 *
 * Feature: 016-errors-handling
 * Layer: packages/nuxt-layer-api/ (@int/api)
 *
 * These types define the public API of the error handling utilities.
 * No new REST endpoints — all contracts are client-side TypeScript interfaces.
 */

// ---------------------------------------------------------------------------
// 1. ForbiddenCode — 403 sub-case routing
// ---------------------------------------------------------------------------

/**
 * Enum of 403 sub-case codes returned by server middleware.
 * Client error handler routes by this code to determine app-specific behavior.
 */
export type ForbiddenCode =
  | 'USER_DELETED'
  | 'USER_BLOCKED'
  | 'PROFILE_INCOMPLETE'
  | 'ACCESS_DENIED';

// ---------------------------------------------------------------------------
// 2. FormError — NuxtUI-compatible validation error
// ---------------------------------------------------------------------------

/**
 * Compatible with NuxtUI v4 `FormError<string>`.
 * Defined locally to avoid hard dependency on `@nuxt/ui` in `@int/api` layer.
 */
export type FormError = {
  /** Dot-notation field path matching UFormField `name` prop. e.g. 'email', 'addresses.0.city' */
  name: string;
  /** Human-readable validation message from server (Zod issue message) */
  message: string;
};

// ---------------------------------------------------------------------------
// 3. ApiError — typed error class
// ---------------------------------------------------------------------------

/**
 * Typed error wrapper thrown by the centralized error handler.
 * Replaces raw `FetchError` for all non-2xx API responses.
 */
export declare class ApiError extends Error {
  /** HTTP status code */
  readonly status: number;
  /** HTTP status text */
  readonly statusText: string;
  /** Request URL (no PII — request body is NOT stored) */
  readonly url: string;
  /** Parsed response body (shape varies by status code) */
  readonly data: unknown;
  /** Parsed validation errors for 422 responses; empty array for other statuses */
  readonly formErrors: FormError[];
}

/**
 * Type guard: checks if an unknown error is an ApiError instance.
 * Preferred over `instanceof` for cross-module safety.
 */
export declare function isApiError(error: unknown): error is ApiError;

// ---------------------------------------------------------------------------
// 4. ApiErrorHandlerConfig — factory configuration
// ---------------------------------------------------------------------------

/**
 * Configuration object for `createApiErrorHandler()`.
 * Each app provides its own callbacks for auth/notification behavior.
 */
export type ApiErrorHandlerConfig = {
  /**
   * Called on 401 Unauthorized.
   * Expected: clear session → erase store data → redirect to /login.
   */
  onUnauthorized: (error: ApiError) => void | Promise<void>;

  /**
   * Called on 403 Forbidden.
   * Receives the parsed `data.code` for sub-case routing.
   * Expected: route by code (USER_DELETED → redirect, ACCESS_DENIED → toast, etc.)
   */
  onForbidden: (error: ApiError, code: ForbiddenCode) => void | Promise<void>;

  /**
   * Called on 429, 500, 502, 503.
   * Expected: show toast notification with i18n message.
   */
  onNotification: (error: ApiError) => void;
};

// ---------------------------------------------------------------------------
// 5. createApiErrorHandler — factory function
// ---------------------------------------------------------------------------

/**
 * Creates an `onResponseError` callback for `$fetch.create()`.
 *
 * Behavior by status code:
 * - 401 → `config.onUnauthorized(error)`
 * - 403 → `config.onForbidden(error, parsedCode)`
 * - 422 → parse validation errors → attach to `ApiError.formErrors`
 * - 429, 500, 502, 503 → `config.onNotification(error)`
 * - 400, 404, 409 → no side effects (caller handles)
 *
 * Always throws `ApiError` (never swallows the error).
 * Client-only side effects guarded by `import.meta.client`.
 */
export declare function createApiErrorHandler(
  config: ApiErrorHandlerConfig
): (context: { response: Response }) => void;

// ---------------------------------------------------------------------------
// 6. parseValidationErrors — 422 issue parser
// ---------------------------------------------------------------------------

/**
 * Converts server 422 response `data.issues` (Zod format) into `FormError[]`.
 *
 * Path conversion: `['addresses', 0, 'city']` → `'addresses.0.city'`
 * Graceful: returns `[]` on malformed/missing input (never throws).
 */
export declare function parseValidationErrors(data: unknown): FormError[];

// ---------------------------------------------------------------------------
// 7. useApiErrorToast — toast notification composable
// ---------------------------------------------------------------------------

/**
 * Composable that provides `showErrorToast(error)` for standard error notifications.
 * Uses `useToast()` from NuxtUI + `useI18n()` for localized messages.
 *
 * Key resolution: `errors.api.{status}.title` / `errors.api.{status}.description`
 * Fallback: `errors.api.generic.title` / `errors.api.generic.description`
 */
export declare function useApiErrorToast(): {
  showErrorToast: (error: ApiError) => void;
};
