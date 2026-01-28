import { z } from 'zod';
import { RoleSchema, UserStatusSchema } from './enums';

export { type Role, RoleSchema, type UserStatus, UserStatusSchema } from './enums';

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  googleId: z.string(),
  role: RoleSchema,
  status: UserStatusSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
  lastLoginAt: z.date().nullable().optional(),
  deletedAt: z.date().nullable().optional()
});

export type User = z.infer<typeof UserSchema>;

// For API responses (without sensitive fields)
export const UserPublicSchema = UserSchema.omit({ googleId: true });
export type UserPublic = z.infer<typeof UserPublicSchema>;
