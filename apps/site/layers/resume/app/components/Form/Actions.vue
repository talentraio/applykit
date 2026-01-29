<template>
  <div class="resume-form-actions flex items-center justify-between gap-3 border-t pt-6">
    <div class="flex items-center gap-2">
      <UBadge v-if="hasUnsavedChanges" color="warning" variant="soft">
        {{ $t('resume.editor.unsavedChanges') }}
      </UBadge>
      <UBadge v-if="saveSuccess" color="success" variant="soft">
        {{ $t('resume.editor.saved') }}
      </UBadge>
    </div>
    <div class="flex items-center gap-3">
      <UButton
        v-if="showCancel"
        type="button"
        color="neutral"
        variant="soft"
        @click="$emit('cancel')"
      >
        {{ $t('common.cancel') }}
      </UButton>
      <UButton type="submit" color="primary" :loading="saving" size="lg">
        {{ saving ? $t('resume.editor.saving') : $t('resume.editor.save') }}
      </UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * ResumeForm Actions
 *
 * Form action buttons: submit and cancel with status badges
 */

defineOptions({ name: 'ResumeFormActions' });

defineProps<{
  showCancel?: boolean;
  saving?: boolean;
  hasUnsavedChanges?: boolean;
  saveSuccess?: boolean;
}>();

defineEmits<{
  cancel: [];
}>();
</script>
