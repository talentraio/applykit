import { z } from 'zod';

export const SystemConfigKeySchema = z.enum(['global_budget_cap', 'global_budget_used']);

export type SystemConfigKey = z.infer<typeof SystemConfigKeySchema>;

// Type-safe config values
export const SystemConfigValues = {
  global_budget_cap: z.number().positive(),
  global_budget_used: z.number().min(0)
} as const;

// Default values
export const SystemConfigDefaults: Record<SystemConfigKey, unknown> = {
  global_budget_cap: 100, // $100/month
  global_budget_used: 0
};
