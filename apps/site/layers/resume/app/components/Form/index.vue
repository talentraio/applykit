<template>
  <div class="resume-form">
    <form class="space-y-8" @submit.prevent="handleSubmit">
      <!-- Personal Info Section -->
      <ResumeFormSectionPersonalInfo v-model="formData.personalInfo" />

      <!-- Summary Section -->
      <ResumeFormSectionSummary v-model="formData.summary" />

      <!-- Experience Section -->
      <ResumeFormSectionExperience v-model="formData.experience" />

      <!-- Education Section -->
      <ResumeFormSectionEducation v-model="formData.education" />

      <!-- Skills Section -->
      <ResumeFormSectionSkills v-model="formData.skills" />

      <!-- Certifications Section -->
      <ResumeFormSectionCertifications v-model="formData.certifications" />

      <!-- Languages Section -->
      <ResumeFormSectionLanguages v-model="formData.languages" />

      <!-- Custom Sections -->
      <ResumeFormSectionCustomSections v-model="formData.customSections" />

      <!-- Validation Error -->
      <UAlert
        v-if="validationError"
        color="error"
        variant="soft"
        icon="i-lucide-alert-circle"
        :title="$t('resume.form.validationError')"
        :description="validationError"
      />

      <!-- Actions -->
      <ResumeFormActions
        :show-cancel="showCancel"
        :saving="saving"
        :has-unsaved-changes="hasUnsavedChanges"
        :save-success="saveSuccess"
        @cancel="handleCancel"
      />
    </form>
  </div>
</template>

<script setup lang="ts">
/**
 * ResumeForm Component
 *
 * Main form container for editing resume content.
 * Orchestrates sub-components for each section.
 */

import type {
  CertificationEntry,
  CustomSection,
  EducationEntry,
  ExperienceEntry,
  PersonalInfo,
  ResumeContent,
  ResumeLanguage,
  SkillGroup
} from '@int/schema';
import { ResumeContentSchema } from '@int/schema';

defineOptions({ name: 'ResumeForm' });

const props = withDefaults(
  defineProps<{
    /**
     * Resume content to edit
     */
    modelValue: ResumeContent;
    /**
     * Resume ID for saving changes
     */
    resumeId: string;
    /**
     * Show cancel button
     */
    showCancel?: boolean;
    /**
     * Loading state
     */
    saving?: boolean;
  }>(),
  {
    showCancel: false,
    saving: false
  }
);

const emit = defineEmits<{
  'update:modelValue': [value: ResumeContent];
  save: [content: ResumeContent];
  cancel: [];
  error: [error: Error];
}>();

// Form data structure (mutable copy of the input)
type ResumeFormData = {
  personalInfo: PersonalInfo;
  summary?: string;
  experience: ExperienceEntry[];
  education: EducationEntry[];
  skills: SkillGroup[];
  certifications?: CertificationEntry[];
  languages?: ResumeLanguage[];
  customSections?: CustomSection[];
};

// Helper to check if skills data is in legacy format (flat array of strings)
const isLegacySkillsFormat = (skills: unknown[]): skills is string[] =>
  skills.length > 0 && typeof skills[0] === 'string';

// Normalize skills from either format to SkillGroup[]
const normalizeSkills = (skills: SkillGroup[] | string[]): SkillGroup[] => {
  if (isLegacySkillsFormat(skills)) {
    // Legacy format: flat array of strings -> single "All Skills" group
    return [{ type: 'All Skills', skills: [...skills] }];
  }
  // New format: array of SkillGroup objects
  return skills.map(s => ({ type: s.type, skills: [...(s.skills ?? [])] }));
};

// Initialize form data from props
const createFormData = (content: ResumeContent): ResumeFormData => ({
  personalInfo: { ...content.personalInfo },
  summary: content.summary,
  experience: content.experience.map(e => ({ ...e })),
  education: content.education.map(e => ({ ...e })),
  skills: normalizeSkills(content.skills),
  certifications: content.certifications?.map(c => ({ ...c })),
  languages: content.languages?.map(l => ({ ...l })),
  customSections: content.customSections?.map(s => ({
    sectionTitle: s.sectionTitle,
    items: s.items.map(i => ({ ...i }))
  }))
});

const formData = reactive<ResumeFormData>(createFormData(props.modelValue));

// Track changes
const hasUnsavedChanges = ref(false);
const saveSuccess = ref(false);
const validationError = ref<string | null>(null);

// Mark as changed when any field updates
watch(
  formData,
  () => {
    hasUnsavedChanges.value = true;
    saveSuccess.value = false;
    validationError.value = null;
  },
  { deep: true }
);

// Watch for external modelValue changes
watch(
  () => props.modelValue,
  newValue => {
    if (!hasUnsavedChanges.value) {
      Object.assign(formData, createFormData(newValue));
    }
  },
  { deep: true }
);

/**
 * Build ResumeContent from form data
 */
const buildContent = (): ResumeContent => ({
  personalInfo: formData.personalInfo,
  summary: formData.summary?.trim() || undefined,
  experience: formData.experience,
  education: formData.education,
  skills: formData.skills,
  certifications:
    formData.certifications && formData.certifications.length > 0
      ? formData.certifications
      : undefined,
  languages: formData.languages && formData.languages.length > 0 ? formData.languages : undefined,
  customSections:
    formData.customSections && formData.customSections.length > 0
      ? formData.customSections
      : undefined
});

/**
 * Validate form data with Zod
 */
const validate = (): ResumeContent | null => {
  const content = buildContent();
  const result = ResumeContentSchema.safeParse(content);

  if (!result.success) {
    const errors = result.error.errors
      .map(
        (e: { path: (string | number)[]; message: string }) => `${e.path.join('.')}: ${e.message}`
      )
      .join('\n');
    validationError.value = errors;
    return null;
  }

  return result.data;
};

/**
 * Handle form submission
 */
const handleSubmit = () => {
  validationError.value = null;

  const content = validate();
  if (!content) return;

  emit('update:modelValue', content);
  emit('save', content);

  // Reset change tracking on successful validation
  hasUnsavedChanges.value = false;
  saveSuccess.value = true;

  // Clear success message after 3 seconds
  setTimeout(() => {
    saveSuccess.value = false;
  }, 3000);
};

/**
 * Handle cancel
 */
const handleCancel = () => {
  // Reset form to original values
  Object.assign(formData, createFormData(props.modelValue));
  hasUnsavedChanges.value = false;
  validationError.value = null;
  emit('cancel');
};

/**
 * Expose validation for external use
 */
defineExpose({
  validate,
  hasUnsavedChanges: computed(() => hasUnsavedChanges.value)
});
</script>

<style lang="scss">
.resume-form {
  // Component-specific styles if needed
}
</style>
