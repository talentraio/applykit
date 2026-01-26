/**
 * Auth Type Extensions
 *
 * Type definitions for our extended user session
 */

import type { Role } from '@int/schema';

/**
 * Extended user type with role and email
 * This extends what we store in the session beyond nuxt-auth-utils defaults
 */
export type ExtendedUser = {
  id: string;
  email: string;
  role: Role;
};

/**
 * Extended user session
 */
export type ExtendedUserSession = {
  user: ExtendedUser;
};
