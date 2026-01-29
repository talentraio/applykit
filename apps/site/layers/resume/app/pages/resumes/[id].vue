<template>
  <div class="resume-detail-page container mx-auto max-w-6xl p-4 py-8">
    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <UIcon name="i-lucide-loader-2" class="h-8 w-8 animate-spin text-primary" />
    </div>

    <!-- Error State -->
    <UAlert
      v-else-if="error || !resume"
      color="error"
      variant="soft"
      icon="i-lucide-alert-circle"
      :title="$t('resume.error.fetchFailed')"
      :description="error?.message || 'Resume not found'"
    >
      <template #actions>
        <UButton color="neutral" to="/resumes">
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
            <UButton color="neutral" variant="ghost" icon="i-lucide-arrow-left" to="/resumes">
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
        <UButton color="error" variant="soft" icon="i-lucide-trash-2" @click="confirmDelete">
          {{ $t('common.delete') }}
        </UButton>
      </div>

      <!-- Metadata Card -->
      <UPageCard>
        <div class="flex items-start gap-6">
          <!-- Source File (flexible width) -->
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium text-muted">
              {{ $t('resume.detail.sourceFile') }}
            </p>
            <p class="mt-1 truncate text-base" :title="resume.sourceFileName">
              {{ resume.sourceFileName }}
            </p>
            <UBadge
              class="mt-2"
              :color="resume.sourceFileType === SOURCE_FILE_TYPE_MAP.PDF ? 'error' : 'primary'"
              variant="soft"
            >
              {{ resume.sourceFileType.toUpperCase() }}
            </UBadge>
          </div>

          <!-- Dates (stacked) -->
          <div class="shrink-0">
            <div class="mb-3">
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
                {{ formatDate(resume.updatedAt, resume.createdAt) }}
              </p>
            </div>
          </div>

          <!-- Content Stats (right-aligned) -->
          <div class="shrink-0 text-right">
            <p class="text-sm font-medium text-muted">Content Stats</p>
            <div class="mt-1 space-y-1 text-sm">
              <p>{{ resume.content.experience.length }} experiences</p>
              <p>{{ resume.content.education.length }} education</p>
              <p>{{ resume.content.skills.length }} skill groups</p>
            </div>
          </div>
        </div>
      </UPageCard>

      <!-- Tabs -->
      <UTabs default-value="form" :items="tabItems" class="resume-detail-tabs">
        <template #form>
          <UPageCard>
            <ResumeForm
              v-if="resume"
              :model-value="resume.content"
              :resume-id="resume.id"
              :saving="isSaving"
              @save="handleFormSave"
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
                <p
                  v-if="resume.content.personalInfo.title"
                  class="mb-2 text-sm font-medium text-muted"
                >
                  {{ resume.content.personalInfo.title }}
                </p>
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
                      resume.content.personalInfo.linkedin ||
                      resume.content.personalInfo.website ||
                      resume.content.personalInfo.github
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
                    <a
                      v-if="resume.content.personalInfo.github"
                      :href="resume.content.personalInfo.github"
                      target="_blank"
                      class="text-primary hover:underline"
                    >
                      GitHub
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

              <!-- Custom Sections (after Experience) -->
              <div v-if="resume.content.customSections?.length" class="mb-8">
                <div
                  v-for="section in resume.content.customSections"
                  :key="section.sectionTitle"
                  class="mb-6 last:mb-0"
                >
                  <h3 class="mb-4 text-lg font-semibold">{{ section.sectionTitle }}</h3>
                  <div class="space-y-3">
                    <div v-for="(item, idx) in section.items" :key="idx">
                      <h4 v-if="item.title" class="font-medium">{{ item.title }}</h4>
                      <p v-if="item.description" class="text-sm text-muted">
                        {{ item.description }}
                      </p>
                    </div>
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
                <div class="space-y-4">
                  <div v-for="group in resume.content.skills" :key="group.type">
                    <p class="mb-2 text-sm font-medium text-muted">{{ group.type }}</p>
                    <div class="flex flex-wrap gap-2">
                      <UBadge
                        v-for="skill in group.skills"
                        :key="skill"
                        color="neutral"
                        variant="soft"
                      >
                        {{ skill }}
                      </UBadge>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </UPageCard>
        </template>
      </UTabs>

      <!-- Save Error -->
      <UAlert
        v-if="saveError"
        color="error"
        variant="soft"
        icon="i-lucide-alert-circle"
        :title="$t('resume.error.updateFailed')"
        :description="saveError.message"
      />
    </div>

    <!-- Delete Confirmation Modal -->
    <UModal v-model:open="showDeleteModal">
      <template #content>
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
              <UButton color="error" :loading="isDeleting" @click="handleDelete">
                {{ isDeleting ? $t('resume.delete.deleting') : $t('resume.delete.button') }}
              </UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
