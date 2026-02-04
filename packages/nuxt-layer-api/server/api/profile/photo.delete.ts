import { profileRepository } from '../../data/repositories';
import { getStorage } from '../../storage';

/**
 * DELETE /api/profile/photo
 *
 * Delete profile photo
 *
 * Response:
 * - { success: true }
 */
export default defineEventHandler(async event => {
  // Require authentication
  const session = await requireUserSession(event);
  const userId = (session.user as { id: string }).id;

  const storage = getStorage();

  try {
    // Delete all photos for this user
    const deletedCount = await storage.deleteByPrefix(`photos/${userId}/`);

    // Update profile to remove photo URL
    // Use empty string to ensure the column is cleared (undefined may be ignored by the ORM)
    await profileRepository.update(userId, { photoUrl: '' });

    return { success: true, deletedCount };
  } catch (error) {
    console.error('Failed to delete photo:', error);
    throw createError({
      statusCode: 500,
      message: 'Failed to delete photo'
    });
  }
});
