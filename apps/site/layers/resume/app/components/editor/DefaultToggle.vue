<template>
  <div class="resume-editor-default-toggle">
    <UButton
      class="w-full justify-center"
      size="lg"
      variant="soft"
      :color="buttonColor"
      :disabled="isButtonDisabled"
      :loading="isSubmitting"
      @click="handleSetDefault"
    >
      {{ buttonLabel }}
    </UButton>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'ResumeEditorDefaultToggle' });

const props = defineProps<{
  resumeId: string;
  isDefault: boolean;
}>();

const emit = defineEmits<{
  updated: [resumeId: string];
}>();

const { t } = useI18n();
const toast = useToast();
const resumeStore = useResumeStore();

const isSubmitting = ref(false);
const buttonLabel = computed(() =>
  props.isDefault ? t('resume.page.thisIsDefaultResume') : t('resume.page.makeDefault')
);
const buttonColor = computed(() => (props.isDefault ? 'neutral' : 'primary'));
const isButtonDisabled = computed(() => props.isDefault || isSubmitting.value);

const handleSetDefault = async () => {
  if (props.isDefault || isSubmitting.value) {
    return;
  }

  isSubmitting.value = true;

  try {
    await resumeStore.setDefaultResume(props.resumeId);
    toast.add({
      title: t('resume.page.defaultResumeUpdated'),
      color: 'success',
      icon: 'i-lucide-check'
    });
    emit('updated', props.resumeId);
  } catch (error) {
    toast.add({
      title: t('resume.error.updateFailed'),
      description: error instanceof Error ? error.message : undefined,
      color: 'error',
      icon: 'i-lucide-alert-circle'
    });
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<style lang="scss">
.resume-editor-default-toggle {
  width: 100%;
}
</style>
