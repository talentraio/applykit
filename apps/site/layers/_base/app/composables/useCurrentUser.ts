/**
 * Current User Composable (Site App)
 *
 * Provides easy access to the current user's data across site layers
 * This is a site-specific wrapper around useAuth for convenience
 *
 * T068 [US1] useCurrentUser composable
 */

import type { UserPublic } from '@int/schema'

export type CurrentUserComposable = {
  /**
   * The current authenticated user, or null if not logged in
   */
  user: ComputedRef<UserPublic | null>
  /**
   * Whether a user is currently logged in
   */
  isLoggedIn: ComputedRef<boolean>
  /**
   * Refresh the user session from the server
   */
  refresh: () => Promise<void>
  /**
   * Logout the current user
   */
  logout: () => Promise<void>
}

/**
 * Access the current user's data
 *
 * This composable provides a clean API for components to access
 * the current user without needing to import useAuth directly
 *
 * @example
 * ```vue
 * <script setup>
 * const { user, isLoggedIn } = useCurrentUser()
 * </script>
 *
 * <template>
 *   <div v-if="isLoggedIn">
 *     Welcome, {{ user?.name }}!
 *   </div>
 * </template>
 * ```
 */
export function useCurrentUser(): CurrentUserComposable {
  const { user, loggedIn, refresh, logout } = useAuth()

  return {
    user,
    isLoggedIn: loggedIn,
    refresh,
    logout
  }
}
