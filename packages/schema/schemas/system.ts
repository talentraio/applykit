import { z } from 'zod'
import { PlatformProviderSchema } from './enums'

export { type PlatformProvider, PlatformProviderSchema } from './enums'

export const SystemConfigKeySchema = z.enum([
  'platform_llm_enabled',
  'byok_enabled',
  'platform_provider',
  'global_budget_cap',
  'global_budget_used'
])

export type SystemConfigKey = z.infer<typeof SystemConfigKeySchema>

// Type-safe config values
export const SystemConfigValues = {
  platform_llm_enabled: z.boolean(),
  byok_enabled: z.boolean(),
  platform_provider: PlatformProviderSchema,
  global_budget_cap: z.number().positive(),
  global_budget_used: z.number().min(0)
} as const

// Default values
export const SystemConfigDefaults: Record<SystemConfigKey, unknown> = {
  platform_llm_enabled: true,
  byok_enabled: true,
  platform_provider: 'openai',
  global_budget_cap: 100, // $100/month
  global_budget_used: 0
}
