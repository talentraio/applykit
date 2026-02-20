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

          <ResumeEditorDefaultToggle
            v-if="showDefaultToggle"
            :resume-id="resolvedResumeId"
            :is-default="isDefaultResume"
            class="mt-6"
          />

          <div v-if="contentModel && showUploadNew" class="resume-editor-tools__tab-actions mt-10">
            <UButton
              v-if="showDeleteButton"
              variant="outline"
              color="error"
              size="lg"
              icon="i-lucide-trash-2"
              square
              :aria-label="$t('resume.page.deleteResume')"
              @click="emit('delete')"
            />
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
          <ResumeSettings
            v-model:settings="settingsModel"
            :preview-type="previewType"
            :resume-id="resumeId"
            :resume-name="resumeName"
          />
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

        <ResumeEditorDefaultToggle
          v-if="showDefaultToggle"
          :resume-id="resolvedResumeId"
          :is-default="isDefaultResume"
          class="mt-6"
        />

        <div v-if="contentModel && showUploadNew" class="resume-editor-tools__tab-actions mt-10">
          <UButton
            v-if="showDeleteButton"
            variant="outline"
            color="error"
            size="lg"
            icon="i-lucide-trash-2"
            square
            :aria-label="$t('resume.page.deleteResume')"
            @click="emit('delete')"
          />
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
        v-else-if="singleTabValue === RESUME_EDITOR_TABS_MAP.SETTINGS"
        class="resume-editor-tools__tab-content"
      >
        <ResumeSettings
          v-model:settings="settingsModel"
          :preview-type="previewType"
          :resume-id="resumeId"
          :resume-name="resumeName"
        />
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
    resumeId?: string;
    resumeName?: string | null;
    isDefaultResume?: boolean;
  }>(),
  {
    showUploadNew: false,
    resumeId: undefined,
    resumeName: null,
    isDefaultResume: false
  }
);

const emit = defineEmits<{
  uploadNew: [];
  duplicate: [];
  delete: [];
}>();

const activeTab = defineModel<string>({ required: true });
const contentModel = defineModel<ResumeContent | null>('content', { default: null });
const settingsModel = defineModel<SpacingSettings>('settings', { required: true });
const showTabs = computed(() => props.items.length > 1);
const singleTabValue = computed(() => props.items[0]?.value ?? RESUME_EDITOR_TABS_MAP.EDIT);
const showDefaultToggle = computed(
  () => props.showUploadNew && !!props.resumeId && contentModel.value !== null
);
const showDeleteButton = computed(() => showDefaultToggle.value && !props.isDefaultResume);
const resolvedResumeId = computed(() => props.resumeId ?? '');
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
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;

  &__tabs {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  &__single {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  &__tabs > [role='tabpanel'] {
    display: flex;
    flex: 1;
    min-height: 0;
    width: 100%;
    overflow: hidden;
  }

  &__tab-content {
    flex: 1;
    min-height: 0;
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
