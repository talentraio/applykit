<template>
  <div class="user-resumes-list-page container mx-auto max-w-6xl p-4 py-8">
    <!-- Header -->
    <div class="mb-8 flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold">
          {{ $t('resume.list.title') }}
        </h1>
        <p v-if="resumes.length > 0" class="mt-2 text-muted">
          {{ $t('resume.list.count', { count: resumes.length }) }}
        </p>
      </div>
      <UButton color="primary" icon="i-lucide-upload" size="lg" @click="goToUpload">
        {{ $t('resume.list.uploadButton') }}
      </UButton>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="flex items-center justify-center py-12">
      <UIcon name="i-lucide-loader-2" class="h-8 w-8 animate-spin text-primary" />
    </div>

    <!-- Error State -->
    <UAlert
      v-else-if="error"
      color="error"
      variant="soft"
      icon="i-lucide-alert-circle"
      :title="$t('resume.error.fetchFailed')"
      :description="error.message"
    />

    <!-- Empty State -->
    <UPageCard v-else-if="resumes.length === 0" class="text-center">
      <div class="py-12">
        <div class="flex justify-center">
          <div
            class="flex h-20 w-20 items-center justify-center rounded-full bg-neutral-100 dark:bg-neutral-800"
          >
            <UIcon name="i-lucide-file-text" class="h-10 w-10 text-muted" />
          </div>
        </div>
        <h3 class="mt-6 text-xl font-semibold">
          {{ $t('resume.list.empty') }}
        </h3>
        <p class="mt-2 text-muted">
          {{ $t('resume.list.emptyDescription') }}
        </p>
        <div class="mt-6">
          <UButton color="primary" icon="i-lucide-upload" size="lg" @click="goToUpload">
            {{ $t('resume.list.uploadButton') }}
          </UButton>
        </div>
      </div>
    </UPageCard>

    <!-- Resumes Grid -->
    <div v-else class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      <UPageCard
        v-for="resume in resumes"
        :key="resume.id"
        class="relative cursor-pointer transition-shadow hover:shadow-lg"
        @click="viewResume(resume.id)"
      >
        <template #header>
          <div class="flex items-start justify-between gap-2">
            <div class="flex-1 truncate">
              <h3 class="truncate font-semibold">
                {{ resume.title }}
              </h3>
              <p class="mt-1 text-sm text-muted">
                {{ resume.content.personalInfo.fullName }}
              </p>
            </div>
            <UBadge :color="getFileTypeBadge(resume.sourceFileType)" variant="soft">
              {{ resume.sourceFileType.toUpperCase() }}
            </UBadge>
          </div>
        </template>

        <div class="space-y-3 text-sm">
          <!-- Email -->
          <div class="flex items-center gap-2 text-muted">
            <UIcon name="i-lucide-mail" class="h-4 w-4 flex-shrink-0" />
            <span class="truncate">{{ resume.content.personalInfo.email }}</span>
          </div>

          <!-- Experience Count -->
          <div class="flex items-center gap-2 text-muted">
            <UIcon name="i-lucide-briefcase" class="h-4 w-4 flex-shrink-0" />
            <span>{{ resume.content.experience.length }} experience(s)</span>
          </div>

          <!-- Skills Count -->
          <div class="flex items-center gap-2 text-muted">
            <UIcon name="i-lucide-code" class="h-4 w-4 flex-shrink-0" />
            <span>{{ resume.content.skills.length }} skill(s)</span>
          </div>

          <UDivider />

          <!-- Dates -->
          <div class="flex items-center justify-between text-xs text-muted">
            <span>{{ formatDate(resume.createdAt) }}</span>
            <span v-if="resume.updatedAt !== resume.createdAt">
              Updated {{ formatDate(resume.updatedAt) }}
            </span>
          </div>
        </div>

        <template #footer>
          <div class="flex items-center justify-end gap-2">
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-lucide-eye"
              size="sm"
              @click.stop="viewResume(resume.id)"
            >
              {{ $t('common.view') }}
            </UButton>
            <UButton
              color="error"
              variant="ghost"
              icon="i-lucide-trash-2"
              size="sm"
              @click.stop="confirmDelete(resume.id)"
            >
              {{ $t('common.delete') }}
            </UButton>
          </div>
        </template>
      </UPageCard>
    </div>

    <!-- Delete Confirmation Modal -->
    <UModal v-model="deleteConfirmId" :open="deleteConfirmId !== null">
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
            <UButton color="neutral" variant="soft" @click="cancelDelete">
              {{ $t('common.cancel') }}
            </UButton>
            <UButton color="error" :loading="isDeleting" @click="handleDelete(deleteConfirmId!)">
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
 * Resumes List Page
 *
 * Display all resumes for the current user
 * Allows navigation to detail/edit and upload new resumes
 *
 * T082 [US2] Resumes list page
 * TR007 - Updated to use callOnce instead of immediate option
 */

import { format, parseISO } from 'date-fns';

defineOptions({ name: 'ResumesListPage' });

// Auth is handled by global middleware

const router = useRouter();
const { resumes, loading, error, fetchResumes, deleteResume } = useResumes();

// SSR-compatible data fetching
await callOnce('resumes-list', async () => {
  await fetchResumes();
});

const deleteConfirmId = ref<string | null>(null);
const isDeleting = ref(false);

/**
 * Navigate to resume detail
 */
const viewResume = (id: string) => {
  router.push(`/resumes/${id}`);
};

/**
 * Navigate to upload page
 */
const goToUpload = () => {
  router.push('/resumes/new');
};

/**
 * Show delete confirmation
 */
const confirmDelete = (id: string) => {
  deleteConfirmId.value = id;
};

/**
 * Cancel delete
 */
const cancelDelete = () => {
  deleteConfirmId.value = null;
};

/**
 * Delete resume
 */
const handleDelete = async (id: string) => {
  isDeleting.value = true;
  try {
    await deleteResume(id);
    deleteConfirmId.value = null;
  } catch (err) {
    console.error('Failed to delete resume:', err);
  } finally {
    isDeleting.value = false;
  }
};

/**
 * Format date
 */
const formatDate = (date: Date | string) => {
  const resolved = typeof date === 'string' ? parseISO(date) : date;
  return format(resolved, 'MMM d, yyyy');
};

/**
 * Get file type badge color
 */
const getFileTypeBadge = (type: string) => {
  return type === 'pdf' ? 'error' : 'primary';
};
</script>
