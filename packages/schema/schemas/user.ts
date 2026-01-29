import { z } from 'zod';
import { RoleSchema, UserStatusSchema } from './enums';

export { type Role, RoleSchema, type UserStatus, UserStatusSchema } from './enums';

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),

  // OAuth providers (nullable - user may use email/password instead)
  googleId: z.string().nullable(),
  linkedInId: z.string().nullable(),

  // Email/password auth
  passwordHash: z.string().nullable(),
  emailVerified: z.boolean(),
  emailVerificationToken: z.string().nullable(),
  emailVerificationExpires: z.date().nullable(),

  // Password reset
  passwordResetToken: z.string().nullable(),
  passwordResetExpires: z.date().nullable(),

  // User settings
  role: RoleSchema,
  status: UserStatusSchema,

  // Timestamps
  createdAt: z.date(),
  updatedAt: z.date(),
  lastLoginAt: z.date().nullable().optional(),
  deletedAt: z.date().nullable().optional()
});

export type User = z.infer<typeof UserSchema>;

// For API responses (without sensitive fields)
export const UserPublicSchema = UserSchema.omit({
  googleId: true,
  linkedInId: true,
  passwordHash: true,
  emailVerificationToken: true,
  passwordResetToken: true,
  passwordResetExpires: true
});
export type UserPublic = z.infer<typeof UserPublicSchema>;
