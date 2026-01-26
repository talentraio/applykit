import type { Role } from '@int/schema';
import type { NewUser, User } from '../schema';
import { desc, eq, like, sql } from 'drizzle-orm';
import { db } from '../db';
import { users } from '../schema';

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
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0] ?? null;
  },

  /**
   * Find user by email
   * Used for login and user lookup
   */
  async findByEmail(email: string): Promise<User | null> {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0] ?? null;
  },

  /**
   * Find user by Google ID
   * Used during OAuth callback to find or create user
   */
  async findByGoogleId(googleId: string): Promise<User | null> {
    const result = await db.select().from(users).where(eq(users.googleId, googleId)).limit(1);
    return result[0] ?? null;
  },

  /**
   * Create new user
   * Called during first-time Google OAuth login
   */
  async create(data: Pick<NewUser, 'email' | 'googleId'> & { role?: Role }): Promise<User> {
    const result = await db
      .insert(users)
      .values({
        email: data.email,
        googleId: data.googleId,
        role: data.role ?? 'public'
      })
      .returning();
    return result[0]!;
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
      .returning();
    return result[0] ?? null;
  },

  /**
   * Update user's last login timestamp
   */
  async updateLastLogin(id: string): Promise<void> {
    await db.update(users).set({ updatedAt: new Date() }).where(eq(users.id, id));
  },

  /**
   * Check if user exists by email
   */
  async existsByEmail(email: string): Promise<boolean> {
    const result = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return result.length > 0;
  },

  /**
   * Get all users with specific role
   * Admin-only for user management
   */
  async findByRole(role: Role): Promise<User[]> {
    return await db.select().from(users).where(eq(users.role, role));
  },

  /**
   * Search users by email with pagination
   * Admin-only for user management
   */
  async search(params: {
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ users: User[]; total: number }> {
    const normalizedSearch = params.search?.trim().toLowerCase();
    const limit = Math.min(Math.max(params.limit ?? 50, 1), 200);
    const offset = Math.max(params.offset ?? 0, 0);

    const whereClause = normalizedSearch
      ? like(sql`lower(${users.email})`, `%${normalizedSearch}%`)
      : undefined;

    const listQuery = db.select().from(users);
    const filteredList = whereClause ? listQuery.where(whereClause) : listQuery;
    const list = await filteredList.orderBy(desc(users.createdAt)).limit(limit).offset(offset);

    const countQuery = db.select({ count: sql<number>`count(*)` }).from(users);
    const countResult = await (whereClause ? countQuery.where(whereClause) : countQuery);
    const total = Number(countResult[0]?.count ?? 0);

    return { users: list, total };
  }
};
