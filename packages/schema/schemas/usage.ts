import { z } from 'zod'
import { OperationSchema, ProviderTypeSchema } from './enums'

export { OperationSchema, type Operation } from './enums'
export { ProviderTypeSchema, type ProviderType } from './enums'

export const UsageLogSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  operation: OperationSchema,
  providerType: ProviderTypeSchema,
  tokensUsed: z.number().int().nullable().optional(),
  cost: z.number().nullable().optional(),
  createdAt: z.date(),
})

export type UsageLog = z.infer<typeof UsageLogSchema>
