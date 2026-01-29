import { getQuery } from 'h3';
import { userRepository } from '../../data/repositories';
import { isTokenExpired } from '../../services/password';

/**
 * Verify Email Endpoint
 *
 * Verifies user email using token from URL.
 * Redirects to profile page with verification result.
 *
 * GET /api/auth/verify-email?token=xxx
 *
 * Feature: 003-auth-expansion
 */

export default defineEventHandler(async event => {
  const query = getQuery(event);
  const token = query.token;

  if (typeof token !== 'string' || !token) {
    return sendRedirect(event, '/profile?verified=false&error=missing_token');
  }

  // Find user by verification token
  const user = await userRepository.findByEmailVerificationToken(token);

  if (!user) {
    return sendRedirect(event, '/profile?verified=false&error=invalid_token');
  }

  // Check if token is expired
  if (isTokenExpired(user.emailVerificationExpires)) {
    return sendRedirect(event, '/profile?verified=false&error=expired_token');
  }

  // Verify email
  await userRepository.verifyEmail(user.id);

  return sendRedirect(event, '/profile?verified=true');
});
