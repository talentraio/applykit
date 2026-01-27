import { USER_ROLE_MAP } from '@int/schema';
import { getQuery } from 'h3';
import { decode, hasLeadingSlash, hasProtocol } from 'ufo';
import { userRepository } from '../../data/repositories';

/**
 * Google OAuth Handler
 *
 * Handles complete Google OAuth flow:
 * - Initial request: Redirects to Google consent screen
 * - Callback: Handles OAuth response and creates/updates user session
 *
 * Located in server/routes/ as recommended by nuxt-auth-utils.
 * The handler manages both redirect and callback on the same endpoint.
 *
 * T059, T060 [US1] Google OAuth flow
 * TR001 - Moved from server/api/ to server/routes/ per nuxt-auth-utils best practices
 */

export default defineOAuthGoogleEventHandler({
  async onSuccess(event, { user }) {
    const runtimeConfig = useRuntimeConfig(event);
    const query = getQuery(event);
    const redirectFromState = getSafeRedirect(query.state);
    const defaultRedirect = runtimeConfig.redirects?.authDefault || '/';
    const { email, sub: googleId } = user;

    if (!email || !googleId) {
      throw createError({
        statusCode: 400,
        message: 'Missing required user information from Google'
      });
    }

    // Find or create user
    let dbUser = await userRepository.findByGoogleId(googleId);

    if (!dbUser) {
      // New user - create with default public role
      dbUser = await userRepository.create({
        email,
        googleId,
        role: USER_ROLE_MAP.PUBLIC
      });
    } else {
      // Existing user - update last login
      await userRepository.updateLastLogin(dbUser.id);
    }

    // Set session
    await setUserSession(event, {
      user: {
        id: dbUser.id,
        email: dbUser.email,
        role: dbUser.role
      }
    });

    const redirectTarget = redirectFromState ?? defaultRedirect;
    return sendRedirect(event, redirectTarget);
  },

  async onError(event, error) {
    console.error('OAuth error:', error);
    return sendRedirect(event, '/login?error=oauth_failed');
  }
});

function getSafeRedirect(value: unknown): string | null {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== 'string') {
    return null;
  }

  const decoded = decode(raw).trim();
  if (!decoded || !hasLeadingSlash(decoded)) {
    return null;
  }

  if (hasProtocol(decoded, { acceptRelative: true })) {
    return null;
  }

  return decoded;
}
