<template>
  <div class="container mx-auto max-w-6xl p-4 py-8">
    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <UIcon name="i-lucide-loader-2" class="h-8 w-8 animate-spin text-primary" />
    </div>

    <!-- Error State -->
    <UAlert
      v-else-if="error || !resume"
      color="red"
      variant="soft"
      icon="i-lucide-alert-circle"
      :title="$t('resume.error.fetchFailed')"
      :description="error?.message || 'Resume not found'"
    >
      <template #actions>
        <UButton color="neutral" @click="goBack">
          {{ $t('common.back') }}
        </UButton>
      </template>
    </UAlert>

    <!-- Content -->
    <div v-else class="space-y-6">
      <!-- Header -->
      <div class="flex items-start justify-between">
        <div class="flex-1">
          <div class="mb-4">
            <UButton color="neutral" variant="ghost" icon="i-lucide-arrow-left" @click="goBack">
              {{ $t('common.back') }}
            </UButton>
          </div>
          <h1 class="text-3xl font-bold">
            {{ resume.title }}
          </h1>
          <p class="mt-2 text-lg text-muted">
            {{ resume.content.personalInfo.fullName }}
          </p>
        </div>
        <UButton color="red" variant="soft" icon="i-lucide-trash-2" @click="confirmDelete">
          {{ $t('common.delete') }}
        </UButton>
      </div>

      <!-- Metadata Card -->
      <UPageCard>
        <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p class="text-sm font-medium text-muted">
              {{ $t('resume.detail.sourceFile') }}
            </p>
            <p class="mt-1 text-base">
              {{ resume.sourceFileName }}
            </p>
            <UBadge
              class="mt-2"
              :color="resume.sourceFileType === 'pdf' ? 'red' : 'blue'"
              variant="soft"
            >
              {{ resume.sourceFileType.toUpperCase() }}
            </UBadge>
          </div>

          <div>
            <p class="text-sm font-medium text-muted">
              {{ $t('resume.detail.uploadedAt') }}
            </p>
            <p class="mt-1 text-base">
              {{ formatDate(resume.createdAt) }}
            </p>
          </div>

          <div>
            <p class="text-sm font-medium text-muted">
              {{ $t('resume.detail.lastModified') }}
            </p>
            <p class="mt-1 text-base">
              {{ formatDate(resume.updatedAt) }}
            </p>
          </div>

          <div>
            <p class="text-sm font-medium text-muted">Content Stats</p>
            <div class="mt-1 space-y-1 text-sm">
              <p>{{ resume.content.experience.length }} experiences</p>
              <p>{{ resume.content.education.length }} education</p>
              <p>{{ resume.content.skills.length }} skills</p>
            </div>
          </div>
        </div>
      </UPageCard>

      <!-- Tabs -->
      <UTabs
        v-model="activeTab"
        :items="[
          { key: 'editor', label: $t('resume.editor.jsonTab'), icon: 'i-lucide-code' },
          { key: 'preview', label: $t('resume.editor.previewTab'), icon: 'i-lucide-eye' }
        ]"
      >
        <template #editor>
          <UPageCard>
            <ResumeJsonEditor
              v-if="resume"
              :model-value="resume.content"
              :resume-id="resume.id"
              @save="handleSave"
              @error="handleSaveError"
            />
          </UPageCard>
        </template>

        <template #preview>
          <UPageCard>
            <div class="prose prose-slate dark:prose-invert max-w-none">
              <!-- Personal Info -->
              <div class="mb-8 border-b pb-6">
                <h2 class="mb-2 text-2xl font-bold">
                  {{ resume.content.personalInfo.fullName }}
                </h2>
                <div class="space-y-1 text-sm text-muted">
                  <p>{{ resume.content.personalInfo.email }}</p>
                  <p v-if="resume.content.personalInfo.phone">
                    {{ resume.content.personalInfo.phone }}
                  </p>
                  <p v-if="resume.content.personalInfo.location">
                    {{ resume.content.personalInfo.location }}
                  </p>
                  <div
                    v-if="
                      resume.content.personalInfo.linkedin || resume.content.personalInfo.website
                    "
                    class="flex gap-4"
                  >
                    <a
                      v-if="resume.content.personalInfo.linkedin"
                      :href="resume.content.personalInfo.linkedin"
                      target="_blank"
                      class="text-primary hover:underline"
                    >
                      LinkedIn
                    </a>
                    <a
                      v-if="resume.content.personalInfo.website"
                      :href="resume.content.personalInfo.website"
                      target="_blank"
                      class="text-primary hover:underline"
                    >
                      Website
                    </a>
                  </div>
                </div>
              </div>

              <!-- Summary -->
              <div v-if="resume.content.summary" class="mb-8">
                <h3 class="mb-3 text-lg font-semibold">Summary</h3>
                <p class="text-muted">
                  {{ resume.content.summary }}
                </p>
              </div>

              <!-- Experience -->
              <div class="mb-8">
                <h3 class="mb-4 text-lg font-semibold">Experience</h3>
                <div class="space-y-6">
                  <div
                    v-for="(exp, idx) in resume.content.experience"
                    :key="idx"
                    class="border-l-2 border-primary pl-4"
                  >
                    <h4 class="font-semibold">
                      {{ exp.position }}
                    </h4>
                    <p class="text-sm text-muted">
                      {{ exp.company }} • {{ exp.startDate }} - {{ exp.endDate || 'Present' }}
                    </p>
                    <p class="mt-2 text-sm">
                      {{ exp.description }}
                    </p>
                  </div>
                </div>
              </div>

              <!-- Education -->
              <div class="mb-8">
                <h3 class="mb-4 text-lg font-semibold">Education</h3>
                <div class="space-y-4">
                  <div v-for="(edu, idx) in resume.content.education" :key="idx">
                    <h4 class="font-semibold">
                      {{ edu.degree }}
                    </h4>
                    <p class="text-sm text-muted">
                      {{ edu.institution }} • {{ edu.startDate }} - {{ edu.endDate || 'Present' }}
                    </p>
                    <p v-if="edu.field" class="text-sm">
                      {{ edu.field }}
                    </p>
                  </div>
                </div>
              </div>

              <!-- Skills -->
              <div class="mb-8">
                <h3 class="mb-4 text-lg font-semibold">Skills</h3>
                <div class="flex flex-wrap gap-2">
                  <UBadge
                    v-for="skill in resume.content.skills"
                    :key="skill"
                    color="neutral"
                    variant="soft"
                  >
                    {{ skill }}
                  </UBadge>
                </div>
              </div>
            </div>
          </UPageCard>
        </template>
      </UTabs>

      <!-- Save Error -->
      <UAlert
        v-if="saveError"
        color="red"
        variant="soft"
        icon="i-lucide-alert-circle"
        :title="$t('resume.error.updateFailed')"
        :description="saveError.message"
      />
    </div>

    <!-- Delete Confirmation Modal -->
    <UModal v-model="showDeleteModal">
      <UCard>
        <template #header>
          <div class="flex items-center gap-3">
            <div
              class="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20"
            >
              <UIcon
                name="i-lucide-alert-triangle"
                class="h-5 w-5 text-red-600 dark:text-red-400"
              />
            </div>
            <h3 class="text-lg font-semibold">
              {{ $t('resume.delete.confirm') }}
            </h3>
          </div>
        </template>

        <p class="text-muted">
          {{ $t('resume.delete.description') }}
        </p>

        <template #footer>
          <div class="flex items-center justify-end gap-2">
            <UButton color="neutral" variant="soft" @click="showDeleteModal = false">
              {{ $t('common.cancel') }}
            </UButton>
            <UButton color="red" :loading="isDeleting" @click="handleDelete">
              {{ isDeleting ? $t('resume.delete.deleting') : $t('resume.delete.button') }}
            </UButton>
          </div>
        </template>
      </UCard>
    </UModal>
  </div>
