import { z } from 'zod'

export const GenerationSchema = z.object({
  id: z.string().uuid(),
  vacancyId: z.string().uuid(),
  resumeId: z.string().uuid(),
  tailoredContent: z.record(z.any()),
  matchScoreBefore: z.number().min(0).max(100),
  matchScoreAfter: z.number().min(0).max(100),
  expiresAt: z.string().datetime(),
  createdAt: z.string().datetime()
})

export type Generation = z.infer<typeof GenerationSchema>

const GENERATION_LIFETIME_DAYS = 30

/**
 * Calculate how many days until a generation expires
 * @param expiresAt ISO datetime string
 * @returns Number of days remaining (can be negative if expired)
 */
export function getDaysUntilExpiration(expiresAt: string): number {
  const expiration = new Date(expiresAt)
  const now = new Date()
  const diffMs = expiration.getTime() - now.getTime()
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  return diffDays
}

/**
 * Get the expiration date for a new generation
 */
export function getGenerationExpirationDate(): string {
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + GENERATION_LIFETIME_DAYS)
  return expiresAt.toISOString()
}
