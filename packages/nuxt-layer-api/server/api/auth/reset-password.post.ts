import { z } from 'zod';
import { userRepository } from '../../data/repositories';
import { hashPassword, isTokenExpired, validatePasswordStrength } from '../../services/password';

/**
 * Reset Password Endpoint
 *
 * Resets user password using a valid token.
 * Token is invalidated after use.
 *
 * POST /api/auth/reset-password
 *
 * Feature: 003-auth-expansion
 */

const ResetPasswordInputSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters')
});

export default defineEventHandler(async event => {
  const body = await readBody(event);

  // Validate input
  const parsed = ResetPasswordInputSchema.safeParse(body);
  if (!parsed.success) {
    throw createError({
      statusCode: 400,
      message: parsed.error.errors[0]?.message ?? 'Invalid input'
    });
  }

  const { token, password } = parsed.data;

  // Validate password strength
  const passwordValidation = validatePasswordStrength(password);
  if (!passwordValidation.valid) {
    throw createError({
      statusCode: 400,
      message: passwordValidation.errors[0] ?? 'Invalid password'
    });
  }

  // Find user by reset token
  const user = await userRepository.findByPasswordResetToken(token);

  if (!user) {
    throw createError({
      statusCode: 400,
      message: 'Invalid or expired token'
    });
  }

  // Check if token is expired
  if (isTokenExpired(user.passwordResetExpires)) {
    throw createError({
      statusCode: 400,
      message: 'Invalid or expired token'
    });
  }

  // Hash new password
  const passwordHash = await hashPassword(password);

  // Update password and clear reset token
  await userRepository.resetPassword(user.id, passwordHash);

  return { success: true };
});
