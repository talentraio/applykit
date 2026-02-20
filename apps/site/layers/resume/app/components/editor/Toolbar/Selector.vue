<template>
  <USelectMenu
    v-if="hasMultipleResumes"
    v-model="selectedResumeId"
    :items="selectorItems"
    value-key="id"
    :placeholder="$t('resume.page.selectResume')"
    :search-input="false"
    :disabled="isSelectorDisabled"
    icon="i-lucide-file-text"
    class="resume-editor-toolbar-selector"
  >
    <template #item-trailing="{ item }">
      <UBadge v-if="item.isDefault" variant="subtle" color="primary" size="xs">
        {{ $t('resume.page.defaultBadge') }}
      </UBadge>
    </template>
  </USelectMenu>

  <UDropdownMenu
    v-else
    :items="singleResumeMenuItems"
    :content="{ align: 'start' }"
    :ui="{ content: 'w-[var(--reka-dropdown-menu-trigger-width)]' }"
    class="resume-editor-toolbar-selector resume-editor-toolbar-selector--single"
  >
    <UButton
      variant="outline"
      color="primary"
      size="md"
      icon="i-lucide-plus"
      :aria-label="$t('resume.page.actionsMenu')"
      :loading="isBusy"
      :disabled="isActionDisabled"
      class="resume-editor-toolbar-selector__single-button"
    />
  </UDropdownMenu>
</template>

<script setup lang="ts">
import type { DropdownMenuItem } from '#ui/types';
import type { ResumeListItem } from '@int/schema';
import { useResumeEditorToolbarActions } from './useResumeEditorToolbarActions';

defineOptions({ name: 'ResumeEditorToolbarSelector' });

const props = defineProps<{
  /** Currently active resume ID */
  resumeId: string;
  /** List of user's resumes */
  resumeList: ResumeListItem[];
  /** Disable selector explicitly */
  disabled?: boolean;
}>();

const router = useRouter();
const { t } = useI18n();

type SelectorItem = {
  id: string;
  label: string;
  isDefault: boolean;
};

const resumeId = computed(() => props.resumeId);
const { isBusy, isActionDisabled, handleAddNew, handleDuplicate } = useResumeEditorToolbarActions({
  resumeId
});

const hasMultipleResumes = computed(() => props.resumeList.length > 1);

const selectorItems = computed<SelectorItem[]>(() => {
  return props.resumeList.map(item => ({
    id: item.id,
    label: item.name,
    isDefault: item.isDefault
  }));
});

const isSelectorDisabled = computed(() => (props.disabled ?? false) || !hasMultipleResumes.value);

const selectedResumeId = computed({
  get: () => props.resumeId,
  set: (newId: string) => {
    if (!isSelectorDisabled.value && newId && newId !== props.resumeId) {
      void router.push(`/resume/${newId}`);
    }
  }
});

const singleResumeMenuItems = computed<DropdownMenuItem[][]>(() => [
  [
    {
      label: t('resume.page.addNew'),
      icon: 'i-lucide-plus',
      disabled: isActionDisabled.value,
      onSelect: () => {
        void handleAddNew();
      }
    },
    {
      label: t('resume.page.duplicateResume'),
      icon: 'i-lucide-copy',
      disabled: isActionDisabled.value,
      onSelect: () => {
        void handleDuplicate();
      }
    }
  ]
]);
</script>

<style lang="scss">
.resume-editor-toolbar-selector {
  width: 100%;
  min-width: 0;

  &--single {
    display: block;
  }

  &__single-button {
    width: 100%;
    justify-content: center;
    height: 32px;
    min-height: 32px;
  }
}
</style>
