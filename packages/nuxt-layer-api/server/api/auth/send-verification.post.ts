import { profileRepository, userRepository } from '../../data/repositories';
import { sendVerificationEmail } from '../../services/email';
import { generateToken, getTokenExpiry } from '../../services/password';

/**
 * Send Verification Email Endpoint
 *
 * Generates a new verification token and sends email.
 * Requires authentication.
 *
 * POST /api/auth/send-verification
 *
 * Feature: 003-auth-expansion
 */

export default defineEventHandler(async event => {
  // Get current user from session
  const session = await getUserSession(event);

  if (!session || !session.user) {
    throw createError({
      statusCode: 401,
      message: 'Not authenticated'
    });
  }

  const userId = (session.user as { id: string }).id;
  const user = await userRepository.findById(userId);

  if (!user) {
    throw createError({
      statusCode: 404,
      message: 'User not found'
    });
  }

  // Check if already verified
  if (user.emailVerified) {
    return { success: true, message: 'Email already verified' };
  }

  // Generate new verification token
  const verificationToken = generateToken();
  const verificationExpires = getTokenExpiry(24); // 24 hours

  await userRepository.setEmailVerificationToken(user.id, verificationToken, verificationExpires);

  // Get profile for firstName (fallback to email prefix)
  const profile = await profileRepository.findByUserId(user.id);
  const firstName = profile?.firstName ?? user.email.split('@')[0] ?? 'User';

  // Send verification email
  await sendVerificationEmail(user.email, firstName, verificationToken);

  return { success: true };
});
