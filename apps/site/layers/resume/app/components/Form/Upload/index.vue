<template>
  <div class="resume-upload">
    <!-- Dropzone -->
    <div
      class="resume-upload__dropzone"
      :class="{
        'resume-upload__dropzone--active': isDragging,
        'resume-upload__dropzone--uploading': isUploading
      }"
      @click="triggerFileInput"
      @dragover="handleDragOver"
      @dragleave="handleDragLeave"
      @drop="handleDrop"
    >
      <input
        ref="fileInput"
        type="file"
        accept=".docx,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/pdf"
        class="hidden"
        @change="handleFileSelect"
      />

      <div class="space-y-4 text-center">
        <!-- Icon -->
        <div class="flex justify-center">
          <div class="resume-upload__icon">
            <UIcon v-if="!isUploading" name="i-lucide-upload" class="h-8 w-8 text-primary" />
            <UIcon v-else name="i-lucide-loader-2" class="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>

        <!-- Text -->
        <div class="space-y-2">
          <p class="text-base font-medium">
            {{
              isUploading
                ? $t('resume.upload.uploading')
                : isDragging
                  ? $t('resume.upload.dropzoneActive')
                  : $t('resume.upload.dropzone')
            }}
          </p>
          <p class="text-sm text-muted">
            {{ $t('resume.upload.formats') }}
          </p>
          <p class="text-xs text-muted">
            {{ $t('resume.upload.maxSize') }}
          </p>
        </div>

        <!-- Upload Button -->
        <div v-if="!isUploading">
          <UButton color="primary" icon="i-lucide-file-plus" @click.stop="triggerFileInput">
            {{ $t('resume.upload.button') }}
          </UButton>
        </div>

        <!-- Loading state -->
        <div v-else class="space-y-2">
          <p class="text-sm text-primary">
            {{ $t('resume.upload.parsing') }}
          </p>
          <p v-if="selectedFile" class="text-xs text-muted">
            {{ selectedFile.name }}
          </p>
        </div>
      </div>
    </div>

    <!-- Divider -->
    <div class="resume-upload__divider">
      <span class="resume-upload__divider-text">
        {{ $t('resume.upload.or') }}
      </span>
    </div>

    <!-- Create from scratch button -->
    <div class="resume-upload__create">
      <UButton
        variant="outline"
        icon="i-lucide-pencil"
        size="lg"
        block
        :disabled="isUploading"
        @click="handleCreateFromScratch"
      >
        {{ $t('resume.upload.createFromScratch') }}
      </UButton>
      <p class="mt-2 text-center text-xs text-muted">
        {{ $t('resume.upload.createFromScratchHint') }}
      </p>
    </div>

    <!-- Error display -->
    <UAlert
      v-if="error"
      color="error"
      variant="soft"
      icon="i-lucide-alert-circle"
      :title="$t('resume.error.uploadFailed')"
      :description="error"
      class="mt-4"
    />
  </div>
</template>

<script setup lang="ts">
/**
 * Resume Upload Component
 *
 * Upload form with:
 * - Drag-and-drop dropzone for DOCX/PDF files
 * - "Create from scratch" button for manual entry
 *
 * Related: T033 (US3)
 */

import type { Resume } from '@int/schema';

defineOptions({ name: 'ResumeFormUpload' });

const emit = defineEmits<{
  /** File upload started */
  upload: [file: File];
  /** Upload completed successfully */
  success: [resume: Resume];
  /** Upload failed */
  error: [error: Error];
  /** User chose to create from scratch */
  createFromScratch: [];
}>();

const { t } = useI18n();
const { uploadResume, loading } = useResumes();

const fileInput = ref<HTMLInputElement | null>(null);
const isDragging = ref(false);
const selectedFile = ref<File | null>(null);
const error = ref<string | null>(null);

const isUploading = computed(() => loading.value);

/**
 * Validate file type and size
 */
function validateFile(file: File): string | null {
  const validTypes = [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/pdf'
  ];

  if (!validTypes.includes(file.type)) {
    return t('resume.error.invalidFormat');
  }

  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    return t('resume.error.fileTooLarge');
  }

  if (file.size === 0) {
    return t('resume.error.emptyFile');
  }

  return null;
}

/**
 * Process uploaded file
 */
async function processFile(file: File) {
  error.value = null;

  const validationError = validateFile(file);
  if (validationError) {
    error.value = validationError;
    emit('error', new Error(validationError));
    return;
  }

  selectedFile.value = file;
  emit('upload', file);

  try {
    const resume = await uploadResume(file);
    emit('success', resume);
    selectedFile.value = null;

    if (fileInput.value) {
      fileInput.value.value = '';
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : t('resume.error.uploadFailed');
    error.value = message;
    emit('error', err instanceof Error ? err : new Error(message));
    selectedFile.value = null;
  }
}

function handleFileSelect(event: Event) {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    processFile(file);
  }
}

function handleDragOver(event: DragEvent) {
  event.preventDefault();
  isDragging.value = true;
}

function handleDragLeave() {
  isDragging.value = false;
}

function handleDrop(event: DragEvent) {
  event.preventDefault();
  isDragging.value = false;

  const file = event.dataTransfer?.files[0];
  if (file) {
    processFile(file);
  }
}

function triggerFileInput() {
  if (!isUploading.value) {
    fileInput.value?.click();
  }
}

function handleCreateFromScratch() {
  emit('createFromScratch');
}
</script>

<style lang="scss">
.resume-upload {
  &__dropzone {
    position: relative;
    display: flex;
    min-height: 200px;
    cursor: pointer;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border-radius: 0.5rem;
    border: 2px dashed var(--color-neutral-300);
    padding: 2rem;
    transition: all 0.15s ease;

    &--active {
      border-color: var(--color-primary-500);
      background-color: var(--color-primary-50);

      @media (prefers-color-scheme: dark) {
        background-color: var(--color-primary-950);
      }
    }

    &--uploading {
      pointer-events: none;
      opacity: 0.6;
    }

    &:hover:not(&--uploading) {
      border-color: var(--color-neutral-400);
    }

    @media (prefers-color-scheme: dark) {
      border-color: var(--color-neutral-700);

      &:hover:not(&--uploading) {
        border-color: var(--color-neutral-600);
      }
    }
  }

  &__icon {
    display: flex;
    height: 4rem;
    width: 4rem;
    align-items: center;
    justify-content: center;
    border-radius: 9999px;
    background-color: var(--color-primary-100);

    @media (prefers-color-scheme: dark) {
      background-color: var(--color-primary-900);
    }
  }

  &__divider {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 1.5rem 0;

    &::before,
    &::after {
      content: '';
      flex: 1;
      height: 1px;
      background-color: var(--color-neutral-200);

      @media (prefers-color-scheme: dark) {
        background-color: var(--color-neutral-800);
      }
    }
  }

  &__divider-text {
    padding: 0 1rem;
    font-size: 0.875rem;
    color: var(--color-neutral-500);
    text-transform: uppercase;
  }

  &__create {
    text-align: center;
  }
}
</style>
