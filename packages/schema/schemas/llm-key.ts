import { z } from 'zod'
import { LLMProviderSchema } from './enums'

export { LLMProviderSchema, type LLMProvider } from './enums'

export const LLMKeySchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  provider: LLMProviderSchema,
  keyHint: z.string().length(4),
  createdAt: z.date(),
})

export type LLMKey = z.infer<typeof LLMKeySchema>
