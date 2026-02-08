import { z } from 'zod';
import { VacancyStatusSchema } from './enums';
import { PaginationQuerySchema, PaginationResponseSchema } from './pagination';
import { VacancySchema } from './vacancy';

/**
 * Column visibility state — keys are column IDs, values indicate visibility.
 */
export const VacancyListColumnVisibilitySchema = z.record(z.string(), z.boolean());
export type VacancyListColumnVisibility = z.infer<typeof VacancyListColumnVisibilitySchema>;

/**
 * Query params for GET /api/vacancies.
 * Extends base pagination with sorting, filtering, and search.
 */
export const VacancyListQuerySchema = PaginationQuerySchema.extend({
  sortBy: z.enum(['updatedAt', 'createdAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
  status: z
    .union([z.string(), z.array(z.string())])
    .transform(v => (Array.isArray(v) ? v : [v]))
    .pipe(z.array(VacancyStatusSchema))
    .optional(),
  search: z.string().min(3).max(255).optional()
});

export type VacancyListQuery = z.infer<typeof VacancyListQuerySchema>;

/**
 * Response envelope for GET /api/vacancies.
 */
export const VacancyListResponseSchema = z.object({
  items: z.array(VacancySchema),
  pagination: PaginationResponseSchema,
  columnVisibility: VacancyListColumnVisibilitySchema
});

export type VacancyListResponse = z.infer<typeof VacancyListResponseSchema>;

/**
 * Body for PATCH /api/user/preferences/vacancy-list.
 */
export const VacancyListPreferencesPatchSchema = z.object({
  columnVisibility: VacancyListColumnVisibilitySchema
});

export type VacancyListPreferencesPatch = z.infer<typeof VacancyListPreferencesPatchSchema>;

/**
 * Body for DELETE /api/vacancies/bulk.
 */
export const VacancyBulkDeleteSchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100)
});

export type VacancyBulkDelete = z.infer<typeof VacancyBulkDeleteSchema>;
