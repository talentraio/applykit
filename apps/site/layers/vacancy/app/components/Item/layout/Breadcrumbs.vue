<template>
  <UBreadcrumb :items="items" />
</template>

<script setup lang="ts">
/**
 * VacancyItemLayoutBreadcrumbs
 *
 * Displays breadcrumb navigation: Vacancies > Company – Position > Section
 * Uses UBreadcrumb from NuxtUI v4.
 *
 * Related: T014 (US1)
 */
import type { BreadcrumbItem } from '#ui/types';

defineOptions({ name: 'VacancyItemLayoutBreadcrumbs' });

const props = withDefaults(
  defineProps<{
    vacancyId?: string;
    company?: string;
    jobPosition?: string | null;
  }>(),
  {
    vacancyId: '',
    company: '',
    jobPosition: null
  }
);

const route = useRoute();
const { t } = useI18n();

const sections = [
  { value: 'overview', labelKey: 'overview' },
  { value: 'resume', labelKey: 'resume' },
  { value: 'cover', labelKey: 'coverLetter' },
  { value: 'preparation', labelKey: 'preparation' }
] as const;

const activeSection = computed(() => {
  const match = sections.find(section => route.path.endsWith(`/${section.value}`));
  return match ?? sections[0];
});

const items = computed<BreadcrumbItem[]>(() => {
  const vacancyLabel = props.jobPosition
    ? `${props.company} – ${props.jobPosition}`
    : props.company;
  const overviewRoute = props.vacancyId ? `/vacancies/${props.vacancyId}/overview` : '/vacancies';

  return [
    {
      label: t('vacancy.breadcrumbs.vacancies'),
      to: '/vacancies'
    },
    {
      label: vacancyLabel,
      ui: {
        linkLabel: 'inline-block max-w-[15ch] truncate align-bottom md:max-w-[40ch]'
      },
      to: overviewRoute
    },
    {
      label: t(`vacancy.nav.${activeSection.value.labelKey}`)
    }
  ];
});
</script>
