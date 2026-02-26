/**
 * Contract: Server-side error response shapes
 *
 * Feature: 016-errors-handling
 * Layer: packages/nuxt-layer-api/ (@int/api) — server/
 *
 * Documents the error response shapes that the client error handler expects.
 * These are NOT new endpoints — they describe the data format of existing error responses
 * with the modifications introduced by this feature.
 */

import type { ForbiddenCode } from './api-error-types';

// ---------------------------------------------------------------------------
// 1. 403 Forbidden (MODIFIED — data.code added)
// ---------------------------------------------------------------------------

/**
 * 403 response now includes a `code` field for client-side sub-case routing.
 *
 * Modified files:
 * - server/middleware/auth.ts (USER_DELETED, USER_BLOCKED)
 * - server/middleware/admin.ts (ACCESS_DENIED)
 * - server/services/profile.ts (PROFILE_INCOMPLETE)
 * - server/utils/session-helpers.ts (ACCESS_DENIED)
 * - server/utils/suppression-guard.ts (ACCESS_DENIED)
 */
export type ForbiddenResponse = {
  statusCode: 403;
  statusMessage?: string;
  message: string;
  data: {
    code: ForbiddenCode;
  };
};

// ---------------------------------------------------------------------------
// 2. 422 Unprocessable Entity (STANDARDIZED — was 400 in some endpoints)
// ---------------------------------------------------------------------------

/**
 * Zod validation issue shape (matches ZodIssue from 'zod').
 * Only the fields used by `parseValidationErrors()` are listed.
 */
export type ValidationIssue = {
  code: string;
  path: (string | number)[];
  message: string;
};

/**
 * Standardized 422 response for Zod validation errors.
 *
 * Migrated endpoints (from 400 + error.format()):
 * - server/api/vacancies/index.post.ts
 * - server/api/vacancies/[id].put.ts
 */
export type ValidationErrorResponse = {
  statusCode: 422;
  statusMessage: 'Validation Error';
  data: {
    issues: ValidationIssue[];
  };
};

// ---------------------------------------------------------------------------
// 3. Unchanged response shapes (reference only)
// ---------------------------------------------------------------------------

/** 401 Unauthorized — standard H3 error, no data field */
export type UnauthorizedResponse = {
  statusCode: 401;
  statusMessage?: string;
  message: string;
};

/** 429 Too Many Requests — existing rate limit shape, no changes */
export type RateLimitResponse = {
  statusCode: 429;
  statusMessage: 'Too Many Requests';
  message: string;
  data: {
    operation: string;
    limit: number;
    resetAt: string; // ISO timestamp
  };
};

/** 400 Bad Request — business logic errors (non-validation), no changes */
export type BadRequestResponse = {
  statusCode: 400;
  message: string;
  data?: unknown;
};

/** 500/502/503 — standard server errors, no changes */
export type ServerErrorResponse = {
  statusCode: 500 | 502 | 503;
  statusMessage?: string;
  message: string;
};
