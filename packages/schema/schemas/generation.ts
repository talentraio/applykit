import { z } from 'zod';
import { LLMProviderSchema, LlmStrategyKeySchema } from './enums';
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

export const DetailedScoreSignalTypeSchema = z.enum([
  'core',
  'mustHave',
  'niceToHave',
  'responsibility'
]);

export type DetailedScoreSignalType = z.infer<typeof DetailedScoreSignalTypeSchema>;

export const DetailedScoreItemSchema = z.object({
  signalType: DetailedScoreSignalTypeSchema,
  signal: z.string().trim().min(1).max(255),
  weight: z.number().min(0).max(1),
  strengthBefore: z.number().min(0).max(1),
  strengthAfter: z.number().min(0).max(1),
  presentBefore: z.boolean(),
  presentAfter: z.boolean(),
  evidenceBefore: z.array(z.string().trim().min(1).max(255)).max(3).default([]),
  evidenceAfter: z.array(z.string().trim().min(1).max(255)).max(3).default([])
});

export type DetailedScoreItem = z.infer<typeof DetailedScoreItemSchema>;

export const GenerationScoreDetailPayloadSchema = z.object({
  summary: z.object({
    before: z.number().int().min(0).max(100),
    after: z.number().int().min(0).max(100),
    improvement: z.number().int().min(0).max(100)
  }),
  matched: z.array(DetailedScoreItemSchema).max(32),
  gaps: z.array(DetailedScoreItemSchema).max(32),
  recommendations: z.array(z.string().trim().min(1).max(500)).max(16),
  scoreBreakdown: ScoreBreakdownSchema
});

export type GenerationScoreDetailPayload = z.infer<typeof GenerationScoreDetailPayloadSchema>;

export const GenerationScoreDetailSchema = z.object({
  id: z.string().uuid(),
  generationId: z.string().uuid(),
  vacancyId: z.string().uuid(),
  vacancyVersionMarker: z.string().trim().min(1).max(128),
  details: GenerationScoreDetailPayloadSchema,
  provider: LLMProviderSchema,
  model: z.string().trim().min(1).max(255),
  strategyKey: LlmStrategyKeySchema.nullable(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export type GenerationScoreDetail = z.infer<typeof GenerationScoreDetailSchema>;

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
