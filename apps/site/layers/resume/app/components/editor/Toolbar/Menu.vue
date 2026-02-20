<template>
  <UDropdownMenu
    :items="menuItems"
    :content="{ align: 'end' }"
    :ui="{
      content: 'w-[var(--reka-dropdown-menu-trigger-width)] min-w-56'
    }"
    class="resume-editor-toolbar-menu"
  >
    <UButton
      variant="outline"
      color="neutral"
      size="md"
      square
      icon="i-lucide-menu"
      :aria-label="t('resume.page.actionsMenu')"
      :loading="isBusy"
      :disabled="isActionDisabled"
    />
  </UDropdownMenu>
</template>

<script setup lang="ts">
import type { DropdownMenuItem } from '#ui/types';
import { useResumeEditorToolbarActions } from './useResumeEditorToolbarActions';

defineOptions({ name: 'ResumeEditorToolbarMenu' });

const props = withDefaults(
  defineProps<{
    resumeId: string;
    isDefaultResume?: boolean;
  }>(),
  {
    isDefaultResume: false
  }
);

const { t } = useI18n();
const resumeId = computed(() => props.resumeId);
const isDefaultResume = computed(() => props.isDefaultResume);
const {
  isBusy,
  isActionDisabled,
  handleAddNew,
  handleDuplicate,
  handleClearAndCreateNew,
  handleMakeDefault,
  handleDelete
} = useResumeEditorToolbarActions({
  resumeId,
  isDefaultResume
});

const menuItems = computed<DropdownMenuItem[][]>(() => {
  const primaryItems: DropdownMenuItem[] = [
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
    },
    {
      label: t('resume.page.clearAndCreateNew'),
      icon: 'i-lucide-eraser',
      disabled: isActionDisabled.value,
      onSelect: () => {
        void handleClearAndCreateNew();
      }
    }
  ];

  if (!props.isDefaultResume) {
    primaryItems.push({
      label: t('resume.page.makeDefault'),
      icon: 'i-lucide-star',
      disabled: isActionDisabled.value,
      onSelect: () => {
        void handleMakeDefault();
      }
    });
  }

  if (props.isDefaultResume) {
    return [primaryItems];
  }

  return [
    primaryItems,
    [
      {
        label: t('resume.page.deleteResume'),
        icon: 'i-lucide-trash-2',
        disabled: isActionDisabled.value,
        onSelect: () => {
          void handleDelete();
        }
      }
    ]
  ];
});
</script>

<style lang="scss">
.resume-editor-toolbar-menu {
  display: inline-flex;
}
</style>
