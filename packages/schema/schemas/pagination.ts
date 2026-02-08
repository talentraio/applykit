import { z } from 'zod';

/**
 * Base pagination query params for any paginated endpoint.
 * Extend with `.extend({ ... })` for endpoint-specific params.
 */
export const PaginationQuerySchema = z.object({
  currentPage: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10)
});

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

/**
 * Base pagination metadata in API responses.
 * Nest under `pagination` key in response envelopes.
 */
export const PaginationResponseSchema = z.object({
  totalItems: z.number().int().min(0),
  totalPages: z.number().int().min(0)
});

export type PaginationResponse = z.infer<typeof PaginationResponseSchema>;
