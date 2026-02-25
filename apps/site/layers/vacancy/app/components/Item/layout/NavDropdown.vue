<template>
  <UDropdownMenu
    :items="items"
    :ui="{
      content:
        'w-[var(--reka-dropdown-menu-trigger-width)] min-w-[var(--reka-dropdown-menu-trigger-width)] md:w-auto md:min-w-32'
    }"
    class="vacancy-detail-nav-dropdown w-full md:w-auto"
  >
    <UButton
      class="w-full justify-between md:w-auto"
      color="neutral"
      variant="outline"
      trailing-icon="i-lucide-chevron-down"
    >
      {{ currentLabel }}
    </UButton>
  </UDropdownMenu>
</template>

<script setup lang="ts">
/**
 * VacancyItemLayoutNavDropdown
 *
 * Dropdown menu for navigating between vacancy sub-pages:
 * Overview, Resume, Cover Letter, Preparation.
 * Current section is highlighted.
 *
 * Related: T015 (US1)
 */
import type { DropdownMenuItem } from '#ui/types';

defineOptions({ name: 'VacancyItemLayoutNavDropdown' });

const props = withDefaults(
  defineProps<{
    vacancyId?: string;
  }>(),
  {
    vacancyId: ''
  }
);

const route = useRoute();
const { t } = useI18n();
const vacancyStore = useVacancyStore();
const { getCurrentVacancyMeta } = storeToRefs(vacancyStore);

const sections = [
  { value: 'overview', labelKey: 'overview', icon: 'i-lucide-layout-dashboard' },
  { value: 'resume', labelKey: 'resume', icon: 'i-lucide-file-text' },
  { value: 'cover', labelKey: 'coverLetter', icon: 'i-lucide-mail' },
  { value: 'preparation', labelKey: 'preparation', icon: 'i-lucide-clipboard-list' }
] as const;

type Section = (typeof sections)[number]['value'];

const activeSection = computed<Section>(() => {
  const path = route.path;
  for (const section of sections) {
    if (path.endsWith(`/${section.value}`)) {
      return section.value;
    }
  }
  return 'overview';
});

const showPreparationSection = computed(() => {
  const meta = getCurrentVacancyMeta.value;
  if (!meta) return true;
  if (meta.id !== props.vacancyId) return true;
  return meta.canRequestScoreDetails;
});

const visibleSections = computed(() => {
  return sections.filter(section => {
    if (section.value !== 'preparation') {
      return true;
    }

    return showPreparationSection.value;
  });
});

const currentLabel = computed(() => {
  const section = sections.find(item => item.value === activeSection.value) ?? sections[0];
  return t(`vacancy.nav.${section.labelKey}`);
});

const getSectionRoute = (section: Section): string => {
  if (!props.vacancyId) {
    return '/vacancies';
  }

  return `/vacancies/${props.vacancyId}/${section}`;
};

const items = computed<DropdownMenuItem[][]>(() => [
  visibleSections.value.map(section => ({
    label: t(`vacancy.nav.${section.labelKey}`),
    icon: section.icon,
    to: getSectionRoute(section.value),
    exact: true
  }))
]);
</script>
