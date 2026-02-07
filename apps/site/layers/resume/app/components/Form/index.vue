<template>
  <div class="resume-form">
    <form class="space-y-8" @submit.prevent="handleSubmit">
      <UAccordion
        v-model="activeSection"
        type="single"
        :collapsible="true"
        :unmount-on-hide="false"
        :items="sectionItems"
        class="resume-form__sections"
      >
        <template #personal-info>
          <ResumeFormSectionPersonalInfo
            :model-value="formData.personalInfo"
            @update:model-value="handlePersonalInfoUpdate"
          />
        </template>

        <template #summary>
          <ResumeFormSectionSummary
            :model-value="formData.summary"
            @update:model-value="handleSummaryUpdate"
          />
        </template>

        <template #skills>
          <ResumeFormSectionSkills
            :model-value="formData.skills"
            @update:model-value="handleSkillsUpdate"
          />
        </template>

        <template #experience>
          <ResumeFormSectionExperience
            :model-value="formData.experience"
            @update:model-value="handleExperienceUpdate"
          />
        </template>

        <template #education>
          <ResumeFormSectionEducation
            :model-value="formData.education"
            @update:model-value="handleEducationUpdate"
          />
        </template>

        <template #certifications>
          <ResumeFormSectionCertifications
            :model-value="formData.certifications"
            @update:model-value="handleCertificationsUpdate"
          />
        </template>

        <template #additional>
          <ResumeFormSectionCustomSections
            :model-value="formData.customSections"
            @update:model-value="handleCustomSectionsUpdate"
          />
        </template>

        <template #languages>
          <ResumeFormSectionLanguages
            :model-value="formData.languages"
            @update:model-value="handleLanguagesUpdate"
          />
        </template>
      </UAccordion>

      <!-- Validation Error -->
      <UAlert
        v-if="validationError"
        color="error"
        variant="soft"
        icon="i-lucide-alert-circle"
        :title="$t('resume.form.validationError')"
        :description="validationError"
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

import type { AccordionItem } from '#ui/types';
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

defineOptions({ name: 'ResumeForm' });

const props = withDefaults(
  defineProps<{
    /**
     * Resume content to edit
     */
    modelValue: ResumeContent;
  }>(),
  {}
);

const emit = defineEmits<{
  'update:modelValue': [value: ResumeContent];
}>();

const { t } = useI18n();

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

const validationError = ref<string | null>(null);
const lastEmittedSnapshot = ref<string | null>(null);
const activeSection = ref<string | undefined>(undefined);

const sectionItems = computed<AccordionItem[]>(() => [
  {
    label: t('resume.form.personalInfo.title'),
    value: 'personal-info',
    slot: 'personal-info'
  },
  {
    label: t('resume.form.summary.title'),
    value: 'summary',
    slot: 'summary'
  },
  {
    label: t('resume.form.skills.title'),
    value: 'skills',
    slot: 'skills'
  },
  {
    label: t('resume.form.experience.title'),
    value: 'experience',
    slot: 'experience'
  },
  {
    label: t('resume.form.education.title'),
    value: 'education',
    slot: 'education'
  },
  {
    label: t('resume.form.certifications.title'),
    value: 'certifications',
    slot: 'certifications'
  },
  {
    label: t('resume.form.customSections.title'),
    value: 'additional',
    slot: 'additional'
  },
  {
    label: t('resume.form.languages.title'),
    value: 'languages',
    slot: 'languages'
  }
]);

const emitContentUpdate = () => {
  validationError.value = null;
  const nextContent = buildContent();
  lastEmittedSnapshot.value = JSON.stringify(nextContent);
  emit('update:modelValue', nextContent);
};

const handlePersonalInfoUpdate = (value: PersonalInfo) => {
  formData.personalInfo = value;
  emitContentUpdate();
};

const handleSummaryUpdate = (value: string | undefined) => {
  formData.summary = value;
  emitContentUpdate();
};

const handleSkillsUpdate = (value: SkillGroup[]) => {
  formData.skills = value;
  emitContentUpdate();
};

const handleExperienceUpdate = (value: ExperienceEntry[]) => {
  formData.experience = value;
  emitContentUpdate();
};

const handleEducationUpdate = (value: EducationEntry[]) => {
  formData.education = value;
  emitContentUpdate();
};

const handleCertificationsUpdate = (value: CertificationEntry[] | undefined) => {
  formData.certifications = value;
  emitContentUpdate();
};

const handleCustomSectionsUpdate = (value: CustomSection[] | undefined) => {
  formData.customSections = value;
  emitContentUpdate();
};

const handleLanguagesUpdate = (value: ResumeLanguage[] | undefined) => {
  formData.languages = value;
  emitContentUpdate();
};

// Watch for external modelValue changes
watch(
  () => props.modelValue,
  newValue => {
    const incomingSnapshot = JSON.stringify(newValue);
    if (incomingSnapshot === lastEmittedSnapshot.value) return;

    Object.assign(formData, createFormData(newValue));
  },
  { deep: true }
);

/**
 * Build ResumeContent from form data
 */
function buildContent(): ResumeContent {
  const rawFormData = toRaw(formData);

  return {
    personalInfo: { ...rawFormData.personalInfo },
    summary: rawFormData.summary?.trim() || undefined,
    experience: rawFormData.experience.map(entry => ({ ...entry })),
    education: rawFormData.education.map(entry => ({ ...entry })),
    skills: rawFormData.skills.map(group => ({
      type: group.type,
      skills: [...group.skills]
    })),
    certifications:
      rawFormData.certifications && rawFormData.certifications.length > 0
        ? rawFormData.certifications.map(entry => ({ ...entry }))
        : undefined,
    languages:
      rawFormData.languages && rawFormData.languages.length > 0
        ? rawFormData.languages.map(entry => ({ ...entry }))
        : undefined,
    customSections:
      rawFormData.customSections && rawFormData.customSections.length > 0
        ? rawFormData.customSections.map(section => ({
            sectionTitle: section.sectionTitle,
            items: section.items.map(item => ({ ...item }))
          }))
        : undefined
  };
}

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

  lastEmittedSnapshot.value = JSON.stringify(content);
  emit('update:modelValue', content);
};

/**
 * Expose validation for external use
 */
defineExpose({
  validate
});
</script>

<style lang="scss">
.resume-form {
  // Component-specific styles if needed
}
</style>
