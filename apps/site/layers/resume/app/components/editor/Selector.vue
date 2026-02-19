<template>
  <div class="resume-editor-selector">
    <USelectMenu
      v-model="selectedResumeId"
      :items="selectorItems"
      value-key="id"
      :placeholder="$t('resume.page.selectResume')"
      :search-input="false"
      icon="i-lucide-file-text"
      class="resume-editor-selector__select"
    >
      <template #item-trailing="{ item }">
        <UBadge v-if="item.isDefault" variant="subtle" color="primary" size="xs">
          {{ $t('resume.page.defaultBadge') }}
        </UBadge>
      </template>
    </USelectMenu>
  </div>
</template>

<script setup lang="ts">
/**
 * Resume Selector Component
 *
 * Dropdown to switch between resumes.
 * Shows resume names with default badge.
 * On change navigates to the selected resume page.
 *
 * Related: T030 (US3)
 */

import type { ResumeListItem } from '@int/schema';

defineOptions({ name: 'ResumeEditorSelector' });

const props = defineProps<{
  /** Currently active resume ID */
  resumeId: string;
  /** List of user's resumes */
  resumeList: ResumeListItem[];
}>();

const router = useRouter();

type SelectorItem = {
  id: string;
  label: string;
  isDefault: boolean;
};

const selectorItems = computed<SelectorItem[]>(() => {
  return props.resumeList.map(item => ({
    id: item.id,
    label: item.name,
    isDefault: item.isDefault
  }));
});

const selectedResumeId = computed({
  get: () => props.resumeId,
  set: (newId: string) => {
    if (newId && newId !== props.resumeId) {
      void router.push(`/resume/${newId}`);
    }
  }
});
</script>

<style lang="scss">
.resume-editor-selector {
  padding: 0.5rem 1rem 0;

  &__select {
    width: 100%;
  }
}
</style>
