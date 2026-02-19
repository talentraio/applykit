import { SetDefaultResumeRequestSchema } from '@int/schema';
import { resumeRepository, userRepository } from '../../data/repositories';

/**
 * PUT /api/user/default-resume
 *
 * Set which resume is the user's default.
 * Validates resume exists and belongs to user.
 * Updates users.default_resume_id.
 *
 * Body: { resumeId: string }
 * Response 200: { success: true }
 * Errors: 401, 404
 */
export default defineEventHandler(async event => {
  const session = await requireUserSession(event);
  const userId = (session.user as { id: string }).id;

  const body = await readBody(event);
  const parsed = SetDefaultResumeRequestSchema.safeParse(body);
  if (!parsed.success) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Validation Error',
      data: { issues: parsed.error.issues }
    });
  }

  // Verify resume exists and belongs to user
  const resume = await resumeRepository.findByIdAndUserId(parsed.data.resumeId, userId);
  if (!resume) {
    throw createError({
      statusCode: 404,
      message: 'Resume not found'
    });
  }

  await userRepository.updateDefaultResumeId(userId, parsed.data.resumeId);

  return { success: true };
});