</template>

<script setup lang="ts">
/**
 * Resume Detail Page
 *
 * View and edit resume details with JSON editor
 * Shows resume metadata and allows content editing
 *
 * T084 [US2] Resume detail page with JSON editor
 */

import type { ResumeContent } from '@int/schema'

definePageMeta({
  middleware: 'auth'
})

const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const resumeId = computed(() => route.params.id as string)

const { current: resume, loading, error, fetchResume, deleteResume } = useResumes()

const showDeleteModal = ref(false)
const isDeleting = ref(false)
const saveError = ref<Error | null>(null)
const activeTab = ref<'editor' | 'preview'>('editor')

/**
 * Fetch resume on mount
 */
onMounted(async () => {
  await fetchResume(resumeId.value)
})

/**
 * Format date
 */
const formatDate = (date: Date | string) => {
  const d = typeof date === 'string' ? new Date(date) : date
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(d)
}

/**
 * Handle save
 */
const handleSave = (_content: ResumeContent) => {
  saveError.value = null
  // Success feedback is handled in the editor component
}

/**
 * Handle save error
 */
const handleSaveError = (error: Error) => {
  saveError.value = error
}

/**
 * Confirm delete
 */
const confirmDelete = () => {
  showDeleteModal.value = true
}

/**
 * Delete resume
 */
const handleDelete = async () => {
  isDeleting.value = true
  try {
    await deleteResume(resumeId.value)
    router.push('/resumes')
  } catch (err) {
    console.error('Failed to delete resume:', err)
    saveError.value = err instanceof Error ? err : new Error(t('resume.error.deleteFailed'))
  } finally {
    isDeleting.value = false
    showDeleteModal.value = false
  }
}

/**
 * Go back to list
 */
const goBack = () => {
  router.push('/resumes')
}
</script>
