/**
 * Resumes Composable
 *
 * Client-side API for resume operations (upload, list, edit, delete)
 * Provides reactive state management for resumes
 *
 * Related: T078 (US2)
 */

import type { Resume, ResumeContent } from '@int/schema'

export interface UseResumesOptions {
  /**
   * Auto-fetch resumes on mount
   */
  immediate?: boolean
}

export interface UseResumesReturn {
  /**
   * List of resumes
   */
  resumes: Ref<Resume[]>

  /**
   * Currently selected resume
   */
  current: Ref<Resume | null>

  /**
   * Loading state
   */
  loading: Ref<boolean>

  /**
   * Error state
   */
  error: Ref<Error | null>

  /**
   * Fetch all resumes
   */
  fetchResumes: () => Promise<void>

  /**
   * Fetch a single resume by ID
   */
  fetchResume: (id: string) => Promise<Resume | null>

  /**
   * Upload and parse a resume file
   */
  uploadResume: (file: File, title?: string) => Promise<Resume>

  /**
   * Update resume content or title
   */
  updateResume: (id: string, data: { content?: ResumeContent, title?: string }) => Promise<Resume>

  /**
   * Delete a resume
   */
  deleteResume: (id: string) => Promise<void>

  /**
   * Refresh the current resume
   */
  refresh: () => Promise<void>
}

export function useResumes(options: UseResumesOptions = {}): UseResumesReturn {
  const { immediate = false } = options

  const resumes = ref<Resume[]>([])
  const current = ref<Resume | null>(null)
  const loading = ref(false)
  const error = ref<Error | null>(null)

  /**
   * Fetch all resumes for current user
   */
  const fetchResumes = async () => {
    loading.value = true
    error.value = null

    try {
      const data = await $fetch<Resume[]>('/api/resumes')
      resumes.value = data
    }
    catch (err) {
      error.value = err instanceof Error ? err : new Error('Failed to fetch resumes')
      throw error.value
    }
    finally {
      loading.value = false
    }
  }

  /**
   * Fetch a single resume by ID
   */
  const fetchResume = async (id: string): Promise<Resume | null> => {
    loading.value = true
    error.value = null

    try {
      const resume = await $fetch<Resume>(`/api/resumes/${id}`)
      current.value = resume
      return resume
    }
    catch (err) {
      error.value = err instanceof Error ? err : new Error('Failed to fetch resume')
      current.value = null
      return null
    }
    finally {
      loading.value = false
    }
  }

  /**
   * Upload and parse a resume file
   */
  const uploadResume = async (file: File, title?: string): Promise<Resume> => {
    loading.value = true
    error.value = null

    try {
      const formData = new FormData()
      formData.append('file', file)
      if (title) {
        formData.append('title', title)
      }

      const resume = await $fetch<Resume>('/api/resumes', {
        method: 'POST',
        body: formData,
      })

      // Add to list
      resumes.value.unshift(resume)
      current.value = resume

      return resume
    }
    catch (err) {
      error.value = err instanceof Error ? err : new Error('Failed to upload resume')
      throw error.value
    }
    finally {
      loading.value = false
    }
  }

  /**
   * Update resume content or title
   */
  const updateResume = async (
    id: string,
    data: { content?: ResumeContent, title?: string },
  ): Promise<Resume> => {
    loading.value = true
    error.value = null

    try {
      const resume = await $fetch<Resume>(`/api/resumes/${id}`, {
        method: 'PUT',
        body: data,
      })

      // Update in list
      const index = resumes.value.findIndex(r => r.id === id)
      if (index !== -1) {
        resumes.value[index] = resume
      }

      // Update current if it's the same resume
      if (current.value?.id === id) {
        current.value = resume
      }

      return resume
    }
    catch (err) {
      error.value = err instanceof Error ? err : new Error('Failed to update resume')
      throw error.value
    }
    finally {
      loading.value = false
    }
  }

  /**
   * Delete a resume
   */
  const deleteResume = async (id: string): Promise<void> => {
    loading.value = true
    error.value = null

    try {
      await $fetch(`/api/resumes/${id}`, {
        method: 'DELETE',
      })

      // Remove from list
      resumes.value = resumes.value.filter(r => r.id !== id)

      // Clear current if it's the deleted resume
      if (current.value?.id === id) {
        current.value = null
      }
    }
    catch (err) {
      error.value = err instanceof Error ? err : new Error('Failed to delete resume')
      throw error.value
    }
    finally {
      loading.value = false
    }
  }

  /**
   * Refresh the current resume
   */
  const refresh = async () => {
    if (current.value) {
      await fetchResume(current.value.id)
    }
  }

  // Auto-fetch on mount if immediate
  if (immediate) {
    onMounted(() => {
      fetchResumes()
    })
  }

  return {
    resumes,
    current,
    loading,
    error,
    fetchResumes,
    fetchResume,
    uploadResume,
    updateResume,
    deleteResume,
    refresh,
  }
}
