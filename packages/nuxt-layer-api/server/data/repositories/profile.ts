import type { ProfileInput } from '@int/schema';
import type { Profile } from '../schema';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { profiles } from '../schema';

/**
 * Profile Repository
 *
 * Data access layer for profiles table
 * One-to-one relationship with users
 */
export const profileRepository = {
  /**
   * Find profile by user ID
   * Primary lookup method (one profile per user)
   */
  async findByUserId(userId: string): Promise<Profile | null> {
    const result = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
    return result[0] ?? null;
  },

  /**
   * Find profile by ID
   */
  async findById(id: string): Promise<Profile | null> {
    const result = await db.select().from(profiles).where(eq(profiles.id, id)).limit(1);
    return result[0] ?? null;
  },

  /**
   * Create profile for user
   * Called when user first fills out their profile
   */
  async create(userId: string, data: ProfileInput): Promise<Profile> {
    const result = await db
      .insert(profiles)
      .values({
        userId,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        country: data.country,
        searchRegion: data.searchRegion,
        workFormat: data.workFormat,
        languages: data.languages ?? [],
        phones: data.phones,
        photoUrl: data.photoUrl
      })
      .returning();
    return result[0]!;
  },

  /**
   * Update profile
   * Users can update their profile at any time
   */
  async update(userId: string, data: Partial<ProfileInput>): Promise<Profile | null> {
    const result = await db
      .update(profiles)
      .set({
        ...data,
        updatedAt: new Date()
      })
      .where(eq(profiles.userId, userId))
      .returning();
    return result[0] ?? null;
  },

  /**
   * Delete profile
   * Cascades from user deletion
   */
  async delete(userId: string): Promise<void> {
    await db.delete(profiles).where(eq(profiles.userId, userId));
  },

  /**
   * Check if profile exists for user
   */
  async existsForUser(userId: string): Promise<boolean> {
    const result = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.userId, userId))
      .limit(1);
    return result.length > 0;
  },

  /**
   * Check if profile is complete
   * Used to gate generation operations
   */
  async isComplete(userId: string): Promise<boolean> {
    const profile = await this.findByUserId(userId);
    if (!profile) return false;

    return (
      profile.firstName.length > 0 &&
      profile.lastName.length > 0 &&
      profile.email.length > 0 &&
      profile.country.length === 2 &&
      profile.searchRegion.length > 0
      // TODO: temporarily hidden, re-enable when languages section is ready
      // && (profile.languages?.length ?? 0) > 0
    );
  }
};
