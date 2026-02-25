<template>
  <div class="vacancy-item-cover-left">
    <UTabs v-model="currentTab" :items="leftTabItems" :ui="tabsUi" class="vacancy-cover-page__tabs">
      <template #content="{ item }">
        <VacancyItemCoverLeftGenerationConfig
          v-if="item.value === inputsTabValue"
          @generate="emit('generate')"
        />

        <VacancyItemCoverLeftFormatting
          v-else
          :format-settings="formatSettings"
          @update-format-setting="handleUpdateFormatSetting"
        />
      </template>
    </UTabs>
  </div>
</template>

<script setup lang="ts">
import type { SpacingSettings } from '@int/schema';

type LeftPanelTab = 'inputs' | 'format';

defineOptions({ name: 'VacancyItemCoverLeft' });

const props = defineProps<{
  formatSettings: SpacingSettings;
  hasCoverLetter: boolean;
  tabsDisabled?: boolean;
}>();

const emit = defineEmits<{
  generate: [];
  updateFormatSetting: [key: keyof SpacingSettings, value: number];
}>();

const activeTab = defineModel<LeftPanelTab>('activeTab', { required: true });

const { t } = useI18n();

const inputsTabValue: LeftPanelTab = 'inputs';

const currentTab = computed<LeftPanelTab>({
  get: () => (props.hasCoverLetter ? activeTab.value : inputsTabValue),
  set: value => {
    if (!props.hasCoverLetter && value === 'format') {
      activeTab.value = inputsTabValue;
      return;
    }

    activeTab.value = value;
  }
});

const tabsUi = {
  indicator: 'hidden',
  trigger:
    'data-[state=active]:bg-primary data-[state=active]:text-inverted data-[state=active]:shadow-xs'
} as const;

const leftTabItems = computed(() => [
  {
    label: t('vacancy.cover.inputsTitle'),
    value: inputsTabValue,
    icon: 'i-lucide-sliders-horizontal',
    disabled: props.tabsDisabled ?? false
  },
  {
    label: t('vacancy.cover.formatTitle'),
    value: 'format' as LeftPanelTab,
    icon: 'i-lucide-settings',
    disabled: (props.tabsDisabled ?? false) || !props.hasCoverLetter
  }
]);

const handleUpdateFormatSetting = (key: keyof SpacingSettings, value: number): void => {
  emit('updateFormatSetting', key, value);
};
</script>

<style lang="scss">
.vacancy-item-cover-left {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}

.vacancy-cover-page {
  &__tabs {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
    padding: 1rem 1rem 0;
  }

  &__tabs > [role='tabpanel'] {
    display: flex;
    flex: 1;
    min-height: 0;
    width: 100%;
    overflow: hidden;
  }
}
</style>
