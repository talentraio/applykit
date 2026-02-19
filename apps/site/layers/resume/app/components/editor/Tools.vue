<template>
  <div class="resume-editor-tools">
    <UTabs
      v-if="showTabs"
      v-model="activeTab"
      :items="items"
      :ui="tabsUi"
      class="resume-editor-tools__tabs px-4 pt-4"
    >
      <template #content="{ item }">
        <div
          v-if="item.value === RESUME_EDITOR_TABS_MAP.EDIT"
          class="resume-editor-tools__tab-content"
        >
          <ResumeForm v-if="contentModel" v-model="contentModel" />

          <div v-if="contentModel && showUploadNew" class="resume-editor-tools__tab-actions mt-10">
            <UButton
              variant="outline"
              color="neutral"
              size="lg"
              icon="i-lucide-copy"
              @click="emit('duplicate')"
            >
              {{ $t('resume.page.duplicateResume') }}
            </UButton>
            <UButton variant="outline" color="warning" size="lg" @click="emit('uploadNew')">
              {{ $t('resume.page.clearAndCreateNew') }}
            </UButton>
          </div>
        </div>

        <div
          v-else-if="item.value === RESUME_EDITOR_TABS_MAP.SETTINGS"
          class="resume-editor-tools__tab-content"
        >
          <ResumeSettings v-model:settings="settingsModel" :preview-type="previewType" />
        </div>

        <div
          v-else-if="item.value === RESUME_EDITOR_TABS_MAP.AI"
          class="resume-editor-tools__tab-content"
        >
          <ResumeTabAIEnhance />
        </div>
      </template>
    </UTabs>

    <div v-else class="resume-editor-tools__single px-4 pt-4">
      <div
        v-if="singleTabValue === RESUME_EDITOR_TABS_MAP.EDIT"
        class="resume-editor-tools__tab-content"
      >
        <ResumeForm v-if="contentModel" v-model="contentModel" />

        <div v-if="contentModel && showUploadNew" class="resume-editor-tools__tab-actions mt-10">
          <UButton variant="outline" color="warning" size="lg" @click="emit('uploadNew')">
            {{ $t('resume.page.clearAndCreateNew') }}
          </UButton>
        </div>
      </div>

      <div
        v-else-if="singleTabValue === RESUME_EDITOR_TABS_MAP.SETTINGS"
        class="resume-editor-tools__tab-content"
      >
        <ResumeSettings v-model:settings="settingsModel" :preview-type="previewType" />
      </div>

      <div
        v-else-if="singleTabValue === RESUME_EDITOR_TABS_MAP.AI"
        class="resume-editor-tools__tab-content"
      >
        <ResumeTabAIEnhance />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ResumeContent, SpacingSettings } from '@int/schema';
import type { ResumeEditorTabItem } from '@site/resume/app/types/editor';
import type { PreviewType } from '@site/resume/app/types/preview';
import { RESUME_EDITOR_TABS_MAP } from '@site/resume/app/constants';

defineOptions({ name: 'ResumeEditorTools' });

const props = withDefaults(
  defineProps<{
    items: ResumeEditorTabItem[];
    previewType: PreviewType;
    showUploadNew?: boolean;
  }>(),
  {
    showUploadNew: false
  }
);

const emit = defineEmits<{
  uploadNew: [];
  duplicate: [];
}>();

const activeTab = defineModel<string>({ required: true });
const contentModel = defineModel<ResumeContent | null>('content', { default: null });
const settingsModel = defineModel<SpacingSettings>('settings', { required: true });
const showTabs = computed(() => props.items.length > 1);
const singleTabValue = computed(() => props.items[0]?.value ?? RESUME_EDITOR_TABS_MAP.EDIT);
const tabsUi = {
  // Use trigger-based active styles instead of indicator positioning to avoid SSR-to-hydration color flash.
  indicator: 'hidden',
  trigger:
    'data-[state=active]:bg-primary data-[state=active]:text-inverted data-[state=active]:shadow-xs'
} as const;

watch(
  () => props.items,
  items => {
    if (items.length !== 1) return;
    const value = items[0]?.value;
    if (value && activeTab.value !== value) {
      activeTab.value = value;
    }
  },
  { immediate: true }
);
</script>

<style lang="scss">
.resume-editor-tools {
  height: 100%;

  &__tabs {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  &__single {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  &__tab-content {
    flex: 1;
    overflow-y: auto;
  }

  &__tab-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
}
</style>
