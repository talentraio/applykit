import { z } from 'zod';
import { ResumeContentSchema } from './resume';

export const ScoreBreakdownComponentSchema = z.object({
  before: z.number().min(0).max(100),
  after: z.number().min(0).max(100),
  weight: z.number().min(0).max(1)
});

export type ScoreBreakdownComponent = z.infer<typeof ScoreBreakdownComponentSchema>;

export const ScoreBreakdownGateStatusSchema = z.object({
  schemaValid: z.boolean(),
  identityStable: z.boolean(),
  hallucinationFree: z.boolean()
});

export type ScoreBreakdownGateStatus = z.infer<typeof ScoreBreakdownGateStatusSchema>;

export const ScoreBreakdownSchema = z.object({
  version: z.string().min(1).max(64),
  components: z.object({
    core: ScoreBreakdownComponentSchema,
    mustHave: ScoreBreakdownComponentSchema,
    niceToHave: ScoreBreakdownComponentSchema,
    responsibilities: ScoreBreakdownComponentSchema,
    human: ScoreBreakdownComponentSchema
  }),
  gateStatus: ScoreBreakdownGateStatusSchema
});

export type ScoreBreakdown = z.infer<typeof ScoreBreakdownSchema>;

export const GenerationSchema = z.object({
  id: z.string().uuid(),
  vacancyId: z.string().uuid(),
  resumeId: z.string().uuid(),
  content: ResumeContentSchema,
  matchScoreBefore: z.number().int().min(0).max(100),
  matchScoreAfter: z.number().int().min(0).max(100),
  scoreBreakdown: ScoreBreakdownSchema,
  generatedAt: z.date(),
  expiresAt: z.date()
});

export type Generation = z.infer<typeof GenerationSchema>;

/**
 * Check if generation is expired
 */
export function isGenerationExpired(generation: Generation): boolean {
  const now = new Date();
  return generation.expiresAt.getTime() < now.getTime();
}

/**
 * Get days until expiration (0 if expired)
 */
export function getDaysUntilExpiration(generation: Generation): number {
  const now = new Date();
  const diff = generation.expiresAt.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}
