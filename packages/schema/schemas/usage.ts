import { z } from 'zod';
import { OperationSchema, ProviderTypeSchema, UsageContextSchema } from './enums';

export { type Operation, OperationSchema } from './enums';
export { type ProviderType, ProviderTypeSchema } from './enums';
export { type UsageContext, UsageContextSchema } from './enums';

export const UsageLogSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  operation: OperationSchema,
  providerType: ProviderTypeSchema,
  usageContext: UsageContextSchema.optional().nullable(),
  tokensUsed: z.number().int().nullable().optional(),
  cost: z.number().nullable().optional(),
  createdAt: z.date()
});

export type UsageLog = z.infer<typeof UsageLogSchema>;
