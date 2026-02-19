import { USER_STATUS_MAP } from '@int/schema';
import { getQuery } from 'h3';
import { userRepository } from '../../data/repositories';
import { isTokenExpired } from '../../services/password';
import {
  buildEmailVerificationRedirectPath,
  EMAIL_VERIFICATION_FLOW_MAP,
  resolveEmailVerificationFlow
} from '../../utils/email-verification-flow';

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
  const flow = resolveEmailVerificationFlow(query.flow);

  if (typeof token !== 'string' || !token) {
    return sendRedirect(
      event,
      buildEmailVerificationRedirectPath({
        flow,
        verified: false,
        error: 'missing_token'
      })
    );
  }

  // Find user by verification token
  const user = await userRepository.findByEmailVerificationToken(token);

  if (!user) {
    return sendRedirect(
      event,
      buildEmailVerificationRedirectPath({
        flow,
        verified: false,
        error: 'invalid_token'
      })
    );
  }

  const shouldCheckExpiry = !(
    flow === EMAIL_VERIFICATION_FLOW_MAP.INVITE && user.status === USER_STATUS_MAP.INVITED
  );

  // Check if token is expired
  if (shouldCheckExpiry && isTokenExpired(user.emailVerificationExpires)) {
    return sendRedirect(
      event,
      buildEmailVerificationRedirectPath({
        flow,
        verified: false,
        error: 'expired_token'
      })
    );
  }

  // Verify email
  await userRepository.verifyEmail(user.id);

  return sendRedirect(
    event,
    buildEmailVerificationRedirectPath({
      flow,
      verified: true
    })
  );
});
