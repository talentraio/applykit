<template>
  <div class="ats-block" :class="`ats-block--${block.kind}`">
    <!-- Personal Info -->
    <template v-if="block.kind === 'personal-info'">
      <header class="space-y-2">
        <h1 class="text-2xl font-semibold">
          {{ personalInfo.fullName }}
        </h1>
        <p v-if="personalInfo.title" class="text-sm font-medium text-muted">
          {{ personalInfo.title }}
        </p>
        <div v-if="contactItems.length" class="space-y-1 text-sm text-muted">
          <p v-for="item in contactItems" :key="item">{{ item }}</p>
        </div>
      </header>
    </template>

    <!-- Section Heading -->
    <template v-else-if="block.kind === 'section-heading'">
      <h2 class="mt-4 border-b border-neutral-200 pb-1 text-lg font-semibold">
        {{ sectionTitle }}
      </h2>
    </template>

    <!-- Summary Paragraph -->
    <template v-else-if="block.kind === 'summary-paragraph'">
      <p class="text-sm leading-relaxed">
        {{ summaryPayload.text }}
      </p>
    </template>

    <!-- Experience Header -->
    <template v-else-if="block.kind === 'experience-header'">
      <div class="mt-2 space-y-1">
        <h3 class="text-base font-medium">
          {{ experienceHeader.position }} - {{ experienceHeader.company }}
        </h3>
        <p class="text-xs text-muted">
          {{ formatDateRange(experienceHeader.startDate, experienceHeader.endDate) }}
          <span v-if="experienceHeader.location"> · {{ experienceHeader.location }}</span>
        </p>
      </div>
    </template>

    <!-- Experience Description -->
    <template v-else-if="block.kind === 'experience-description'">
      <p class="text-sm leading-relaxed">
        {{ experienceDescription.text }}
      </p>
    </template>

    <!-- Experience Bullet -->
    <template v-else-if="block.kind === 'experience-bullet'">
      <div class="flex text-sm">
        <span class="mr-2">•</span>
        <span>{{ bulletPayload.text }}</span>
      </div>
    </template>

    <!-- Experience Technologies -->
    <template v-else-if="block.kind === 'experience-technologies'">
      <p class="mt-1 text-xs text-muted">
        Tech: {{ experienceTechnologies.technologies.join(', ') }}
      </p>
    </template>

    <!-- Education Entry -->
    <template v-else-if="block.kind === 'education-entry'">
      <div class="mt-2 space-y-1">
        <h3 class="text-base font-medium">
          {{ educationEntry.degree
          }}<span v-if="educationEntry.field">, {{ educationEntry.field }}</span>
        </h3>
        <p class="text-sm text-muted">{{ educationEntry.institution }}</p>
        <p class="text-xs text-muted">
          {{ formatDateRange(educationEntry.startDate, educationEntry.endDate) }}
        </p>
      </div>
    </template>

    <!-- Skill Group -->
    <template v-else-if="block.kind === 'skill-group'">
      <div class="text-sm">
        <strong>{{ skillGroup.type }}:</strong> {{ skillGroup.skills.join(', ') }}
      </div>
    </template>

    <!-- Certification Entry -->
    <template v-else-if="block.kind === 'certification-entry'">
      <div class="flex text-sm">
        <span class="mr-2">•</span>
        <span>
          {{ certificationEntry.name }}
          <span v-if="certificationEntry.issuer"> - {{ certificationEntry.issuer }}</span>
          <span v-if="certificationEntry.date"> ({{ certificationEntry.date }})</span>
        </span>
      </div>
    </template>

    <!-- Language Entry -->
    <template v-else-if="block.kind === 'language-entry'">
      <div class="flex text-sm">
        <span class="mr-2">•</span>
        <span>
          {{ languageEntry.language }}
          <span v-if="languageEntry.level"> - {{ languageEntry.level }}</span>
        </span>
      </div>
    </template>

    <!-- Custom Section Item -->
    <template v-else-if="block.kind === 'custom-section-item'">
      <div class="text-sm">
        <template v-if="customSectionItem.title">
          <strong>{{ customSectionItem.title }}</strong> - {{ customSectionItem.description }}
        </template>
        <template v-else>
          {{ customSectionItem.description }}
        </template>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
/**
 * ATS Block Renderer
 *
 * Renders individual resume blocks with ATS-optimized styling.
 * Minimal styling for machine readability.
 *
 * Related: T023 (US2)
 */

import type {
  CertificationEntry,
  CustomSectionItem,
  EducationEntry,
  PersonalInfo,
  ResumeLanguage,
  SkillGroup
} from '@int/schema';
import type { BlockModel, BlockPayload } from '../../../types/preview';

defineOptions({ name: 'ResumeAtsBlockRenderer' });

const props = defineProps<{
  block: BlockModel;
  photoUrl?: string; // Not used in ATS view
}>();

const { t, te } = useI18n();

// Type-safe payload accessors
const personalInfo = computed(() => props.block.payload as PersonalInfo);
const summaryPayload = computed(() => props.block.payload as BlockPayload['summary-paragraph']);
const experienceHeader = computed(() => props.block.payload as BlockPayload['experience-header']);
const experienceDescription = computed(
  () => props.block.payload as BlockPayload['experience-description']
);
const bulletPayload = computed(() => props.block.payload as BlockPayload['experience-bullet']);
const experienceTechnologies = computed(
  () => props.block.payload as BlockPayload['experience-technologies']
);
const educationEntry = computed(() => props.block.payload as EducationEntry);
const skillGroup = computed(() => props.block.payload as SkillGroup);
const certificationEntry = computed(() => props.block.payload as CertificationEntry);
const languageEntry = computed(() => props.block.payload as ResumeLanguage);
const customSectionItem = computed(() => props.block.payload as CustomSectionItem);

const toTitleCase = (value: string): string => {
  return value
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

const resolveSectionTranslationKey = (title: string): string | null => {
  const normalizedTitle = title.trim().replace(/\s+/g, ' ');
  const candidates = [normalizedTitle, normalizedTitle.toLowerCase(), toTitleCase(normalizedTitle)];

  for (const candidate of candidates) {
    const key = `resume.section.${candidate}`;
    if (te(key)) {
      return key;
    }
  }

  return null;
};

// Section title from payload or i18n
const sectionTitle = computed(() => {
  const payload = props.block.payload as BlockPayload['section-heading'];
  const resolvedKey = resolveSectionTranslationKey(payload.title);
  return resolvedKey ? t(resolvedKey) : payload.title;
});

// Contact items for personal info
const contactItems = computed(() => {
  if (props.block.kind !== 'personal-info') return [];
  const info = personalInfo.value;
  return [info.email, info.phone, info.location, info.linkedin, info.github, info.website].filter(
    (item): item is string => Boolean(item)
  );
});

// Date formatting
const formatDateRange = (startDate: string, endDate?: string | null) => {
  if (endDate) return `${startDate} - ${endDate}`;
  return `${startDate} - ${t('common.present')}`;
};
</script>

<style lang="scss">
.ats-block {
  // ATS styling is intentionally minimal
  &--section-heading {
    margin-top: 1rem;
  }
}
</style>
