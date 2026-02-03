<template>
  <div class="profile-form-section-photo space-y-4">
    <h3 class="text-lg font-semibold">{{ $t('profile.section.photo') }}</h3>
    <p class="text-sm text-muted">{{ $t('profile.form.photoDescription') }}</p>

    <div class="flex items-start gap-6">
      <!-- Photo Preview -->
      <div class="relative">
        <div
          class="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-default bg-neutral-100 dark:bg-neutral-800"
        >
          <NuxtImg
            v-if="previewUrl"
            :src="previewUrl"
            alt="Profile photo"
            class="h-full w-full object-cover"
          />
          <UIcon v-else name="i-lucide-user" class="h-12 w-12 text-muted" />
        </div>

        <!-- Remove button -->
        <UButton
          v-if="previewUrl"
          icon="i-lucide-x"
          color="error"
          variant="solid"
          size="xs"
          class="absolute -right-1 -top-1 rounded-full"
          @click="handleRemove"
        />
      </div>

      <!-- Upload Controls -->
      <div class="flex flex-col gap-3">
        <input
          ref="fileInputRef"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          class="hidden"
          @change="handleFileSelect"
        />

        <UButton
          icon="i-lucide-upload"
          color="primary"
          variant="soft"
          :loading="isUploading"
          :disabled="isUploading"
          @click="fileInputRef?.click()"
        >
          {{ previewUrl ? $t('profile.form.photoChange') : $t('profile.form.photoUpload') }}
        </UButton>

        <p class="text-xs text-muted">
          {{ $t('profile.form.photoFormats') }}
        </p>

        <!-- Upload error -->
        <UAlert
          v-if="uploadError"
          color="error"
          variant="soft"
          icon="i-lucide-alert-circle"
          class="mt-2"
        >
          {{ uploadError }}
        </UAlert>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * ProfileForm Photo Section
 *
 * Handles profile photo upload for human resume
 */

defineOptions({ name: 'ProfileFormSectionPhoto' });

const props = defineProps<{
  modelValue?: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string | undefined];
}>();

const { t } = useI18n();

const fileInputRef = ref<HTMLInputElement | null>(null);
const isUploading = ref(false);
const uploadError = ref<string | null>(null);

// Preview URL (either current photo or selected file preview)
const previewUrl = computed(() => props.modelValue);

/**
 * Handle file selection
 */
const handleFileSelect = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];

  if (!file) return;

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type)) {
    uploadError.value = t('profile.form.photoInvalidType');
    return;
  }

  // Validate file size (max 5MB)
  const maxSize = 5 * 1024 * 1024;
  if (file.size > maxSize) {
    uploadError.value = t('profile.form.photoTooLarge');
    return;
  }

  uploadError.value = null;
  isUploading.value = true;

  try {
    // Create form data
    const formData = new FormData();
    formData.append('file', file);

    // Upload photo
    const response = await $fetch<{ photoUrl: string }>('/api/profile/photo', {
      method: 'POST',
      body: formData
    });

    // Emit new URL
    emit('update:modelValue', response.photoUrl);
  } catch (error) {
    console.error('Photo upload failed:', error);
    uploadError.value = t('profile.form.photoUploadFailed');
  } finally {
    isUploading.value = false;
    // Reset input
    if (fileInputRef.value) {
      fileInputRef.value.value = '';
    }
  }
};

/**
 * Handle photo removal
 */
const handleRemove = async () => {
  isUploading.value = true;
  uploadError.value = null;

  try {
    await $fetch('/api/profile/photo', {
      method: 'DELETE'
    });

    emit('update:modelValue', undefined);
  } catch (error) {
    console.error('Photo deletion failed:', error);
    uploadError.value = t('profile.form.photoDeleteFailed');
  } finally {
    isUploading.value = false;
  }
};
</script>
