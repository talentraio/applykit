/**
 * Accept Terms Endpoint
 *
 * Records user's acceptance of Terms of Service and Privacy Policy.
 * Stores timestamp and current legal version for GDPR compliance.
 *
 * POST /api/user/accept-terms
 */

import { AcceptTermsInputSchema } from '@int/schema';
import { userRepository } from '../../data/repositories';

export default defineEventHandler(async event => {
  const session = await getUserSession(event);

  if (!session?.user) {
    throw createError({
      statusCode: 401,
      message: 'Not authenticated'
    });
  }

  const body = await readBody(event);

  const parsed = AcceptTermsInputSchema.safeParse(body);
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: parsed.error.errors[0]?.message ?? 'Invalid input'
    });
  }

  const userId = (session.user as { id: string }).id;
  const { legalVersion } = parsed.data;

  const updatedUser = await userRepository.acceptTerms(userId, legalVersion);

  if (!updatedUser) {
    throw createError({
      statusCode: 404,
      message: 'User not found'
    });
  }

  return {
    termsAcceptedAt: updatedUser.termsAcceptedAt,
    legalVersion: updatedUser.legalVersion
  };
});
