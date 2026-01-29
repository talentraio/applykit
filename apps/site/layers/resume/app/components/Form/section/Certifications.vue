<template>
  <div class="resume-form-section-certifications space-y-4">
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-semibold">{{ $t('resume.form.certifications.title') }}</h3>
      <UButton
        type="button"
        color="primary"
        variant="soft"
        icon="i-lucide-plus"
        size="sm"
        @click="addCertification"
      >
        {{ $t('resume.form.certifications.add') }}
      </UButton>
    </div>

    <!-- Empty State -->
    <div v-if="!modelValue || modelValue.length === 0" class="rounded-lg border border-dashed p-4">
      <p class="text-center text-sm text-muted">{{ $t('resume.form.certifications.empty') }}</p>
    </div>

    <!-- Certifications List -->
    <div v-else class="space-y-3">
      <div v-for="(cert, index) in modelValue" :key="index" class="rounded-lg border p-4 space-y-3">
        <div class="grid gap-3 sm:grid-cols-3">
          <div>
            <label class="mb-1 block text-xs font-medium text-muted">
              {{ $t('resume.form.certifications.name') }}
              <span class="text-error">*</span>
            </label>
            <UInput
              :model-value="cert.name"
              :placeholder="$t('resume.form.certifications.namePlaceholder')"
              required
              size="md"
              class="w-full"
              @update:model-value="updateCertification(index, 'name', $event)"
            />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-muted">
              {{ $t('resume.form.certifications.issuer') }}
            </label>
            <UInput
              :model-value="cert.issuer ?? ''"
              :placeholder="$t('resume.form.certifications.issuerPlaceholder')"
              size="md"
              class="w-full"
              @update:model-value="updateCertification(index, 'issuer', $event || undefined)"
            />
          </div>
          <div>
            <label class="mb-1 block text-xs font-medium text-muted">
              {{ $t('resume.form.certifications.date') }}
            </label>
            <ResumeFormSectionDateInput
              :model-value="cert.date"
              @update:model-value="updateCertification(index, 'date', $event)"
            />
          </div>
        </div>
        <div class="flex justify-end">
          <UButton
            type="button"
            color="error"
            variant="ghost"
            icon="i-lucide-trash-2"
            size="sm"
            @click="removeCertification(index)"
          >
            {{ $t('common.remove') }}
          </UButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * ResumeForm Certifications Section
 *
 * Handles dynamic list of certifications with add/remove functionality
 */

import type { CertificationEntry } from '@int/schema';

defineOptions({ name: 'ResumeFormSectionCertifications' });

const props = defineProps<{
  modelValue?: CertificationEntry[];
}>();

const emit = defineEmits<{
  'update:modelValue': [value: CertificationEntry[] | undefined];
}>();

const addCertification = () => {
  const current = props.modelValue ?? [];
  emit('update:modelValue', [...current, { name: '' }]);
};

const removeCertification = (index: number) => {
  if (!props.modelValue) return;
  const updated = [...props.modelValue];
  updated.splice(index, 1);
  emit('update:modelValue', updated.length > 0 ? updated : undefined);
};

const updateCertification = (
  index: number,
  field: keyof CertificationEntry,
  value: string | undefined
) => {
  if (!props.modelValue) return;
  const updated = [...props.modelValue];
  const current = updated[index];
  if (!current) return;

  updated[index] = {
    name: current.name,
    issuer: current.issuer,
    date: current.date,
    [field]: value
  };
  emit('update:modelValue', updated);
};
</script>
