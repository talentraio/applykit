<template>
  <div v-if="skills.length > 0" class="resume-preview-skills">
    <h3 class="mb-4 text-lg font-semibold">Skills</h3>
    <div class="space-y-4">
      <div v-for="group in skills" :key="group.type">
        <p class="mb-2 text-sm font-medium text-muted">{{ group.type }}</p>
        <div class="flex flex-wrap gap-2">
          <UBadge v-for="skill in group.skills" :key="skill" color="neutral" variant="soft">
            {{ skill }}
          </UBadge>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Resume Preview - Skills Section
 *
 * Displays skill groups with badges.
 */

import type { SkillGroup } from '@int/schema';

defineOptions({ name: 'ResumePreviewSectionSkills' });

defineProps<{
  skills: SkillGroup[];
}>();
</script>
