import { z } from 'zod';
import {
  LlmReasoningEffortSchema,
  LlmResponseFormatSchema,
  LlmScenarioKeySchema,
  LlmStrategyKeySchema,
  RoleSchema
} from './enums';

export {
  type LlmReasoningEffort,
  LlmReasoningEffortSchema,
  type LlmResponseFormat,
  LlmResponseFormatSchema,
  type LlmScenarioKey,
  LlmScenarioKeySchema,
  type LlmStrategyKey,
  LlmStrategyKeySchema,
  type Role,
  RoleSchema
} from './enums';

const nullableTemperature = z.number().min(0).max(2).nullable().optional();
const nullableMaxTokens = z.number().int().positive().nullable().optional();
const nullableResponseFormat = LlmResponseFormatSchema.nullable().optional();
const nullableReasoningEffort = LlmReasoningEffortSchema.nullable().optional();
const nullableModelId = z.string().uuid().nullable().optional();
const nullableStrategyKey = LlmStrategyKeySchema.nullable().optional();

export const RoutingAssignmentInputSchema = z.object({
  modelId: z.string().uuid(),
  retryModelId: nullableModelId,
  temperature: nullableTemperature,
  maxTokens: nullableMaxTokens,
  responseFormat: nullableResponseFormat,
  reasoningEffort: nullableReasoningEffort,
  strategyKey: nullableStrategyKey
});

export type RoutingAssignmentInput = z.infer<typeof RoutingAssignmentInputSchema>;

export const RoutingScenarioEnabledInputSchema = z.object({
  enabled: z.boolean()
});

export type RoutingScenarioEnabledInput = z.infer<typeof RoutingScenarioEnabledInputSchema>;

export const LlmRoutingEnabledOverrideSchema = z.object({
  role: RoleSchema,
  enabled: z.boolean(),
  updatedAt: z.date()
});

export type LlmRoutingEnabledOverride = z.infer<typeof LlmRoutingEnabledOverrideSchema>;

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
  enabledOverrides: z.array(LlmRoutingEnabledOverrideSchema).default([]),
  default: LlmRoutingDefaultSchema.nullable().optional(),
  overrides: z.array(LlmRoutingOverrideSchema).default([])
});

export type LlmRoutingItem = z.infer<typeof LlmRoutingItemSchema>;

export const LlmRoutingResponseSchema = z.object({
  items: z.array(LlmRoutingItemSchema)
});

export type LlmRoutingResponse = z.infer<typeof LlmRoutingResponseSchema>;
