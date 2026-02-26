/**
 * Shared error handling types for centralized API error handling.
 *
 * Feature: 016-errors-handling
 * Layer: packages/nuxt-layer-api/ (package: @int/api)
 */

// ---------------------------------------------------------------------------
// ForbiddenCode — 403 sub-case routing
// ---------------------------------------------------------------------------

/**
 * Enum of 403 sub-case codes returned by server middleware.
 * Client error handler routes by this code to determine app-specific behavior.
 */
// ---------------------------------------------------------------------------
// ApiErrorHandlerConfig — factory configuration
// ---------------------------------------------------------------------------

/** Forward reference to ApiError (avoid circular import) */
import type { ApiError } from './api-error';

export type ForbiddenCode =
  | 'USER_DELETED'
  | 'USER_BLOCKED'
  | 'PROFILE_INCOMPLETE'
  | 'ACCESS_DENIED';

// ---------------------------------------------------------------------------
// FormError — NuxtUI-compatible validation error
// ---------------------------------------------------------------------------

/**
 * Compatible with NuxtUI v4 `FormError<string>`.
 * Defined locally to avoid hard dependency on `@nuxt/ui` in `@int/api` layer.
 *
 * @see https://ui.nuxt.com/docs/components/form — `setErrors(errors: FormError[])`
 */
export type FormError = {
  /** Dot-notation field path matching UFormField `name` prop. e.g. 'email', 'addresses.0.city' */
  name: string;
  /** Human-readable validation message from server (Zod issue message) */
  message: string;
};

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
