<template>
  <div class="resume-preview-personal-info border-b pb-6">
    <h2 class="mb-2 text-2xl font-bold">
      {{ personalInfo.fullName }}
    </h2>

    <p v-if="personalInfo.title" class="mb-2 text-sm font-medium text-muted">
      {{ personalInfo.title }}
    </p>

    <div class="space-y-1 text-sm text-muted">
      <p>{{ personalInfo.email }}</p>

      <p v-if="personalInfo.phone">
        {{ personalInfo.phone }}
      </p>

      <p v-if="personalInfo.location">
        {{ personalInfo.location }}
      </p>

      <div v-if="safeLinkedin || safeWebsite || safeGithub" class="flex flex-wrap gap-4">
        <a
          v-if="safeLinkedin"
          :href="safeLinkedin"
          target="_blank"
          rel="noopener noreferrer"
          class="text-primary hover:underline"
        >
          LinkedIn
        </a>
        <a
          v-if="safeWebsite"
          :href="safeWebsite"
          target="_blank"
          rel="noopener noreferrer"
          class="text-primary hover:underline"
        >
          Website
        </a>
        <a
          v-if="safeGithub"
          :href="safeGithub"
          target="_blank"
          rel="noopener noreferrer"
          class="text-primary hover:underline"
        >
          GitHub
        </a>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Resume Preview - Personal Info Section
 *
 * Displays personal information header with contact details and links.
 */

import type { PersonalInfo } from '@int/schema';
import { isSafeHttpUrl } from '@int/schema';

defineOptions({ name: 'ResumePreviewSectionPersonalInfo' });

const props = defineProps<{
  personalInfo: PersonalInfo;
}>();

const safeLinkedin = computed(() => {
  const link = props.personalInfo.linkedin;
  return link && isSafeHttpUrl(link) ? link : null;
});

const safeWebsite = computed(() => {
  const link = props.personalInfo.website;
  return link && isSafeHttpUrl(link) ? link : null;
});

const safeGithub = computed(() => {
  const link = props.personalInfo.github;
  return link && isSafeHttpUrl(link) ? link : null;
});
</script>
