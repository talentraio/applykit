<template>
  <section class="resume-human-design1">
    <header class="resume-human-design1__header" :class="{ 'flex gap-6': photoUrl }">
      <!-- Profile Photo -->
      <div v-if="photoUrl" class="flex-shrink-0">
        <NuxtImg
          :src="photoUrl"
          :alt="content.personalInfo.fullName"
          class="h-24 w-24 rounded-full border-2 border-primary/20 object-cover"
        />
      </div>

      <div class="flex-1 space-y-4">
        <div class="space-y-2">
          <h1 class="text-3xl font-semibold tracking-tight">
            {{ content.personalInfo.fullName }}
          </h1>
          <p v-if="content.personalInfo.title" class="text-sm font-medium text-muted">
            {{ content.personalInfo.title }}
          </p>
          <p v-if="content.summary" class="text-sm text-muted">
            {{ content.summary }}
          </p>
        </div>
        <div v-if="contactItems.length" class="resume-human-design1__contacts flex flex-wrap gap-3">
          <template v-for="item in contactItems" :key="item.value">
            <ULink
              v-if="item.href"
              :to="item.href"
              :target="item.external ? '_blank' : undefined"
              class="text-sm text-primary"
            >
              {{ item.value }}
            </ULink>
            <span v-else class="text-sm text-muted">{{ item.value }}</span>
          </template>
        </div>
      </div>
    </header>

    <div class="resume-human-design1__grid mt-8 grid gap-8 lg:grid-cols-[2fr_1fr]">
      <div class="space-y-8">
        <section v-if="content.skills.length" class="resume-human-design1__section space-y-3">
          <h2 class="text-lg font-semibold">
            {{ $t('resume.section.skills') }}
          </h2>
          <!-- Single skill group - show as badges -->
          <template v-if="content.skills.length === 1">
            <div class="flex flex-wrap gap-2">
              <UBadge
                v-for="skill in content.skills[0]!.skills"
                :key="skill"
                color="primary"
                variant="soft"
                size="sm"
              >
                {{ skill }}
              </UBadge>
            </div>
          </template>
          <!-- Multiple skill groups - show with labels -->
          <template v-else>
            <div v-for="group in content.skills" :key="group.type" class="space-y-2">
              <h3 class="text-sm font-medium text-muted">{{ group.type }}</h3>
              <div class="flex flex-wrap gap-2">
                <UBadge
                  v-for="skill in group.skills"
                  :key="skill"
                  color="primary"
                  variant="soft"
                  size="sm"
                >
                  {{ skill }}
                </UBadge>
              </div>
            </div>
          </template>
        </section>

        <section v-if="content.experience.length" class="resume-human-design1__section space-y-4">
          <h2 class="text-lg font-semibold">
            {{ $t('resume.section.experience') }}
          </h2>
          <div
            v-for="experience in content.experience"
            :key="`${experience.company}-${experience.position}-${experience.startDate}`"
            class="space-y-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
          >
            <div class="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 class="text-base font-semibold">
                  {{ experience.position }}
                </h3>
                <p class="text-sm text-muted">
                  {{ experience.company }}
                </p>
              </div>
              <p class="text-xs text-muted">
                {{ formatDateRange(experience.startDate, experience.endDate ?? undefined) }}
              </p>
            </div>
            <p class="text-sm leading-relaxed">
              {{ experience.description }}
            </p>
            <ul v-if="experience.bullets?.length" class="list-disc space-y-1 pl-4 text-sm">
              <li v-for="(bullet, idx) in experience.bullets" :key="idx">
                {{ bullet }}
              </li>
            </ul>
            <p v-if="experience.technologies?.length" class="text-xs text-muted">
              {{ experience.technologies.join(', ') }}
            </p>
            <div v-if="experience.links?.length" class="flex flex-wrap gap-2">
              <ULink
                v-for="link in experience.links"
                :key="link.link"
                :to="link.link"
                target="_blank"
                class="text-sm text-primary"
              >
                {{ link.name }}
              </ULink>
            </div>
          </div>
        </section>

        <section v-if="content.education.length" class="resume-human-design1__section space-y-4">
          <h2 class="text-lg font-semibold">
            {{ $t('resume.section.education') }}
          </h2>
          <div
            v-for="education in content.education"
            :key="`${education.institution}-${education.degree}-${education.startDate}`"
            class="space-y-2"
          >
            <h3 class="text-base font-semibold">
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

        <!-- Custom Sections -->
        <section
          v-for="customSection in content.customSections"
          :key="customSection.sectionTitle"
          class="resume-human-design1__section space-y-4"
        >
          <h2 class="text-lg font-semibold">
            {{ customSection.sectionTitle }}
          </h2>
          <div v-for="(item, idx) in customSection.items" :key="idx" class="space-y-1">
            <template v-if="item.title">
              <h3 class="text-base font-medium">{{ item.title }}</h3>
              <p class="text-sm text-muted">{{ item.description }}</p>
            </template>
            <p v-else class="text-sm">{{ item.description }}</p>
          </div>
        </section>
      </div>

      <aside class="space-y-8">
        <section
          v-if="content.certifications?.length"
          class="resume-human-design1__section space-y-3"
        >
          <h2 class="text-lg font-semibold">
            {{ $t('resume.section.certifications') }}
          </h2>
          <ul class="space-y-2 text-sm text-muted">
            <li v-for="certification in content.certifications" :key="certification.name">
              <span class="font-medium text-foreground">{{ certification.name }}</span>
              <span v-if="certification.issuer"> - {{ certification.issuer }}</span>
              <span v-if="certification.date"> ({{ certification.date }})</span>
            </li>
          </ul>
        </section>

        <section v-if="content.languages?.length" class="resume-human-design1__section space-y-3">
          <h2 class="text-lg font-semibold">
            {{ $t('resume.section.languages') }}
          </h2>
          <ul class="space-y-2 text-sm text-muted">
            <li v-for="language in content.languages" :key="language.language">
              <span class="font-medium text-foreground">{{ language.language }}</span>
              <span v-if="language.level"> - {{ language.level }}</span>
            </li>
          </ul>
        </section>
      </aside>
    </div>
  </section>
