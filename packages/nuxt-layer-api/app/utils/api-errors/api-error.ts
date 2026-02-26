/**
 * ApiError class — typed error wrapper for all non-2xx API responses.
 *
 * Feature: 016-errors-handling
 * Layer: packages/nuxt-layer-api/ (package: @int/api)
 */

import type { FormError } from './types';

/**
 * Internal brand symbol used by `isApiError()` for reliable cross-module detection.
 * Preferred over `instanceof` which can fail across different module instances.
 */
const API_ERROR_BRAND = Symbol.for('ApiError');

/**
 * Typed error wrapper thrown by the centralized error handler for all non-2xx API responses.
 *
 * Properties:
 * - `status` — HTTP status code (e.g. 401, 403, 422, 500)
 * - `statusText` — HTTP status text (e.g. "Forbidden", "Unprocessable Entity")
 * - `url` — Request URL (for debugging; no PII — request body is NOT stored)
 * - `data` — Parsed response body; shape varies by status code
 * - `formErrors` — Parsed validation errors for 422 responses; empty array otherwise
 */
export class ApiError extends Error {
  readonly status: number;
  readonly statusText: string;
  readonly url: string;
  readonly data: unknown;
  formErrors: FormError[];

  constructor(response: { status: number; statusText: string; url: string; _data?: unknown }) {
    const message = `API error ${response.status}: ${response.statusText}`;
    super(message);
    this.name = 'ApiError';
    this.status = response.status;
    this.statusText = response.statusText;
    this.url = response.url;
    this.data = response._data;
    this.formErrors = [];

    // Brand for `isApiError()` type guard — set via defineProperty to avoid TS1166
    // (computed property names from Symbol.for() require unique symbol type in class declarations)
    Object.defineProperty(this, API_ERROR_BRAND, {
      value: true,
      writable: false,
      enumerable: false,
      configurable: false
    });
  }
}

/**
 * Type guard: checks if an unknown error is an ApiError.
 * Uses symbol brand for reliable cross-module detection (avoids `instanceof` pitfalls).
 */
export const isApiError = (error: unknown): error is ApiError => {
  return (
    typeof error === 'object' &&
    error !== null &&
    API_ERROR_BRAND in error &&
    (error as Record<symbol, unknown>)[API_ERROR_BRAND] === true
  );
};
