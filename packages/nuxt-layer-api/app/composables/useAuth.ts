/**
 * Authentication Composable
 *
 * Provides authentication utilities for client-side components
 * Wraps nuxt-auth-utils useUserSession with app-specific logic
 *
 * T063 [US1] useAuth composable
 */

import type { UserPublic } from '@int/schema'

export interface AuthComposable {
  /**
   * Computed indicating if the user is logged in
   */
  loggedIn: ComputedRef<boolean>
  /**
   * The current user object if logged in, null otherwise
   */
  user: ComputedRef<UserPublic | null>
  /**
   * Fetch/refresh the user session from the server
   */
  refresh: () => Promise<void>
  /**
   * Logout the current user
   */
  logout: () => Promise<void>
  /**
   * Navigate to Google OAuth login
   */
  loginWithGoogle: () => void
}

export function useAuth(): AuthComposable {
  const { loggedIn, user, fetch, clear } = useUserSession()

  /**
   * Logout and redirect to login page
   */
  const logout = async () => {
    try {
      // Call logout endpoint to clear session
      await $fetch('/api/auth/logout', { method: 'POST' })

      // Clear client-side session
      await clear()

      // Redirect to login
      await navigateTo('/login')
    }
    catch (error) {
      console.error('Logout failed:', error)
      throw error
    }
  }

  /**
   * Navigate to Google OAuth login
   */
  const loginWithGoogle = () => {
    navigateTo('/api/auth/google', { external: true })
  }

  /**
   * Refresh user session from server
   */
  const refresh = async () => {
    await fetch()
  }

  return {
    loggedIn,
    user: user as ComputedRef<UserPublic | null>,
    refresh,
    logout,
    loginWithGoogle,
  }
}
