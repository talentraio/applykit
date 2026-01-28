import { z } from 'zod';
import { PlatformProviderSchema, RoleSchema } from './enums';

export { type PlatformProvider, PlatformProviderSchema, type Role, RoleSchema } from './enums';

export const RoleSettingsSchema = z.object({
  role: RoleSchema,
  platformLlmEnabled: z.boolean(),
  byokEnabled: z.boolean(),
  platformProvider: PlatformProviderSchema,
  dailyBudgetCap: z.number().min(0),
  updatedAt: z.date()
});

export type RoleSettings = z.infer<typeof RoleSettingsSchema>;

export const RoleSettingsInputSchema = RoleSettingsSchema.omit({ updatedAt: true });

export type RoleSettingsInput = z.infer<typeof RoleSettingsInputSchema>;
