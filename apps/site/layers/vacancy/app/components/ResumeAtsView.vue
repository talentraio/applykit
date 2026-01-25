<template>
  <section class="resume-ats-view">
    <header class="resume-ats-view__header space-y-2">
      <h1 class="text-2xl font-semibold">
        {{ content.personalInfo.fullName }}
      </h1>
      <div
        v-if="contactItems.length"
        class="resume-ats-view__contacts space-y-1 text-sm text-muted"
      >
        <p v-for="item in contactItems" :key="item">
          {{ item }}
        </p>
      </div>
    </header>

    <div class="resume-ats-view__sections mt-6 space-y-6">
      <section v-if="content.summary" class="resume-ats-view__section space-y-2">
        <h2 class="text-lg font-semibold">
          {{ $t('resume.section.summary') }}
        </h2>
        <p class="text-sm leading-relaxed">
          {{ content.summary }}
        </p>
      </section>

      <section v-if="content.experience.length" class="resume-ats-view__section space-y-4">
        <h2 class="text-lg font-semibold">
          {{ $t('resume.section.experience') }}
        </h2>
        <div
          v-for="experience in content.experience"
          :key="`${experience.company}-${experience.position}-${experience.startDate}`"
          class="space-y-2"
        >
          <div class="space-y-1">
            <h3 class="text-base font-medium">
              {{ experience.position }} - {{ experience.company }}
            </h3>
            <p class="text-xs text-muted">
              {{ formatDateRange(experience.startDate, experience.endDate ?? undefined) }}
            </p>
          </div>
          <p class="text-sm leading-relaxed">
            {{ experience.description }}
          </p>
          <ul v-if="experience.projects?.length" class="list-disc space-y-1 pl-4 text-sm">
            <li v-for="project in experience.projects" :key="project">
              {{ project }}
            </li>
          </ul>
          <ul v-if="experience.links?.length" class="space-y-1 text-sm">
            <li v-for="link in experience.links" :key="link.link">
              <ULink :to="link.link" target="_blank" class="text-primary">
                {{ link.name }}
              </ULink>
            </li>
          </ul>
        </div>
      </section>

      <section v-if="content.education.length" class="resume-ats-view__section space-y-4">
        <h2 class="text-lg font-semibold">
          {{ $t('resume.section.education') }}
        </h2>
        <div
          v-for="education in content.education"
          :key="`${education.institution}-${education.degree}-${education.startDate}`"
          class="space-y-1"
        >
          <h3 class="text-base font-medium">
            {{ education.degree }}<span v-if="education.field">, {{ education.field }}</span>
          </h3>
          <p class="text-sm text-muted">
            {{ education.institution }}
          </p>
          <p class="text-xs text-muted">
            {{ formatDateRange(education.startDate, education.endDate ?? undefined) }}
          </p>
        </div>
      </section>

      <section v-if="content.skills.length" class="resume-ats-view__section space-y-2">
        <h2 class="text-lg font-semibold">
          {{ $t('resume.section.skills') }}
        </h2>
        <ul class="list-disc space-y-1 pl-4 text-sm">
          <li v-for="skill in content.skills" :key="skill">
            {{ skill }}
          </li>
        </ul>
      </section>

      <section v-if="content.certifications?.length" class="resume-ats-view__section space-y-2">
        <h2 class="text-lg font-semibold">
          {{ $t('resume.section.certifications') }}
        </h2>
        <ul class="list-disc space-y-1 pl-4 text-sm">
          <li v-for="certification in content.certifications" :key="certification.name">
            {{ certification.name }}
            <span v-if="certification.issuer"> - {{ certification.issuer }}</span>
            <span v-if="certification.date"> ({{ certification.date }})</span>
          </li>
        </ul>
      </section>

      <section v-if="content.languages?.length" class="resume-ats-view__section space-y-2">
        <h2 class="text-lg font-semibold">
          {{ $t('resume.section.languages') }}
        </h2>
        <ul class="list-disc space-y-1 pl-4 text-sm">
          <li v-for="language in content.languages" :key="language.language">
            {{ language.language }}
            <span v-if="language.level"> - {{ language.level }}</span>
          </li>
        </ul>
      </section>
    </div>
  </section>
</template>

<script setup lang="ts">
/**
 * Resume ATS View Component
 *
 * Plain resume rendering optimized for ATS parsing.
 * Server-rendered and lightweight (no client-only logic).
 *
 * Related: T119 (US6)
 */

import type { ResumeContent } from '@int/schema';

defineOptions({ name: 'VacancyResumeAtsView' });

const props = defineProps<{
  content: ResumeContent;
}>();

const { t } = useI18n();

const contactItems = computed(() =>
  [
    props.content.personalInfo.email,
    props.content.personalInfo.phone,
    props.content.personalInfo.location,
    props.content.personalInfo.linkedin,
    props.content.personalInfo.website
  ].filter((item): item is string => Boolean(item))
);

const formatDateRange = (startDate: string, endDate?: string | null) => {
  if (endDate) return `${startDate} - ${endDate}`;
  return `${startDate} - ${t('common.present')}`;
};
</script>

<style lang="scss">
.resume-ats-view {
  // ATS view styling is intentionally minimal
}
</style>
