<template>
  <div v-if="education.length > 0" class="resume-preview-education">
    <h3 class="mb-4 text-lg font-semibold">Education</h3>
    <div class="space-y-4">
      <div v-for="(edu, idx) in education" :key="idx">
        <h4 class="font-semibold">{{ edu.degree }}</h4>
        <p class="text-sm text-muted">
          {{ edu.institution }} &bull; {{ formatDateRange(edu.startDate, edu.endDate) }}
        </p>
        <p v-if="edu.field" class="text-sm">
          {{ edu.field }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Resume Preview - Education Section
 *
 * Displays education entries.
 */

import type { EducationEntry } from '@int/schema';

defineOptions({ name: 'ResumePreviewSectionEducation' });

defineProps<{
  education: EducationEntry[];
}>();

/**
 * Format date range for display
 */
const formatDateRange = (startDate: string, endDate?: string): string => {
  const formatMonth = (date: string): string => {
    const parts = date.split('-');
    const year = parts[0] ?? date;
    const month = parts[1] ?? '01';
    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec'
    ];
    const monthIndex = Number.parseInt(month, 10) - 1;
    return `${monthNames[monthIndex] ?? 'Jan'} ${year}`;
  };

  const start = formatMonth(startDate);
  const end = endDate ? formatMonth(endDate) : 'Present';

  return `${start} - ${end}`;
};
</script>
