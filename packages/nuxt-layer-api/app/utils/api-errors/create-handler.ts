/**
 * createApiErrorHandler — factory that builds onResponseError callback.
 *
 * Feature: 016-errors-handling
 * Layer: packages/nuxt-layer-api/ (package: @int/api)
 */

import type { FetchResponse } from 'ofetch';
import type { ApiErrorHandlerConfig, ForbiddenCode } from './types';
import { ApiError } from './api-error';
import { parseValidationErrors } from './validation';

/**
 * Set of ForbiddenCode values for runtime validation.
 */
const FORBIDDEN_CODES = new Set<string>([
  'USER_DELETED',
  'USER_BLOCKED',
  'PROFILE_INCOMPLETE',
  'ACCESS_DENIED'
]);

/**
 * Status codes that trigger the `onNotification` callback (toast).
 */
const NOTIFICATION_STATUS_CODES = new Set([429, 500, 502, 503]);

/**
 * Extracts and validates the `data.code` field from a 403 response.
 * Falls back to `'ACCESS_DENIED'` if the code is missing or unrecognized.
 */
const parseForbiddenCode = (responseData: unknown): ForbiddenCode => {
  if (
    typeof responseData === 'object' &&
    responseData !== null &&
    'code' in responseData &&
    typeof (responseData as Record<string, unknown>).code === 'string' &&
    FORBIDDEN_CODES.has((responseData as Record<string, unknown>).code as string)
  ) {
    return (responseData as Record<string, unknown>).code as ForbiddenCode;
  }

  return 'ACCESS_DENIED';
};

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
/**
 * Safely extracts the nested `data` field from an H3 error response body.
 *
 * H3/Nitro error responses have shape:
 * `{ statusCode, statusMessage, message, data: { ... } }`
 *
 * So `response._data` = full error body, and `response._data.data` = the custom data.
 */
const extractResponseData = (responseBody: unknown): unknown => {
  if (typeof responseBody === 'object' && responseBody !== null && 'data' in responseBody) {
    return (responseBody as Record<string, unknown>).data;
  }
  return undefined;
};

export const createApiErrorHandler = (config: ApiErrorHandlerConfig) => {
  return async ({ response }: { response: FetchResponse<unknown> }) => {
    const apiError = new ApiError(response);
    const nestedData = extractResponseData(response._data);

    // Parse 422 validation errors regardless of SSR/client (data is always useful)
    if (response.status === 422) {
      apiError.formErrors = parseValidationErrors(nestedData);
    }

    // Side effects only on client (toast, navigateTo require browser context)
    if (import.meta.client) {
      switch (response.status) {
        case 401:
          await config.onUnauthorized(apiError);
          break;

        case 403: {
          const code = parseForbiddenCode(nestedData);
          await config.onForbidden(apiError, code);
          break;
        }

        default:
          if (NOTIFICATION_STATUS_CODES.has(response.status)) {
            config.onNotification(apiError);
          }
          break;
      }
    }

    throw apiError;
  };
};
