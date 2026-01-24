/**
 * Profile Composable
 *
 * Client-side API for profile operations (get, create/update, check completeness)
 * Provides reactive state management for user profile
 *
 * Related: T088 (US3)
 */

import type { Profile, ProfileInput } from '@int/schema'

export type UseProfileOptions = {
  /**
   * Auto-fetch profile on mount
   */
  immediate?: boolean
}

export type UseProfileReturn = {
  /**
   * User profile (null if not created yet)
   */
  profile: Ref<Profile | null>

  /**
   * Profile completeness status
   */
  isComplete: Ref<boolean>

  /**
   * Loading state
   */
  loading: Ref<boolean>

  /**
   * Error state
   */
  error: Ref<Error | null>

  /**
   * Fetch profile
   */
  fetchProfile: () => Promise<void>

  /**
   * Create or update profile
   */
  saveProfile: (data: ProfileInput) => Promise<Profile>

  /**
   * Check if profile is complete
   */
  checkCompleteness: () => Promise<boolean>

  /**
   * Refresh the profile
   */
  refresh: () => Promise<void>
}

export function useProfile(options: UseProfileOptions = {}): UseProfileReturn {
  const { immediate = false } = options

  const profile = ref<Profile | null>(null)
  const isComplete = ref(false)
  const loading = ref(false)
  const error = ref<Error | null>(null)

  /**
   * Fetch profile for current user
   */
  const fetchProfile = async (): Promise<void> => {
    loading.value = true
    error.value = null

    try {
      const data = await $fetch<Profile | null>('/api/profile')
      profile.value = data
    } catch (err) {
      error.value = err instanceof Error ? err : new Error('Failed to fetch profile')
      throw error.value
    } finally {
      loading.value = false
    }
  }

  /**
   * Create or update profile
   */
  const saveProfile = async (data: ProfileInput): Promise<Profile> => {
    loading.value = true
    error.value = null

    try {
      const savedProfile = await $fetch<Profile>('/api/profile', {
        method: 'PUT',
        body: data
      })

      profile.value = savedProfile

      return savedProfile
    } catch (err) {
      error.value = err instanceof Error ? err : new Error('Failed to save profile')
      throw error.value
    } finally {
      loading.value = false
    }
  }

  /**
   * Check if profile is complete
   */
  const checkCompleteness = async (): Promise<boolean> => {
    try {
      const response = await $fetch<{ complete: boolean }>('/api/profile/complete')
      isComplete.value = response.complete
      return response.complete
    } catch (err) {
      error.value = err instanceof Error ? err : new Error('Failed to check profile completeness')
      isComplete.value = false
      return false
    }
  }

  /**
   * Refresh the profile and completeness status
   */
  const refresh = async (): Promise<void> => {
    await fetchProfile()
    await checkCompleteness()
  }

  // Auto-fetch on mount if immediate
  if (immediate) {
    onMounted(() => {
      fetchProfile()
      checkCompleteness()
    })
  }

  return {
    profile,
    isComplete,
    loading,
    error,
    fetchProfile,
    saveProfile,
    checkCompleteness,
    refresh
  }
}
