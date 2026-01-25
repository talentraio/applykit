<template>
  <div class="user-resume-json-editor space-y-4">
    <!-- Toolbar -->
    <div class="flex items-center justify-between gap-4">
      <div class="flex items-center gap-2">
        <UBadge v-if="hasUnsavedChanges" color="warning" variant="soft">
          {{ $t('resume.editor.unsavedChanges') }}
        </UBadge>
        <UBadge v-if="saveSuccess" color="success" variant="soft">
          {{ $t('resume.editor.saved') }}
        </UBadge>
      </div>

      <div class="flex items-center gap-2">
        <UButton
          color="neutral"
          variant="soft"
          icon="i-lucide-align-left"
          :disabled="!isValid || readonly"
          @click="formatJson"
        >
          Format
        </UButton>
        <UButton
          color="primary"
          icon="i-lucide-save"
          :disabled="!hasUnsavedChanges || !isValid || readonly"
          :loading="loading"
          @click="handleSave"
        >
          {{ loading ? $t('resume.editor.saving') : $t('resume.editor.save') }}
        </UButton>
      </div>
    </div>

    <!-- JSON Editor -->
    <div class="relative">
      <UTextarea
        v-model="jsonText"
        :rows="20"
        :readonly="readonly"
        class="font-mono text-sm"
        :placeholder="$t('resume.editor.title')"
        @input="handleChange"
      />
    </div>

    <!-- Validation Error -->
    <UAlert
      v-if="validationError"
      color="error"
      variant="soft"
      icon="i-lucide-alert-circle"
      :title="$t('resume.editor.invalidJson')"
      :description="validationError"
    />

    <!-- Sections Info -->
    <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <div
        v-for="section in [
          { key: 'personalInfo', icon: 'i-lucide-user' },
          { key: 'experience', icon: 'i-lucide-briefcase' },
          { key: 'education', icon: 'i-lucide-graduation-cap' },
          { key: 'skills', icon: 'i-lucide-code' }
        ]"
        :key="section.key"
        class="flex items-center gap-2 rounded-lg border border-neutral-200 p-3 dark:border-neutral-800"
      >
        <UIcon :name="section.icon" class="h-5 w-5 text-muted" />
        <span class="text-sm font-medium">{{ $t(`resume.editor.${section.key}`) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Resume JSON Editor Component
 *
 * JSON editor for viewing and editing parsed resume content
 * Includes validation and save functionality
 *
 * T081 [US2] UserResumeJsonEditor component
 */

import type { ResumeContent } from '@int/schema';
import { ResumeContentSchema } from '@int/schema';

defineOptions({ name: 'ResumeJsonEditor' });

const props = defineProps<{
  /**
   * Resume content to edit
   */
  modelValue: ResumeContent;
  /**
   * Resume ID for saving changes
   */
  resumeId: string;
  /**
   * Disable editing
   */
  readonly?: boolean;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: ResumeContent];
  save: [content: ResumeContent];
  error: [error: Error];
}>();

const { t } = useI18n();
const { updateResume, loading } = useResumes();

const jsonText = ref('');
const validationError = ref<string | null>(null);
const hasUnsavedChanges = ref(false);
const saveSuccess = ref(false);

/**
 * Initialize JSON text from props
 */
watchEffect(() => {
  if (!hasUnsavedChanges.value) {
    jsonText.value = JSON.stringify(props.modelValue, null, 2);
  }
});

/**
 * Parse and validate JSON
 */
const parseJson = (): ResumeContent | null => {
  validationError.value = null;

  try {
    const parsed = JSON.parse(jsonText.value);

    // Validate with Zod
    const result = ResumeContentSchema.safeParse(parsed);

    if (!result.success) {
      const errors = result.error.errors
        .map(
          (e: { path: (string | number)[]; message: string }) => `${e.path.join('.')}: ${e.message}`
        )
        .join(', ');
      validationError.value = errors;
      return null;
    }

    return result.data;
  } catch (err) {
    validationError.value = err instanceof Error ? err.message : t('resume.editor.invalidJson');
    return null;
  }
};

/**
 * Handle JSON change
 */
const handleChange = () => {
  hasUnsavedChanges.value = true;
  saveSuccess.value = false;
  validationError.value = null;
};

/**
 * Save changes
 */
const handleSave = async () => {
  const parsed = parseJson();

  if (!parsed) {
    return;
  }

  try {
    await updateResume(props.resumeId, { content: parsed });
    emit('update:modelValue', parsed);
    emit('save', parsed);
    hasUnsavedChanges.value = false;
    saveSuccess.value = true;

    // Clear success message after 3 seconds
    setTimeout(() => {
      saveSuccess.value = false;
    }, 3000);
  } catch (err) {
    const error = err instanceof Error ? err : new Error(t('resume.error.updateFailed'));
    validationError.value = error.message;
    emit('error', error);
  }
};

/**
 * Format JSON
 */
const formatJson = () => {
  const parsed = parseJson();
  if (parsed) {
    jsonText.value = JSON.stringify(parsed, null, 2);
    validationError.value = null;
  }
};

/**
 * Check if JSON is valid
 */
const isValid = computed(() => {
  try {
    const parsed = JSON.parse(jsonText.value);
    return ResumeContentSchema.safeParse(parsed).success;
  } catch {
    return false;
  }
});
</script>
