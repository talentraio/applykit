import { eq } from 'drizzle-orm'
import { db } from '../db'
import { users } from '../schema'
import type { User, NewUser } from '../schema'
import type { Role } from '@int/schema'

/**
 * User Repository
 *
 * Data access layer for users table
 * Handles authentication and role management
 */
export const userRepository = {
  /**
   * Find user by ID
   */
  async findById(id: string): Promise<User | null> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1)
    return result[0] ?? null
  },

  /**
   * Find user by email
   * Used for login and user lookup
   */
  async findByEmail(email: string): Promise<User | null> {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1)
    return result[0] ?? null
  },

  /**
   * Find user by Google ID
   * Used during OAuth callback to find or create user
   */
  async findByGoogleId(googleId: string): Promise<User | null> {
    const result = await db.select().from(users).where(eq(users.googleId, googleId)).limit(1)
    return result[0] ?? null
  },

  /**
   * Create new user
   * Called during first-time Google OAuth login
   */
  async create(data: Pick<NewUser, 'email' | 'googleId'> & { role?: Role }): Promise<User> {
    const result = await db.insert(users).values({
      email: data.email,
      googleId: data.googleId,
      role: data.role ?? 'public',
    }).returning()
    return result[0]
  },

  /**
   * Update user role
   * Admin-only operation for role management
   */
  async updateRole(id: string, role: Role): Promise<User | null> {
    const result = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning()
    return result[0] ?? null
  },

  /**
   * Update user's last login timestamp
   */
  async updateLastLogin(id: string): Promise<void> {
    await db
      .update(users)
      .set({ updatedAt: new Date() })
      .where(eq(users.id, id))
  },

  /**
   * Check if user exists by email
   */
  async existsByEmail(email: string): Promise<boolean> {
    const result = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1)
    return result.length > 0
  },

  /**
   * Get all users with specific role
   * Admin-only for user management
   */
  async findByRole(role: Role): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, role))
  },
}
