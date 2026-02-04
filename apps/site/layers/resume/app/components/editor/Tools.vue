<template>
  <div class="resume-editor-tools">
    <UTabs v-model="activeTab" :items="items" class="resume-editor-tools__tabs px-4 pt-4">
      <template #content="{ item }">
        <div v-if="item.value === 'edit'" class="resume-editor-tools__tab-content">
          <ResumeForm v-if="contentModel" v-model="contentModel" />

          <div v-if="contentModel" class="resume-editor-tools__tab-actions mt-10">
            <UButton variant="outline" color="warning" size="lg" @click="emit('uploadNew')">
              {{ $t('resume.page.clearAndCreateNew') }}
            </UButton>
          </div>
        </div>

        <div v-else-if="item.value === 'settings'" class="resume-editor-tools__tab-content">
          <ResumeSettings v-model:settings="settingsModel" :preview-type="previewType" />
        </div>

        <div v-else-if="item.value === 'ai'" class="resume-editor-tools__tab-content">
          <ResumeTabAIEnhance />
        </div>
      </template>
    </UTabs>
  </div>
</template>

<script setup lang="ts">
import type { ResumeContent, ResumeFormatSettings } from '@int/schema';
import type { ResumeEditorTabItem } from '@site/resume/app/types/editor';

defineOptions({ name: 'ResumeEditorTools' });

defineProps<{
  items: ResumeEditorTabItem[];
  previewType: 'ats' | 'human';
}>();

const emit = defineEmits<{
  uploadNew: [];
}>();

const activeTab = defineModel<string>({ required: true });
const contentModel = defineModel<ResumeContent | null>('content', { default: null });
const settingsModel = defineModel<ResumeFormatSettings>('settings', { required: true });
</script>

<style lang="scss">
.resume-editor-tools {
  height: 100%;

  &__tabs {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  &__tab-content {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
  }

  &__tab-actions {
    display: flex;
    justify-content: flex-end;
    margin-top: 1.5rem;
  }
}
</style>
