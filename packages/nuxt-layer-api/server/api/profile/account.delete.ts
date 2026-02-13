import { SUPPRESSION_REASON_MAP } from '@int/schema';
import {
  profileRepository,
  resumeRepository,
  suppressionRepository,
  usageLogRepository,
  userRepository,
  vacancyRepository
} from '../../data/repositories';
import { getStorage } from '../../storage';
import { computeEmailHmac } from '../../utils/email-hmac';

/**
 * DELETE /api/profile/account
 *
 * GDPR-compliant account deletion:
 * 1. Fetch user email before sanitizing
 * 2. Compute email HMAC and create suppression record
 * 3. Delete all user content (photos, vacancies, resumes, usage logs, profile)
 * 4. Sanitize user PII (tombstone with placeholder email)
 * 5. Clear session
 *
 * Response: { success: true }
 */
export default defineEventHandler(async event => {
  const session = await requireUserSession(event);
  const userId = (session.user as { id: string }).id;

  // Fetch user email before we sanitize
  const user = await userRepository.findById(userId);
  if (!user) {
    throw createError({ statusCode: 404, message: 'User not found' });
  }

  const emailHmac = computeEmailHmac(user.email);

  // Create suppression record first (anti-abuse protection even if later steps fail)
  await suppressionRepository.create(emailHmac, SUPPRESSION_REASON_MAP.ACCOUNT_DELETED, userId);

  // Delete profile photo from blob storage (best-effort)
  const storage = getStorage();
  await storage.deleteByPrefix(`photos/${userId}/`);

  // Delete all user content (order matters for FK constraints)
  // Generations are deleted via cascade when vacancies are deleted
  await vacancyRepository.deleteByUserId(userId);
  await resumeRepository.deleteByUserId(userId);
  await usageLogRepository.deleteByUserId(userId);
  await profileRepository.delete(userId);

  // Sanitize user PII (GDPR tombstone)
  await userRepository.sanitizeDeleted(userId);

  // Clear the user session
  await clearUserSession(event);

  return { success: true };
});
