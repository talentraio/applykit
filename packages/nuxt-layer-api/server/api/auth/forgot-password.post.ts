import { ForgotPasswordInputSchema } from '@int/schema';
import { profileRepository, suppressionRepository, userRepository } from '../../data/repositories';
import { sendPasswordResetEmail } from '../../services/email';
import { generateToken, getTokenExpiry } from '../../services/password';
import { computeEmailHmac } from '../../utils/email-hmac';

/**
 * Forgot Password Endpoint
 *
 * Generates a password reset token and sends email.
 * Always returns success to prevent email enumeration.
 *
 * POST /api/auth/forgot-password
 *
 * Feature: 003-auth-expansion
 */

export default defineEventHandler(async event => {
  const body = await readBody(event);

  // Validate input
  const parsed = ForgotPasswordInputSchema.safeParse(body);
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: parsed.error.errors[0]?.message ?? 'Invalid input'
    });
  }

  const { email } = parsed.data;

  // Silently skip suppressed emails (prevent enumeration)
  const hmac = computeEmailHmac(email);
  const suppressed = await suppressionRepository.isEmailSuppressed(hmac);
  if (suppressed) {
    return { success: true };
  }

  // Find user (silently fail to prevent email enumeration)
  const user = await userRepository.findByEmail(email);

  if (user && user.passwordHash) {
    // Only send reset email if user has a password (email/password account)
    const resetToken = generateToken();
    const resetExpires = getTokenExpiry(1); // 1 hour

    await userRepository.setPasswordResetToken(user.id, resetToken, resetExpires);

    // Get profile for firstName (fallback to email prefix)
    const profile = await profileRepository.findByUserId(user.id);
    const firstName = profile?.firstName ?? user.email.split('@')[0] ?? 'User';

    // Send password reset email
    await sendPasswordResetEmail(user.email, firstName, resetToken);
  }

  // Always return success to prevent email enumeration
  return { success: true };
});
