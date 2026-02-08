import type { VacancyListColumnVisibility } from '@int/schema';
import type { UserVacancyListPreferencesRow } from '../schema';
import { eq } from 'drizzle-orm';
import { db } from '../db';
import { userVacancyListPreferences } from '../schema';

/**
 * Vacancy List Preferences Repository
 *
 * Data access layer for user_vacancy_list_preferences table
 * Handles per-user vacancy list UI preferences (column visibility)
 */
export const vacancyListPreferencesRepository = {
  /**
   * Find preferences by user ID
   */
  async findByUserId(userId: string): Promise<UserVacancyListPreferencesRow | null> {
    const result = await db
      .select()
      .from(userVacancyListPreferences)
      .where(eq(userVacancyListPreferences.userId, userId))
      .limit(1);
    return result[0] ?? null;
  },

  /**
   * Upsert preferences for a user
   * Creates if not exists, updates if exists
   */
  async upsert(
    userId: string,
    data: { columnVisibility: VacancyListColumnVisibility }
  ): Promise<UserVacancyListPreferencesRow> {
    const result = await db
      .insert(userVacancyListPreferences)
      .values({
        userId,
        columnVisibility: data.columnVisibility
      })
      .onConflictDoUpdate({
        target: userVacancyListPreferences.userId,
        set: {
          columnVisibility: data.columnVisibility,
          updatedAt: new Date()
        }
      })
      .returning();
    return result[0]!;
  }
};
