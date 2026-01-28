import type { Role, UserStatus } from '@int/schema';
import type { NewUser, User } from '../schema';
import { randomUUID } from 'node:crypto';
import process from 'node:process';
import { USER_ROLE_MAP, USER_STATUS_MAP } from '@int/schema';
import { isValid, parseISO } from 'date-fns';
import { and, desc, eq, like, sql } from 'drizzle-orm';
import { db } from '../db';
import { users } from '../schema';

type UserRow = {
  id: string;
  email: string;
  googleId: string;
  role: Role;
  status: UserStatus;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
  lastLoginAt?: Date | string | null;
  deletedAt?: Date | string | null;
};

const isSqliteRuntime = (): boolean => {
  const runtimeConfig = useRuntimeConfig();
  return process.env.NODE_ENV !== 'production' && !runtimeConfig.databaseUrl;
};

const baseSelectFields = {
  id: users.id,
  email: users.email,
  googleId: users.googleId,
  role: users.role,
  status: users.status,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
  lastLoginAt: users.lastLoginAt,
  deletedAt: users.deletedAt
};

const sqliteSelectFields = {
  id: users.id,
  email: users.email,
  googleId: users.googleId,
  role: users.role,
  status: users.status,
  createdAt: sql<string>`strftime('%Y-%m-%d %H:%M:%S', ${users.createdAt})`,
  updatedAt: sql<string>`strftime('%Y-%m-%d %H:%M:%S', ${users.updatedAt})`,
  lastLoginAt: sql<string>`strftime('%Y-%m-%d %H:%M:%S', ${users.lastLoginAt})`,
  deletedAt: sql<string>`strftime('%Y-%m-%d %H:%M:%S', ${users.deletedAt})`
};

const normalizeDateValue = (value: Date | string | null | undefined): Date | null => {
  if (!value) return null;

  if (value instanceof Date) {
    return isValid(value) ? value : null;
  }

  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  const iso = normalized.endsWith('Z') ? normalized : `${normalized}Z`;
  const parsed = parseISO(iso);
  return isValid(parsed) ? parsed : null;
};

const normalizeRequiredDate = (value: Date | string | null): Date => {
  return normalizeDateValue(value) ?? new Date();
};

const normalizeOptionalDate = (value: Date | string | null): Date | null => {
  return normalizeDateValue(value);
};

