import { USER_ROLE_MAP, USER_STATUS_MAP } from '@int/schema';
import { getQuery } from 'h3';
import { decode, hasLeadingSlash, hasProtocol } from 'ufo';
import { userRepository } from '../../data/repositories';

/**
 * LinkedIn OAuth Handler
 *
 * Handles complete LinkedIn OAuth flow:
 * - Initial request: Redirects to LinkedIn consent screen
 * - Callback: Handles OAuth response and creates/updates user session
 *
 * Located in server/routes/ as recommended by nuxt-auth-utils.
 * The handler manages both redirect and callback on the same endpoint.
 *
 * Feature: 003-auth-expansion
 */

export default defineOAuthLinkedInEventHandler({
  async onSuccess(event, { user }) {
    const runtimeConfig = useRuntimeConfig(event);
    const query = getQuery(event);
    const redirectFromState = getSafeRedirect(query.state);
    const defaultRedirect = runtimeConfig.redirects?.authDefault || '/';

    // LinkedIn user object structure
    const email = user.email;
    const linkedInId = user.sub || user.id;

    if (!email || !linkedInId) {
      throw createError({
        statusCode: 400,
        message: 'Missing required user information from LinkedIn'
      });
    }

    // Find or create user
    let dbUser = await userRepository.findByLinkedInId(linkedInId);

    if (!dbUser) {
      // Check if user exists by email (for account linking)
      const existingUser = await userRepository.findByEmail(email);

      if (existingUser) {
        if (
          existingUser.status === USER_STATUS_MAP.BLOCKED ||
          existingUser.status === USER_STATUS_MAP.DELETED
        ) {
          throw createError({
            statusCode: 403,
            message: 'Account is not allowed to sign in'
          });
        }

        if (existingUser.status === USER_STATUS_MAP.INVITED) {
          // Activate invited user with LinkedIn OAuth
          const activated = await userRepository.activateInvitedUser({
            id: existingUser.id,
            linkedInId
          });
          dbUser = activated ?? existingUser;
        } else if (!existingUser.linkedInId) {
          // Link LinkedIn account to existing user (account merging)
          const linked = await userRepository.linkOAuthProvider(
            existingUser.id,
            'linkedin',
            linkedInId
          );
          dbUser = linked ?? existingUser;
        } else {
          // User already has a different linkedInId - should not happen but handle gracefully
          dbUser = existingUser;
        }

        await userRepository.updateLastLogin(existingUser.id);
      }
    } else {
      if (dbUser.status === USER_STATUS_MAP.BLOCKED || dbUser.status === USER_STATUS_MAP.DELETED) {
        throw createError({
          statusCode: 403,
          message: 'Account is not allowed to sign in'
        });
      }

      // Existing user - update last login
      await userRepository.updateLastLogin(dbUser.id);
    }

    if (!dbUser) {
      // New user - create with default public role
      dbUser = await userRepository.create({
        email,
        linkedInId,
        role: USER_ROLE_MAP.PUBLIC
      });
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
    console.error('LinkedIn OAuth error:', error);
    return sendRedirect(event, '/?auth=login&error=oauth_failed');
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
