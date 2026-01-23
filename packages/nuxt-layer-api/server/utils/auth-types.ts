/**
 * Auth Type Extensions
 *
 * Extends nuxt-auth-utils types to include required fields
 */

declare module '#auth-utils' {
  type User = {
    id: string
  }

  type UserSession = {
    user: User
  }
}

export {}
