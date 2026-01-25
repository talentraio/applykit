import { ProfileInputSchema } from '@int/schema';
import { profileRepository } from '../../data/repositories';

/**
 * PUT /api/profile
 *
 * Create or update profile for the current user
 * If profile exists, it's updated; otherwise, a new one is created
 *
 * Request body: ProfileInput (validated with Zod)
 *
 * Related: T086 (US3)
 */
export default defineEventHandler(async event => {
  // Require authentication
  const session = await requireUserSession(event);
  const userId = (session.user as { id: string }).id;

  // Parse and validate request body
  const body = await readBody(event);
  const validation = ProfileInputSchema.safeParse(body);

  if (!validation.success) {
    throw createError({
      statusCode: 400,
      message: 'Invalid request body',
      data: validation.error.errors
    });
  }

  const data = validation.data;

  // Check if profile exists
  const existingProfile = await profileRepository.findByUserId(userId);

  if (existingProfile) {
    // Update existing profile
    const updated = await profileRepository.update(userId, data);
    if (!updated) {
      throw createError({
        statusCode: 500,
        message: 'Failed to update profile'
      });
    }
    return updated;
  } else {
    // Create new profile
    return await profileRepository.create(userId, data);
  }
});
