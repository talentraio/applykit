<template>
  <div v-if="experience.length > 0" class="resume-preview-experience">
    <h3 class="mb-4 text-lg font-semibold">Experience</h3>
    <div class="space-y-6">
      <div v-for="(exp, idx) in experience" :key="idx" class="border-l-2 border-primary pl-4">
        <!-- Position & Company -->
        <h4 class="font-semibold">{{ exp.position }}</h4>
        <p class="text-sm text-muted">
          {{ exp.company }}
          <span v-if="exp.location"> &bull; {{ exp.location }}</span>
          &bull; {{ formatDateRange(exp.startDate, exp.endDate) }}
        </p>

        <!-- Description -->
        <p v-if="exp.description" class="mt-2 text-sm">
          {{ exp.description }}
        </p>

        <!-- Bullets -->
        <ul v-if="exp.bullets?.length" class="mt-2 list-inside list-disc space-y-1 text-sm">
          <li v-for="(bullet, bulletIdx) in exp.bullets" :key="bulletIdx">
            {{ bullet }}
          </li>
        </ul>

        <!-- Technologies -->
        <div v-if="exp.technologies?.length" class="mt-3 flex flex-wrap gap-1">
          <UBadge
            v-for="tech in exp.technologies"
            :key="tech"
            color="neutral"
            variant="subtle"
            size="xs"
          >
            {{ tech }}
          </UBadge>
        </div>

        <!-- Links -->
        <div v-if="exp.links?.length" class="mt-2 flex flex-wrap gap-3 text-sm">
          <template v-for="link in exp.links" :key="link.link">
            <a
              v-if="isSafeHttpUrl(link.link)"
              :href="link.link"
              target="_blank"
              rel="noopener noreferrer"
              class="text-primary hover:underline"
            >
              {{ link.name }}
            </a>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Resume Preview - Experience Section
 *
 * Displays work experience entries with details.
 */

import type { ExperienceEntry } from '@int/schema';
import { isSafeHttpUrl } from '@int/schema';

defineOptions({ name: 'ResumePreviewSectionExperience' });

defineProps<{
  experience: ExperienceEntry[];
}>();

/**
 * Format date range for display
 */
const formatDateRange = (startDate: string, endDate: string | null | undefined): string => {
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
