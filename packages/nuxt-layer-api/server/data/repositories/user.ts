import type { Role, UserStatus } from '@int/schema';
import type { NewUser, User } from '../schema';
import { USER_ROLE_MAP, USER_STATUS_MAP } from '@int/schema';
import { isValid, parseISO } from 'date-fns';
import { and, desc, eq, like, sql } from 'drizzle-orm';
import { db } from '../db';
import { users } from '../schema';

type UserRow = {
  id: string;
  email: string;
  googleId: string | null;
  linkedInId: string | null;
  passwordHash: string | null;
  emailVerified: boolean;
  emailVerificationToken: string | null;
  emailVerificationExpires: Date | string | null;
  passwordResetToken: string | null;
  passwordResetExpires: Date | string | null;
  termsAcceptedAt: Date | string | null;
  legalVersion: string | null;
  role: Role;
  status: UserStatus;
  createdAt: Date | string | null;
  updatedAt: Date | string | null;
  lastLoginAt?: Date | string | null;
  deletedAt?: Date | string | null;
};

const baseSelectFields = {
  id: users.id,
  email: users.email,
  googleId: users.googleId,
  linkedInId: users.linkedInId,
  passwordHash: users.passwordHash,
  emailVerified: users.emailVerified,
  emailVerificationToken: users.emailVerificationToken,
  emailVerificationExpires: users.emailVerificationExpires,
  passwordResetToken: users.passwordResetToken,
  passwordResetExpires: users.passwordResetExpires,
  termsAcceptedAt: users.termsAcceptedAt,
  legalVersion: users.legalVersion,
  role: users.role,
  status: users.status,
  createdAt: users.createdAt,
  updatedAt: users.updatedAt,
  lastLoginAt: users.lastLoginAt,
  deletedAt: users.deletedAt
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
    emailVerified: Boolean(row.emailVerified),
    emailVerificationExpires: normalizeOptionalDate(row.emailVerificationExpires),
    passwordResetExpires: normalizeOptionalDate(row.passwordResetExpires),
    termsAcceptedAt: normalizeOptionalDate(row.termsAcceptedAt),
    legalVersion: row.legalVersion,
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
    const query = db.select(baseSelectFields).from(users);
    const result = await query.where(eq(users.id, id)).limit(1);
    const user = result[0];
    return user ? normalizeUserRow(user) : null;
  },

  /**
   * Find user by email
   * Used for login and user lookup
   */
  async findByEmail(email: string): Promise<User | null> {
    const query = db.select(baseSelectFields).from(users);
    const result = await query.where(eq(users.email, email)).limit(1);
    const user = result[0];
    return user ? normalizeUserRow(user) : null;
  },

  /**
   * Find user by Google ID
   * Used during OAuth callback to find or create user
   */
  async findByGoogleId(googleId: string): Promise<User | null> {
    const query = db.select(baseSelectFields).from(users);
    const result = await query.where(eq(users.googleId, googleId)).limit(1);
    const user = result[0];
    return user ? normalizeUserRow(user) : null;
  },

  /**
   * Find user by LinkedIn ID
   * Used during OAuth callback to find or create user
   */
  async findByLinkedInId(linkedInId: string): Promise<User | null> {
    const query = db.select(baseSelectFields).from(users);
    const result = await query.where(eq(users.linkedInId, linkedInId)).limit(1);
    const user = result[0];
    return user ? normalizeUserRow(user) : null;
  },

  /**
   * Create new user via OAuth
   * Called during first-time Google/LinkedIn OAuth login
   */
  async create(
    data: Pick<NewUser, 'email'> & {
      googleId?: string;
      linkedInId?: string;
      role?: Role;
    }
  ): Promise<User> {
    const result = await db
      .insert(users)
      .values({
        email: data.email,
        googleId: data.googleId,
        linkedInId: data.linkedInId,
        emailVerified: true, // OAuth-verified emails are trusted
        role: data.role ?? USER_ROLE_MAP.PUBLIC,
        status: USER_STATUS_MAP.ACTIVE,
        lastLoginAt: new Date()
      })
      .returning();
    const created = result[0]!;
    return normalizeUserRow(created);
  },

  /**
   * Create invited user (admin-only)
   * User has no auth method until they complete first login
   */
  async createInvited(data: { email: string; role: Role }): Promise<User> {
    const result = await db
      .insert(users)
      .values({
        email: data.email,
        role: data.role,
        status: USER_STATUS_MAP.INVITED,
        emailVerified: false
      })
      .returning();
    const created = result[0]!;
    return normalizeUserRow(created);
  },

  /**
   * Activate invited user (first login via OAuth)
   * Supports both Google and LinkedIn OAuth activation
   */
  async activateInvitedUser(params: {
    id: string;
    googleId?: string;
    linkedInId?: string;
  }): Promise<User | null> {
    const result = await db
      .update(users)
      .set({
        googleId: params.googleId,
        linkedInId: params.linkedInId,
        emailVerified: true, // OAuth emails are trusted
        status: USER_STATUS_MAP.ACTIVE,
        lastLoginAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(users.id, params.id))
      .returning();
    const updated = result[0];
    if (!updated) return null;
    return normalizeUserRow(updated);
  },

  /**
   * Activate invited user with email/password registration
   * Preserves assigned role and marks account as active
   */
  async activateInvitedWithPassword(params: {
    id: string;
    passwordHash: string;
  }): Promise<User | null> {
    const result = await db
      .update(users)
      .set({
        passwordHash: params.passwordHash,
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
        status: USER_STATUS_MAP.ACTIVE,
        lastLoginAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(users.id, params.id))
      .returning();
    const updated = result[0];
    if (!updated) return null;
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
    return normalizeUserRow(updated);
  },

  /**
   * Sanitize a deleted user's PII (GDPR tombstone).
   * Replaces email with a placeholder, nulls all OAuth IDs, tokens, and sensitive fields.
   */
  async sanitizeDeleted(id: string): Promise<void> {
    const now = new Date();
    await db
      .update(users)
      .set({
        email: `deleted+${id}@invalid.local`,
        googleId: null,
        linkedInId: null,
        passwordHash: null,
        emailVerified: false,
        emailVerificationToken: null,
        emailVerificationExpires: null,
        passwordResetToken: null,
        passwordResetExpires: null,
        lastLoginAt: null,
        status: USER_STATUS_MAP.DELETED,
        deletedAt: now,
        updatedAt: now
      })
      .where(eq(users.id, id));
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

    const listQuery = db.select(baseSelectFields).from(users);
    const filteredList = whereClause ? listQuery.where(whereClause) : listQuery;
    const list = await filteredList
      .orderBy(sql`${users.lastLoginAt} is null`, desc(users.lastLoginAt), desc(users.createdAt))
      .limit(limit)
      .offset(offset);

    const countQuery = db.select({ count: sql<number>`count(*)` }).from(users);
    const countResult = await (whereClause ? countQuery.where(whereClause) : countQuery);
    const total = Number(countResult[0]?.count ?? 0);

    return { users: list.map(normalizeUserRow), total };
  },

  // ============================================================================
  // Email/Password Authentication Methods
  // ============================================================================

  /**
   * Create new user with email/password
   * Called during registration
   */
  async createWithPassword(data: {
    email: string;
    passwordHash: string;
    emailVerificationToken: string;
    emailVerificationExpires: Date;
  }): Promise<User> {
    const result = await db
      .insert(users)
      .values({
        email: data.email,
        passwordHash: data.passwordHash,
        emailVerified: false,
        emailVerificationToken: data.emailVerificationToken,
        emailVerificationExpires: data.emailVerificationExpires,
        role: USER_ROLE_MAP.PUBLIC,
        status: USER_STATUS_MAP.ACTIVE,
        lastLoginAt: new Date()
      })
      .returning();
    const created = result[0]!;
    return normalizeUserRow(created);
  },

  /**
   * Find user by email verification token
   */
  async findByEmailVerificationToken(token: string): Promise<User | null> {
    const query = db.select(baseSelectFields).from(users);
    const result = await query.where(eq(users.emailVerificationToken, token)).limit(1);
    const user = result[0];
    return user ? normalizeUserRow(user) : null;
  },

  /**
   * Set email verification token
   * Used when user requests email verification resend
   */
  async setEmailVerificationToken(id: string, token: string, expires: Date): Promise<User | null> {
    const result = await db
      .update(users)
      .set({
        emailVerificationToken: token,
        emailVerificationExpires: expires,
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
      .returning();
    const updated = result[0];
    if (!updated) return null;
    return normalizeUserRow(updated);
  },

  /**
   * Verify user's email
   * Clears verification token after successful verification
   */
  async verifyEmail(id: string): Promise<User | null> {
    const result = await db
      .update(users)
      .set({
        emailVerified: true,
        emailVerificationToken: null,
        emailVerificationExpires: null,
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
      .returning();
    const updated = result[0];
    if (!updated) return null;
    return normalizeUserRow(updated);
  },

  /**
   * Find user by password reset token
   */
  async findByPasswordResetToken(token: string): Promise<User | null> {
    const query = db.select(baseSelectFields).from(users);
    const result = await query.where(eq(users.passwordResetToken, token)).limit(1);
    const user = result[0];
    return user ? normalizeUserRow(user) : null;
  },

  /**
   * Set password reset token
   * Used when user requests password reset
   */
  async setPasswordResetToken(id: string, token: string, expires: Date): Promise<User | null> {
    const result = await db
      .update(users)
      .set({
        passwordResetToken: token,
        passwordResetExpires: expires,
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
      .returning();
    const updated = result[0];
    if (!updated) return null;
    return normalizeUserRow(updated);
  },

  /**
   * Reset user's password
   * Clears reset token after successful reset
   */
  async resetPassword(id: string, passwordHash: string): Promise<User | null> {
    const result = await db
      .update(users)
      .set({
        passwordHash,
        passwordResetToken: null,
        passwordResetExpires: null,
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
      .returning();
    const updated = result[0];
    if (!updated) return null;
    return normalizeUserRow(updated);
  },

  /**
   * Link OAuth provider to existing account
   * Used when user logs in with OAuth and email already exists
   */
  async linkOAuthProvider(
    id: string,
    provider: 'google' | 'linkedin',
    providerId: string
  ): Promise<User | null> {
    const updateData =
      provider === 'google'
        ? { googleId: providerId, emailVerified: true, updatedAt: new Date() }
        : { linkedInId: providerId, emailVerified: true, updatedAt: new Date() };

    const result = await db.update(users).set(updateData).where(eq(users.id, id)).returning();
    const updated = result[0];
    if (!updated) return null;
    return normalizeUserRow(updated);
  },

  /**
   * Record legal consent acceptance
   */
  async acceptTerms(id: string, legalVersion: string): Promise<User | null> {
    const result = await db
      .update(users)
      .set({
        termsAcceptedAt: new Date(),
        legalVersion,
        updatedAt: new Date()
      })
      .where(eq(users.id, id))
      .returning();
    const updated = result[0];
    if (!updated) return null;
    return normalizeUserRow(updated);
  },

  /**
   * Get user with password hash for login
   * Returns full user with passwordHash field
   */
  async findByEmailWithPassword(email: string): Promise<User | null> {
    const query = db.select(baseSelectFields).from(users);
    const result = await query.where(eq(users.email, email)).limit(1);
    const user = result[0];
    return user ? normalizeUserRow(user) : null;
  }
};
