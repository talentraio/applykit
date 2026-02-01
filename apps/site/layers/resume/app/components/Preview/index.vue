<template>
  <div class="resume-preview prose prose-slate dark:prose-invert max-w-none">
    <!-- Personal Info -->
    <ResumePreviewSectionPersonalInfo :personal-info="content.personalInfo" />

    <!-- Summary -->
    <ResumePreviewSectionSummary :summary="content.summary" class="mt-8" />

    <!-- Experience -->
    <ResumePreviewSectionExperience :experience="content.experience" class="mt-8" />

    <!-- Custom Sections (after Experience) -->
    <ResumePreviewSectionCustomSections :custom-sections="content.customSections" class="mt-8" />

    <!-- Education -->
    <ResumePreviewSectionEducation :education="content.education" class="mt-8" />

    <!-- Skills -->
    <ResumePreviewSectionSkills :skills="content.skills" class="mt-8" />

    <!-- Certifications -->
    <ResumePreviewSectionCertifications :certifications="content.certifications" class="mt-8" />

    <!-- Languages -->
    <ResumePreviewSectionLanguages :languages="content.languages" class="mt-8" />
  </div>
</template>

<script setup lang="ts">
/**
 * Resume Preview Component
 *
 * Renders a read-only preview of resume content.
 * Orchestrates section components for display.
 */

import type { ResumeContent } from '@int/schema';

defineOptions({ name: 'ResumePreview' });

defineProps<{
  /**
   * Resume content to display
   */
  content: ResumeContent;
}>();
</script>

<style lang="scss">
.resume-preview {
  // Component-specific styles if needed
}
</style>