</template>

<script setup lang="ts">
/**
 * Resume Human View - Design 1
 *
 * Styled resume rendering optimized for human readers.
 * Server-rendered with structured layout for readability.
 *
 * Design patterns:
 * - Two-column grid layout (2fr/1fr)
 * - Profile photo support
 * - Badge display for skills
 * - Card styling for experience entries
 *
 * Related: T024 (US2)
 */

import type { ResumeContent } from '@int/schema';

defineOptions({ name: 'ResumeHumanViewDesign1' });

const props = defineProps<{
  content: ResumeContent;
  /**
   * Profile photo URL (optional)
   */
  photoUrl?: string;
}>();

type ContactItem = {
  value: string;
  href?: string;
  external?: boolean;
};

const { t } = useI18n();

const contactItems = computed<ContactItem[]>(() => {
  const items: ContactItem[] = [];

  if (props.content.personalInfo.email) {
    items.push({
      value: props.content.personalInfo.email,
      href: `mailto:${props.content.personalInfo.email}`,
      external: false
    });
  }

  if (props.content.personalInfo.phone) {
    items.push({
      value: props.content.personalInfo.phone,
      href: `tel:${props.content.personalInfo.phone}`,
      external: false
    });
  }

  if (props.content.personalInfo.location) {
    items.push({
      value: props.content.personalInfo.location
    });
  }

  if (props.content.personalInfo.linkedin) {
    items.push({
      value: props.content.personalInfo.linkedin,
      href: props.content.personalInfo.linkedin,
      external: true
    });
  }

  if (props.content.personalInfo.website) {
    items.push({
      value: props.content.personalInfo.website,
      href: props.content.personalInfo.website,
      external: true
    });
  }

  if (props.content.personalInfo.github) {
    items.push({
      value: props.content.personalInfo.github,
      href: props.content.personalInfo.github,
      external: true
    });
  }

  return items;
});

const formatDateRange = (startDate: string, endDate?: string | null) => {
  if (endDate) return `${startDate} - ${endDate}`;
  return `${startDate} - ${t('common.present')}`;
};
</script>

<style lang="scss">
.resume-human-design1 {
  // Human view styling is handled via utility classes
}
</style>
