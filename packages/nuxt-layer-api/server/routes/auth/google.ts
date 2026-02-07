import type { FormatSettingsConfig } from '../../types/format-settings-config';
import { USER_ROLE_MAP, USER_STATUS_MAP } from '@int/schema';
import { eventHandler, getQuery } from 'h3';
import { decode, hasLeadingSlash, hasProtocol } from 'ufo';
import { formatSettingsRepository, userRepository } from '../../data/repositories';

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

const oauthHandler = defineOAuthGoogleEventHandler({
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
          // Activate invited user with Google OAuth
          const activated = await userRepository.activateInvitedUser({
            id: existingUser.id,
            googleId
          });
          dbUser = activated ?? existingUser;

          // Seed format settings for activated invited user
          const activatedConfig = useRuntimeConfig(event);
          const activatedDefaults = (activatedConfig.public.formatSettings as FormatSettingsConfig)
            .defaults;
          await formatSettingsRepository.seedDefaults(existingUser.id, activatedDefaults);
        } else if (!existingUser.googleId) {
          // Link Google account to existing user (account merging)
          const linked = await userRepository.linkOAuthProvider(
            existingUser.id,
            'google',
            googleId
          );
          dbUser = linked ?? existingUser;
        } else {
          // User already has a different googleId - should not happen but handle gracefully
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
        googleId,
        role: USER_ROLE_MAP.PUBLIC
      });

      // Seed format settings for new user
      const newUserConfig = useRuntimeConfig(event);
      const newUserDefaults = (newUserConfig.public.formatSettings as FormatSettingsConfig)
        .defaults;
      await formatSettingsRepository.seedDefaults(dbUser.id, newUserDefaults);
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
    return sendRedirect(event, '/?auth=login&error=oauth_failed');
  }
});

export default eventHandler(async event => {
  normalizeOAuthQuery(event);
  return oauthHandler(event);
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

  if (decoded.startsWith('/auth/google') || decoded.startsWith('/auth/linkedin')) {
    return null;
  }

  if (hasProtocol(decoded, { acceptRelative: true })) {
    return null;
  }

  return decoded;
}

function normalizeOAuthQuery(event: { node: { req: { url?: string } } }): void {
  const url = new URL(event.node.req.url ?? '/', 'http://localhost');
  const params = url.searchParams;
  const keys = ['code', 'state', 'scope', 'authuser', 'prompt'];

  let changed = false;

  for (const key of keys) {
    const values = params.getAll(key);
    if (values.length > 1) {
      const lastValue = values.at(-1);
      if (!lastValue) {
        continue;
      }
      params.delete(key);
      params.set(key, lastValue);
      changed = true;
    }
  }

  if (!changed) {
    return;
  }

  const search = params.toString();
  event.node.req.url = search ? `${url.pathname}?${search}` : url.pathname;
}
