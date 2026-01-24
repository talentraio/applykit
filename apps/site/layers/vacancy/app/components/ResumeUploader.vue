<template>
  <div class="resume-uploader space-y-4">
    <!-- Dropzone -->
    <div
      class="relative flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors"
      :class="{
        'border-primary bg-primary/5': isDragging,
        'border-neutral-300 hover:border-neutral-400 dark:border-neutral-700 dark:hover:border-neutral-600':
          !isDragging && !isUploading,
        'pointer-events-none opacity-50': isUploading
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
          <div class="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
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

        <!-- Button -->
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

    <!-- Error display -->
    <UAlert
      v-if="uploadError"
      color="error"
      variant="soft"
      icon="i-lucide-alert-circle"
      :title="$t('resume.error.uploadFailed')"
      :description="uploadError.message"
    />
  </div>
</template>

<script setup lang="ts">
/**
 * Resume Uploader Component
 *
 * Drag-and-drop file uploader for resume files (DOCX/PDF)
 * Handles file validation, upload, and parsing with loading states
 *
 * T080 [US2] ResumeUploader component
 */

import type { Resume } from '@int/schema'

defineOptions({ name: 'UserResumeUploader' })

const props = defineProps<{
  /**
   * Show upload progress
   */
  loading?: boolean
}>()

const emit = defineEmits<{
  /**
   * Emitted when file upload is initiated
   */
  upload: [file: File]
  /**
   * Emitted when upload completes successfully
   */
  success: [resume: Resume]
  /**
   * Emitted when upload fails
   */
  error: [error: Error]
}>()

const { t } = useI18n()
const { uploadResume, loading: uploading, error: uploadError } = useResumes()

const fileInput = ref<HTMLInputElement | null>(null)
const isDragging = ref(false)
const selectedFile = ref<File | null>(null)
const isUploading = computed(() => props.loading || uploading.value)

/**
 * Validate file type and size
 */
const validateFile = (file: File): string | null => {
  const validTypes = [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
    'application/pdf' // PDF
  ]

  if (!validTypes.includes(file.type)) {
    return t('resume.error.invalidFormat')
  }

  const maxSize = 10 * 1024 * 1024 // 10MB
  if (file.size > maxSize) {
    return t('resume.error.fileTooLarge')
  }

  if (file.size === 0) {
    return t('resume.error.emptyFile')
  }

  return null
}

/**
 * Handle file selection
 */
const processFile = async (file: File) => {
  // Validate file
  const error = validateFile(file)
  if (error) {
    emit('error', new Error(error))
    return
  }

  selectedFile.value = file
  emit('upload', file)

  try {
    const resume = await uploadResume(file)
    emit('success', resume)
    selectedFile.value = null

    // Reset file input
    if (fileInput.value) {
      fileInput.value.value = ''
    }
  } catch (err) {
    emit('error', err instanceof Error ? err : new Error(t('resume.error.uploadFailed')))
    selectedFile.value = null
  }
}

/**
 * Handle file selection
 */
const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0]

  if (file) {
    processFile(file)
  }
}

/**
 * Handle drag over
 */
const handleDragOver = (event: DragEvent) => {
  event.preventDefault()
  isDragging.value = true
}

/**
 * Handle drag leave
 */
const handleDragLeave = () => {
  isDragging.value = false
}

/**
 * Handle file drop
 */
const handleDrop = (event: DragEvent) => {
  event.preventDefault()
  isDragging.value = false

  const file = event.dataTransfer?.files[0]
  if (file) {
    processFile(file)
  }
}

/**
 * Trigger file input click
 */
const triggerFileInput = () => {
  fileInput.value?.click()
}
</script>
