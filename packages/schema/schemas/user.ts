import { z } from 'zod'
import { RoleSchema } from './enums'

export { RoleSchema, type Role } from './enums'

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  googleId: z.string(),
  role: RoleSchema,
  createdAt: z.date(),
  updatedAt: z.date(),
})

export type User = z.infer<typeof UserSchema>

// For API responses (without sensitive fields)
export const UserPublicSchema = UserSchema.omit({ googleId: true })
export type UserPublic = z.infer<typeof UserPublicSchema>
