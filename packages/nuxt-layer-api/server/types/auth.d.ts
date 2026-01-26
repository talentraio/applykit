/**
 * Auth Type Extensions
 *
 * Extends nuxt-auth-utils types to include required fields
 */

import type { Role } from '@int/schema';

declare module '#auth-utils' {
  type User = {
    id: string;
    email: string;
    role: Role;
  };
}

export {};
