import { z } from 'zod';
import { RoleSchema } from './enums';

export { type Role, RoleSchema } from './enums';

export const RoleSettingsSchema = z.object({
  role: RoleSchema,
  platformLlmEnabled: z.boolean(),
  dailyBudgetCap: z.number().min(0),
  weeklyBudgetCap: z.number().min(0),
  monthlyBudgetCap: z.number().min(0),
  updatedAt: z.date()
});

export type RoleSettings = z.infer<typeof RoleSettingsSchema>;

export const RoleSettingsInputSchema = RoleSettingsSchema.omit({ updatedAt: true });

export type RoleSettingsInput = z.infer<typeof RoleSettingsInputSchema>;
