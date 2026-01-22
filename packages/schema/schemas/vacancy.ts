import { z } from 'zod'

export const VacancySchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  company: z.string().min(1),
  jobPosition: z.string().min(1).optional(),
  description: z.string(),
  url: z.string().url().optional(),
  notes: z.string().optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
})

export type Vacancy = z.infer<typeof VacancySchema>

export const VacancyInputSchema = VacancySchema.omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true
})

export type VacancyInput = z.infer<typeof VacancyInputSchema>

/**
 * Generate a display title for a vacancy in the format "Company (Position)" or just "Company"
 */
export function getVacancyTitle(vacancy: Pick<Vacancy, 'company' | 'jobPosition'>): string {
  if (vacancy.jobPosition) {
    return `${vacancy.company} (${vacancy.jobPosition})`
  }
  return vacancy.company
}
