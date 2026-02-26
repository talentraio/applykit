/**
 * parseValidationErrors — converts server 422 response issues into FormError[].
 *
 * Feature: 016-errors-handling
 * Layer: packages/nuxt-layer-api/ (package: @int/api)
 */

import type { FormError } from './types';

/**
 * Shape of a single Zod validation issue as returned by the server.
 * Only the fields consumed by the parser are declared.
 */
type ZodIssueLike = {
  path: (string | number)[];
  message: string;
};

/**
 * Checks if a value looks like a Zod issue (has `path` array and `message` string).
 */
const isZodIssueLike = (value: unknown): value is ZodIssueLike => {
  return (
    typeof value === 'object' &&
    value !== null &&
    'path' in value &&
    'message' in value &&
    Array.isArray((value as ZodIssueLike).path) &&
    typeof (value as ZodIssueLike).message === 'string'
  );
};

/**
 * Converts a Zod issue path array to dot-notation string.
 *
 * Examples:
 * - `['email']` → `'email'`
 * - `['user', 'email']` → `'user.email'`
 * - `['items', 0, 'name']` → `'items.0.name'`
 * - `[]` → `''`
 */
const pathToDotNotation = (path: (string | number)[]): string => {
  return path.map(String).join('.');
};

/**
 * Converts server 422 response `data.issues` (Zod format) into `FormError[]`.
 *
 * Expects input shape: `{ issues: Array<{ path: (string|number)[], message: string }> }`
 *
 * Path conversion: `['addresses', 0, 'city']` → `'addresses.0.city'`
 *
 * Graceful: returns `[]` on malformed/missing input (never throws).
 */
export const parseValidationErrors = (data: unknown): FormError[] => {
  if (typeof data !== 'object' || data === null) {
    return [];
  }

  const dataObj = data as Record<string, unknown>;
  const issues = dataObj.issues;

  if (!Array.isArray(issues)) {
    return [];
  }

  const errors: FormError[] = [];

  for (const issue of issues) {
    if (isZodIssueLike(issue)) {
      const name = pathToDotNotation(issue.path);

      // Skip issues with empty path — they are root-level errors, not field-specific
      if (name) {
        errors.push({ name, message: issue.message });
      }
    }
  }

  return errors;
};
