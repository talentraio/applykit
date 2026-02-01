<template>
  <div v-if="customSections?.length" class="resume-preview-custom-sections space-y-6">
    <div v-for="section in customSections" :key="section.sectionTitle">
      <h3 class="mb-4 text-lg font-semibold">{{ section.sectionTitle }}</h3>
      <div class="space-y-3">
        <div v-for="(item, idx) in section.items" :key="idx">
          <h4 v-if="item.title" class="font-medium">{{ item.title }}</h4>
          <p class="text-sm text-muted">
            {{ item.description }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Resume Preview - Custom Sections
 *
 * Displays custom sections like "Open Source", "Publications", "Awards", etc.
 */

import type { CustomSection } from '@int/schema';

defineOptions({ name: 'ResumePreviewSectionCustomSections' });

defineProps<{
  customSections?: CustomSection[];
}>();
</script>