const normalizeUserRow = (row: UserRow): User => {
  return {
    ...row,
    createdAt: normalizeRequiredDate(row.createdAt),
    updatedAt: normalizeRequiredDate(row.updatedAt),
    lastLoginAt: normalizeOptionalDate(row.lastLoginAt ?? null),
    deletedAt: normalizeOptionalDate(row.deletedAt ?? null)
  };
};

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
    const query = isSqliteRuntime()
      ? db.select(sqliteSelectFields).from(users)
      : db.select(baseSelectFields).from(users);
    const result = await query.where(eq(users.id, id)).limit(1);
    const user = result[0];
    return user ? normalizeUserRow(user) : null;
  },

  /**
   * Find user by email
   * Used for login and user lookup
   */
  async findByEmail(email: string): Promise<User | null> {
    const query = isSqliteRuntime()
      ? db.select(sqliteSelectFields).from(users)
      : db.select(baseSelectFields).from(users);
    const result = await query.where(eq(users.email, email)).limit(1);
    const user = result[0];
    return user ? normalizeUserRow(user) : null;
  },

  /**
   * Find user by Google ID
   * Used during OAuth callback to find or create user
   */
  async findByGoogleId(googleId: string): Promise<User | null> {
    const query = isSqliteRuntime()
      ? db.select(sqliteSelectFields).from(users)
      : db.select(baseSelectFields).from(users);
    const result = await query.where(eq(users.googleId, googleId)).limit(1);
    const user = result[0];
    return user ? normalizeUserRow(user) : null;
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
        role: data.role ?? USER_ROLE_MAP.PUBLIC,
        status: USER_STATUS_MAP.ACTIVE,
        lastLoginAt: new Date()
      })
      .returning();
    const created = result[0]!;
    if (isSqliteRuntime()) {
      const fresh = await this.findById(created.id);
      return fresh ?? normalizeUserRow(created);
    }
    return normalizeUserRow(created);
  },

  /**
   * Create invited user (admin-only)
   */
  async createInvited(data: { email: string; role: Role }): Promise<User> {
    const result = await db
      .insert(users)
      .values({
        email: data.email,
        googleId: `invited_${randomUUID()}`,
        role: data.role,
        status: USER_STATUS_MAP.INVITED
      })
      .returning();
    const created = result[0]!;
    if (isSqliteRuntime()) {
      const fresh = await this.findById(created.id);
      return fresh ?? normalizeUserRow(created);
    }
    return normalizeUserRow(created);
  },

  /**
   * Activate invited user (first login)
   */
  async activateInvitedUser(params: { id: string; googleId: string }): Promise<User | null> {
    const result = await db
      .update(users)
      .set({
        googleId: params.googleId,
        status: USER_STATUS_MAP.ACTIVE,
        lastLoginAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(users.id, params.id))
      .returning();
    const updated = result[0];
    if (!updated) return null;
    if (isSqliteRuntime()) {
      const fresh = await this.findById(updated.id);
      return fresh ?? normalizeUserRow(updated);
    }
    return normalizeUserRow(updated);
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
    const updated = result[0];
    if (!updated) return null;
    if (isSqliteRuntime()) {
      const fresh = await this.findById(updated.id);
      return fresh ?? normalizeUserRow(updated);
    }
    return normalizeUserRow(updated);
  },

  /**
   * Update user status
   * Admin-only operation for user management
   */
  async updateStatus(id: string, status: UserStatus): Promise<User | null> {
    const result = await db
      .update(users)
      .set({ status, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    const updated = result[0];
    if (!updated) return null;
    if (isSqliteRuntime()) {
      const fresh = await this.findById(updated.id);
      return fresh ?? normalizeUserRow(updated);
    }
    return normalizeUserRow(updated);
  },

  /**
   * Mark user as deleted
   */
  async markDeleted(id: string): Promise<User | null> {
    const result = await db
      .update(users)
      .set({ status: USER_STATUS_MAP.DELETED, deletedAt: new Date(), updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    const updated = result[0];
    if (!updated) return null;
    if (isSqliteRuntime()) {
      const fresh = await this.findById(updated.id);
      return fresh ?? normalizeUserRow(updated);
    }
    return normalizeUserRow(updated);
  },

  /**
   * Update user's last login timestamp
   */
  async updateLastLogin(id: string): Promise<void> {
    await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, id));
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
    role?: Role;
    status?: UserStatus;
  }): Promise<{ users: User[]; total: number }> {
    const normalizedSearch = params.search?.trim().toLowerCase();
    const limit = Math.min(Math.max(params.limit ?? 50, 1), 200);
    const offset = Math.max(params.offset ?? 0, 0);

    const filters = [];

    if (normalizedSearch) {
      filters.push(like(sql`lower(${users.email})`, `%${normalizedSearch}%`));
    }

    if (params.role) {
      filters.push(eq(users.role, params.role));
    }

    if (params.status) {
      filters.push(eq(users.status, params.status));
    }

    const whereClause = filters.length > 0 ? and(...filters) : undefined;

    const listQuery = isSqliteRuntime()
      ? db.select(sqliteSelectFields).from(users)
      : db.select(baseSelectFields).from(users);
    const filteredList = whereClause ? listQuery.where(whereClause) : listQuery;
    const list = await filteredList
      .orderBy(sql`${users.lastLoginAt} is null`, desc(users.lastLoginAt), desc(users.createdAt))
      .limit(limit)
      .offset(offset);

    const countQuery = db.select({ count: sql<number>`count(*)` }).from(users);
    const countResult = await (whereClause ? countQuery.where(whereClause) : countQuery);
    const total = Number(countResult[0]?.count ?? 0);

    return { users: list.map(normalizeUserRow), total };
  }
};
