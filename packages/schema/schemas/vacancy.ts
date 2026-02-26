import { z } from 'zod';
import { isSafeHttpUrl } from '../helpers/url';
import { VacancyStatusSchema } from './enums';

export const VacancySchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  company: z.string().min(1).max(255),
  jobPosition: z.string().max(255).nullable().optional(),
  description: z.string().min(1),
  url: z
    .string()
    .url()
    .max(2048)
    .refine(isSafeHttpUrl, { message: 'URL must use http or https protocol' })
    .nullable()
    .optional(),
  notes: z.string().nullable().optional(),
  status: VacancyStatusSchema.default('created'),
  createdAt: z.date(),
  updatedAt: z.date()
});

export type Vacancy = z.infer<typeof VacancySchema>;

export const VacancyInputSchema = VacancySchema.omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true
});

export type VacancyInput = z.infer<typeof VacancyInputSchema>;

// Display title helper
export function getVacancyTitle(vacancy: Vacancy): string {
  return vacancy.jobPosition ? `${vacancy.company} (${vacancy.jobPosition})` : vacancy.company;
}
