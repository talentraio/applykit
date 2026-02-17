import { USER_STATUS_MAP } from '@int/schema';
import { suppressionRepository, userRepository } from '../../../../data/repositories';
import { computeEmailHmac } from '../../../../utils/email-hmac';
import { requireSuperAdmin } from '../../../../utils/session-helpers';

type HardDeleteResponse = {
  success: true;
};

/**
 * DELETE /api/admin/users/:id/hard
 *
 * Permanently delete previously soft-deleted user account (admin-only).
 * Removes suppression by email HMAC to allow future re-registration.
 */
export default defineEventHandler(async (event): Promise<HardDeleteResponse> => {
  await requireSuperAdmin(event);

  const id = getRouterParam(event, 'id');
  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'User ID is required'
    });
  }

  const user = await userRepository.findById(id);
  if (!user) {
    throw createError({
      statusCode: 404,
      message: 'User not found'
    });
  }

  if (user.status !== USER_STATUS_MAP.DELETED) {
    throw createError({
      statusCode: 409,
      message: 'User is not in deleted status'
    });
  }

  const emailHmac = computeEmailHmac(user.email);
  await suppressionRepository.deleteByEmailHmac(emailHmac);

  const deleted = await userRepository.deletePermanently(id);
  if (!deleted) {
    throw createError({
      statusCode: 404,
      message: 'User not found'
    });
  }

  return { success: true };
});
