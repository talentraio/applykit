import { z } from 'zod';
import { LlmResponseFormatSchema, LlmScenarioKeySchema, RoleSchema } from './enums';

export {
  type LlmResponseFormat,
  LlmResponseFormatSchema,
  type LlmScenarioKey,
  LlmScenarioKeySchema,
  type Role,
  RoleSchema
} from './enums';

const nullableTemperature = z.number().min(0).max(2).nullable().optional();
const nullableMaxTokens = z.number().int().positive().nullable().optional();
const nullableResponseFormat = LlmResponseFormatSchema.nullable().optional();

export const RoutingAssignmentInputSchema = z.object({
  modelId: z.string().uuid(),
  temperature: nullableTemperature,
  maxTokens: nullableMaxTokens,
  responseFormat: nullableResponseFormat
});

export type RoutingAssignmentInput = z.infer<typeof RoutingAssignmentInputSchema>;

export const LlmRoutingDefaultSchema = RoutingAssignmentInputSchema.extend({
  updatedAt: z.date()
});

export type LlmRoutingDefault = z.infer<typeof LlmRoutingDefaultSchema>;

export const LlmRoutingOverrideSchema = RoutingAssignmentInputSchema.extend({
  role: RoleSchema,
  updatedAt: z.date()
});

export type LlmRoutingOverride = z.infer<typeof LlmRoutingOverrideSchema>;

export const LlmRoutingItemSchema = z.object({
  scenarioKey: LlmScenarioKeySchema,
  label: z.string().min(1).max(255).optional(),
  description: z.string().trim().max(1000).nullable().optional(),
  enabled: z.boolean().optional(),
  default: LlmRoutingDefaultSchema.nullable().optional(),
  overrides: z.array(LlmRoutingOverrideSchema).default([])
});

export type LlmRoutingItem = z.infer<typeof LlmRoutingItemSchema>;

export const LlmRoutingResponseSchema = z.object({
  items: z.array(LlmRoutingItemSchema)
});

export type LlmRoutingResponse = z.infer<typeof LlmRoutingResponseSchema>;
