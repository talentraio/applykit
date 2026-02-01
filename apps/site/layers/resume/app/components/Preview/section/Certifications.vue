<template>
  <div v-if="certifications?.length" class="resume-preview-certifications">
    <h3 class="mb-4 text-lg font-semibold">Certifications</h3>
    <div class="space-y-3">
      <div v-for="(cert, idx) in certifications" :key="idx">
        <h4 class="font-medium">{{ cert.name }}</h4>
        <p v-if="cert.issuer || cert.date" class="text-sm text-muted">
          <span v-if="cert.issuer">{{ cert.issuer }}</span>
          <span v-if="cert.issuer && cert.date"> &bull; </span>
          <span v-if="cert.date">{{ formatDate(cert.date) }}</span>
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Resume Preview - Certifications Section
 *
 * Displays certification entries.
 */

import type { CertificationEntry } from '@int/schema';

defineOptions({ name: 'ResumePreviewSectionCertifications' });

defineProps<{
  certifications?: CertificationEntry[];
}>();

/**
 * Format date for display
 */
const formatDate = (date: string): string => {
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
</script>
