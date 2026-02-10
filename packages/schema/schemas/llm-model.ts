import { z } from 'zod';
import { LLM_MODEL_STATUS_MAP } from '../constants/enums';
import { LlmModelStatusSchema, LLMProviderSchema } from './enums';

export {
  type LlmModelStatus,
  LlmModelStatusSchema,
  type LLMProvider,
  LLMProviderSchema
} from './enums';

const nullableNonNegativeNumber = z.number().min(0).nullable().optional();
const nullablePositiveInteger = z.number().int().positive().nullable().optional();

export const LlmModelSchema = z.object({
  id: z.string().uuid(),
  provider: LLMProviderSchema,
  modelKey: z.string().min(1).max(255),
  displayName: z.string().min(1).max(255),
  status: LlmModelStatusSchema,
  inputPricePer1mUsd: z.number().min(0),
  outputPricePer1mUsd: z.number().min(0),
  cachedInputPricePer1mUsd: nullableNonNegativeNumber,
  maxContextTokens: nullablePositiveInteger,
  maxOutputTokens: nullablePositiveInteger,
  supportsJson: z.boolean(),
  supportsTools: z.boolean(),
  supportsStreaming: z.boolean(),
  notes: z.string().trim().max(4000).nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date()
});

export type LlmModel = z.infer<typeof LlmModelSchema>;

export const LlmModelCreateInputSchema = z.object({
  provider: LLMProviderSchema,
  modelKey: z.string().min(1).max(255),
  displayName: z.string().min(1).max(255),
  status: LlmModelStatusSchema.default(LLM_MODEL_STATUS_MAP.ACTIVE),
  inputPricePer1mUsd: z.number().min(0),
  outputPricePer1mUsd: z.number().min(0),
  cachedInputPricePer1mUsd: nullableNonNegativeNumber,
  maxContextTokens: nullablePositiveInteger,
  maxOutputTokens: nullablePositiveInteger,
  supportsJson: z.boolean().default(false),
  supportsTools: z.boolean().default(false),
  supportsStreaming: z.boolean().default(false),
  notes: z.string().trim().max(4000).nullable().optional()
});

export type LlmModelCreateInput = z.infer<typeof LlmModelCreateInputSchema>;

export const LlmModelUpdateInputSchema = z
  .object({
    displayName: z.string().min(1).max(255).optional(),
    status: LlmModelStatusSchema.optional(),
    inputPricePer1mUsd: z.number().min(0).optional(),
    outputPricePer1mUsd: z.number().min(0).optional(),
    cachedInputPricePer1mUsd: nullableNonNegativeNumber,
    maxContextTokens: nullablePositiveInteger,
    maxOutputTokens: nullablePositiveInteger,
    supportsJson: z.boolean().optional(),
    supportsTools: z.boolean().optional(),
    supportsStreaming: z.boolean().optional(),
    notes: z.string().trim().max(4000).nullable().optional()
  })
  .strict();

export type LlmModelUpdateInput = z.infer<typeof LlmModelUpdateInputSchema>;

export const LlmModelListResponseSchema = z.object({
  items: z.array(LlmModelSchema)
});

export type LlmModelListResponse = z.infer<typeof LlmModelListResponseSchema>;
