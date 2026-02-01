<template>
  <div v-if="languages?.length" class="resume-preview-languages">
    <h3 class="mb-4 text-lg font-semibold">Languages</h3>
    <div class="flex flex-wrap gap-3">
      <div
        v-for="lang in languages"
        :key="lang.language"
        class="flex items-center gap-2 rounded-md bg-[var(--ui-bg-muted)] px-3 py-1.5"
      >
        <span class="font-medium">{{ lang.language }}</span>
        <span class="text-sm text-muted">&bull; {{ lang.level }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Resume Preview - Languages Section
 *
 * Displays language proficiencies.
 */

import type { ResumeLanguage } from '@int/schema';

defineOptions({ name: 'ResumePreviewSectionLanguages' });

defineProps<{
  languages?: ResumeLanguage[];
}>();
</script>
