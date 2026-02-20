<template>
  <div class="resume-editor-selector">
    <div class="resume-editor-selector__row">
      <USelectMenu
        v-model="selectedResumeId"
        :items="selectorItems"
        value-key="id"
        :placeholder="$t('resume.page.selectResume')"
        :search-input="false"
        :disabled="isSelectorDisabled"
        icon="i-lucide-file-text"
        class="resume-editor-selector__select"
      >
        <template #item-trailing="{ item }">
          <UBadge v-if="item.isDefault" variant="subtle" color="primary" size="xs">
            {{ $t('resume.page.defaultBadge') }}
          </UBadge>
        </template>
      </USelectMenu>

      <div v-if="$slots.actions" class="resume-editor-selector__actions">
        <slot name="actions" />
      </div>
    </div>
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
  /** Disable selector explicitly */
  disabled?: boolean;
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

const isSelectorDisabled = computed(
  () => (props.disabled ?? false) || props.resumeList.length <= 1
);

const selectedResumeId = computed({
  get: () => props.resumeId,
  set: (newId: string) => {
    if (!isSelectorDisabled.value && newId && newId !== props.resumeId) {
      void router.push(`/resume/${newId}`);
    }
  }
});
</script>

<style lang="scss">
.resume-editor-selector {
  padding: 0.5rem 1rem 0;

  &__row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  &__select {
    flex: 1;
    min-width: 0;
  }

  &__actions {
    flex-shrink: 0;
  }
}
</style>
