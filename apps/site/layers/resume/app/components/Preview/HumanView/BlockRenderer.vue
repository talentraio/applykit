<template>
  <div class="human-block" :class="`human-block--${block.kind}`">
    <!-- Personal Info with optional photo -->
    <template v-if="block.kind === 'personal-info'">
      <header class="flex gap-4" :class="{ 'items-start': photoUrl }">
        <!-- Profile Photo -->
        <div v-if="photoUrl" class="flex-shrink-0">
          <img
            :src="photoUrl"
            :alt="personalInfo.fullName"
            class="h-20 w-20 rounded-full border-2 border-primary/20 object-cover"
          />
        </div>

        <div class="flex-1 space-y-2">
          <h1 class="text-2xl font-semibold tracking-tight">
            {{ personalInfo.fullName }}
          </h1>
          <p v-if="personalInfo.title" class="text-sm font-medium text-primary">
            {{ personalInfo.title }}
          </p>
          <div v-if="contactItems.length" class="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted">
            <span v-for="item in contactItems" :key="item">{{ item }}</span>
          </div>
        </div>
      </header>
    </template>

    <!-- Section Heading -->
    <template v-else-if="block.kind === 'section-heading'">
      <h2
        class="mt-4 border-b-2 border-primary/20 pb-1 text-base font-semibold uppercase tracking-wide text-primary"
      >
        {{ sectionTitle }}
      </h2>
    </template>

    <!-- Summary Paragraph -->
    <template v-else-if="block.kind === 'summary-paragraph'">
      <p class="text-sm leading-relaxed text-muted">
        {{ summaryPayload.text }}
      </p>
    </template>

    <!-- Experience Header -->
    <template v-else-if="block.kind === 'experience-header'">
      <div class="mt-3 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 class="text-sm font-semibold">{{ experienceHeader.position }}</h3>
          <p class="text-xs text-muted">
            {{ experienceHeader.company }}
            <span v-if="experienceHeader.location"> · {{ experienceHeader.location }}</span>
          </p>
        </div>
        <p class="text-xs text-muted">
          {{ formatDateRange(experienceHeader.startDate, experienceHeader.endDate) }}
        </p>
      </div>
    </template>

    <!-- Experience Description -->
    <template v-else-if="block.kind === 'experience-description'">
      <p class="mt-1 text-sm leading-relaxed">
        {{ experienceDescription.text }}
      </p>
      <div v-if="experienceDescription.technologies?.length" class="mt-1 flex flex-wrap gap-1">
        <span
          v-for="tech in experienceDescription.technologies"
          :key="tech"
          class="rounded bg-neutral-100 px-1.5 py-0.5 text-xs"
        >
          {{ tech }}
        </span>
      </div>
    </template>

    <!-- Experience Bullet -->
    <template v-else-if="block.kind === 'experience-bullet'">
      <div class="flex text-sm">
        <span class="mr-2 text-primary">•</span>
        <span>{{ bulletPayload.text }}</span>
      </div>
    </template>

    <!-- Education Entry -->
    <template v-else-if="block.kind === 'education-entry'">
      <div class="mt-2 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h3 class="text-sm font-semibold">
            {{ educationEntry.degree
            }}<span v-if="educationEntry.field">, {{ educationEntry.field }}</span>
          </h3>
          <p class="text-xs text-muted">{{ educationEntry.institution }}</p>
        </div>
        <p class="text-xs text-muted">
          {{ formatDateRange(educationEntry.startDate, educationEntry.endDate) }}
        </p>
      </div>
    </template>

    <!-- Skill Group -->
    <template v-else-if="block.kind === 'skill-group'">
      <div class="mt-1">
        <p class="text-xs font-medium text-muted">{{ skillGroup.type }}</p>
        <div class="mt-1 flex flex-wrap gap-1">
          <span
            v-for="skill in skillGroup.skills"
            :key="skill"
            class="rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary"
          >
            {{ skill }}
          </span>
        </div>
      </div>
    </template>

    <!-- Certification Entry -->
    <template v-else-if="block.kind === 'certification-entry'">
      <div class="mt-1 flex items-baseline gap-2 text-sm">
        <span class="text-primary">•</span>
        <span>
          <strong>{{ certificationEntry.name }}</strong>
          <span v-if="certificationEntry.issuer" class="text-muted">
            - {{ certificationEntry.issuer }}
          </span>
          <span v-if="certificationEntry.date" class="text-xs text-muted">
            ({{ certificationEntry.date }})
          </span>
        </span>
      </div>
    </template>

    <!-- Language Entry -->
    <template v-else-if="block.kind === 'language-entry'">
      <div class="mt-1 flex items-baseline gap-2 text-sm">
        <span class="text-primary">•</span>
        <span>
          {{ languageEntry.language }}
          <span v-if="languageEntry.level" class="text-xs text-muted">
            ({{ languageEntry.level }})
          </span>
        </span>
      </div>
    </template>

    <!-- Custom Section Item -->
    <template v-else-if="block.kind === 'custom-section-item'">
      <div class="mt-1 text-sm">
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
 * Human Block Renderer
 *
 * Renders individual resume blocks with human-readable styling.
 * Clean typography with visual hierarchy.
 *
 * Related: T024 (US2)
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

defineOptions({ name: 'ResumeHumanBlockRenderer' });

const props = defineProps<{
  block: BlockModel;
  photoUrl?: string;
}>();

const { t } = useI18n();

// Type-safe payload accessors
const personalInfo = computed(() => props.block.payload as PersonalInfo);
const summaryPayload = computed(() => props.block.payload as BlockPayload['summary-paragraph']);
const experienceHeader = computed(() => props.block.payload as BlockPayload['experience-header']);
const experienceDescription = computed(
  () => props.block.payload as BlockPayload['experience-description']
);
const bulletPayload = computed(() => props.block.payload as BlockPayload['experience-bullet']);
const educationEntry = computed(() => props.block.payload as EducationEntry);
const skillGroup = computed(() => props.block.payload as SkillGroup);
const certificationEntry = computed(() => props.block.payload as CertificationEntry);
const languageEntry = computed(() => props.block.payload as ResumeLanguage);
const customSectionItem = computed(() => props.block.payload as CustomSectionItem);

// Section title from payload or i18n
const sectionTitle = computed(() => {
  const payload = props.block.payload as BlockPayload['section-heading'];
  const key = `resume.section.${payload.title}`;
  const translated = t(key);
  return translated !== key ? translated : payload.title;
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
.human-block {
  // Human view styling with visual hierarchy
}
</style>