/**
 * Resume Detail Page
 *
 * View and edit resume details with form editor and preview
 * Shows resume metadata and allows content editing
 *
 * T084 [US2] Resume detail page
 */

import type { ResumeContent } from '@int/schema';
import { SOURCE_FILE_TYPE_MAP } from '@int/schema';
import { format, parseISO } from 'date-fns';

defineOptions({ name: 'ResumeDetailPage' });

// Auth is handled by global middleware

const route = useRoute();
const { t } = useI18n();

const resumeId = computed(() => {
  const id = route.params.id;
  if (Array.isArray(id)) return id[0] ?? '';
  return id ?? '';
});

const { current: resume, fetchResume, updateResume, deleteResume } = useResumes();

// Fetch resume (SSR-compatible)
const { pending: loading, error } = await useAsyncData(`resume-${resumeId.value}`, () => {
  return fetchResume(resumeId.value);
});

const tabItems = computed(() => [
  {
    label: t('resume.editor.formTab'),
    icon: 'i-lucide-file-edit',
    value: 'form',
    slot: 'form'
  },
  {
    label: t('resume.editor.previewTab'),
    icon: 'i-lucide-eye',
    value: 'preview',
    slot: 'preview'
  }
]);

const showDeleteModal = ref(false);
const isDeleting = ref(false);
const isSaving = ref(false);
const saveError = ref<Error | null>(null);

/**
 * Format date
 * Handles null/undefined by returning a fallback
 */
const formatDate = (date: Date | string | null | undefined, fallback?: Date | string) => {
  if (!date) {
    if (fallback) {
      const resolvedFallback = typeof fallback === 'string' ? parseISO(fallback) : fallback;
      return format(resolvedFallback, 'dd.MM.yyyy');
    }
    return '—';
  }
  const resolved = typeof date === 'string' ? parseISO(date) : date;
  return format(resolved, 'dd.MM.yyyy');
};

/**
 * Handle save from form editor
 */
const handleFormSave = async (content: ResumeContent) => {
  saveError.value = null;
  isSaving.value = true;

  try {
    await updateResume(resumeId.value, { content });
    // Success feedback is handled in the form component
  } catch (err) {
    const error = err instanceof Error ? err : new Error(t('resume.error.updateFailed'));
    saveError.value = error;
  } finally {
    isSaving.value = false;
  }
};

/**
 * Handle save error
 */
const handleSaveError = (error: Error) => {
  saveError.value = error;
};

/**
 * Confirm delete
 */
const confirmDelete = () => {
  showDeleteModal.value = true;
};

/**
 * Delete resume
 */
const handleDelete = async () => {
  isDeleting.value = true;
  try {
    await deleteResume(resumeId.value);
    await navigateTo('/resumes');
  } catch (err) {
    console.error('Failed to delete resume:', err);
    saveError.value = err instanceof Error ? err : new Error(t('resume.error.deleteFailed'));
  } finally {
    isDeleting.value = false;
    showDeleteModal.value = false;
  }
};

/**
 * Go back to list
 */
</script>

<style lang="scss">
/**
 * SSR fallback for UTabs indicator
 * The indicator element is only rendered after hydration (client-side).
 * This provides a CSS pseudo-element fallback that shows the active tab
 * background before JS loads, then hides when the real indicator appears.
 */
.resume-detail-tabs {
  /* Active tab button - add pseudo-element as fallback indicator */
  [data-slot='trigger'][data-state='active'] {
    position: relative;
    isolation: isolate;

    /* Fallback background behind the active tab content */
    &::before {
      content: '';
      position: absolute;
      inset: 0;
      border-radius: 6px;
      background-color: var(--ui-primary);
      z-index: -1;
    }
  }

  /* When indicator exists (after hydration), hide the pseudo-element */
  &:has([data-slot='indicator']) {
    [data-slot='trigger'][data-state='active']::before {
      display: none;
    }
  }
}
</style>
