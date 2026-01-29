import {
  llmKeyRepository,
  profileRepository,
  resumeRepository,
  usageLogRepository,
  userRepository,
  vacancyRepository
} from '../../data/repositories';
import { getStorage } from '../../storage';

/**
 * DELETE /api/profile/account
 *
 * Delete all user data except the User entity itself.
 * Sets user status to 'deleted' and deletedAt timestamp.
 *
 * Deletes:
 * - Profile (including photo)
 * - Resumes
 * - Vacancies (cascades to generations)
 * - LLM keys
 * - Usage logs
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
    // Delete profile photo from storage
    await storage.deleteByPrefix(`photos/${userId}/`);

    // Delete all user data (order matters due to potential foreign key constraints)
    // Note: generations are deleted via cascade when vacancies are deleted
    await vacancyRepository.deleteByUserId(userId);
    await resumeRepository.deleteByUserId(userId);
    await llmKeyRepository.deleteByUserId(userId);
    await usageLogRepository.deleteByUserId(userId);
    await profileRepository.delete(userId);

    // Mark user as deleted (keep the entity for audit trail)
    await userRepository.markDeleted(userId);

    // Clear the user session
    await clearUserSession(event);

    return { success: true };
  } catch (error) {
    console.error('Failed to delete account:', error);
    throw createError({
      statusCode: 500,
      message: 'Failed to delete account'
    });
  }
});
