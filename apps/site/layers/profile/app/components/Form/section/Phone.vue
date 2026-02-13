<template>
  <div class="user-profile-form-section-phone space-y-4">
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-semibold">{{ $t('profile.section.phones') }}</h3>
      <UButton
        type="button"
        color="primary"
        variant="soft"
        icon="i-lucide-plus"
        size="sm"
        @click="addPhone"
      >
        {{ $t('profile.form.addPhone') }}
      </UButton>
    </div>

    <!-- Empty State -->
    <div v-if="modelValue.length === 0" class="rounded-lg border border-dashed p-4">
      <p class="text-center text-sm text-muted">{{ $t('profile.phones.empty') }}</p>
    </div>

    <!-- Phones List -->
    <div v-else class="space-y-3">
      <div
        v-for="(phone, index) in modelValue"
        :key="index"
        class="grid gap-3 rounded-lg border p-4 sm:grid-cols-[1fr_1fr_auto]"
      >
        <div>
          <label class="mb-1 block text-xs font-medium text-muted">
            {{ $t('profile.form.phoneNumber') }}
          </label>
          <UInput
            :model-value="phone.number"
            :placeholder="$t('profile.form.phonePlaceholder')"
            required
            size="md"
            @update:model-value="updatePhone(index, 'number', $event)"
          />
        </div>
        <div>
          <label class="mb-1 block text-xs font-medium text-muted">
            {{ $t('profile.form.phoneLabel') }}
          </label>
          <UInput
            :model-value="phone.label"
            :placeholder="$t('profile.form.labelPlaceholder')"
            size="md"
            @update:model-value="updatePhone(index, 'label', $event)"
          />
        </div>
        <div class="flex items-end">
          <UButton
            type="button"
            color="error"
            variant="ghost"
            icon="i-lucide-trash-2"
            size="sm"
            @click="removePhone(index)"
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
 * ProfileForm Phone Section
 *
 * Handles dynamic list of phone numbers with add/remove functionality
 *
 * TR012 - Created as part of ProfileForm decomposition
 */

import type { PhoneEntry } from '@int/schema';

defineOptions({ name: 'ProfileFormSectionPhone' });

const props = defineProps<{
  modelValue: PhoneEntry[];
}>();

const emit = defineEmits<{
  'update:modelValue': [value: PhoneEntry[]];
}>();

const addPhone = () => {
  emit('update:modelValue', [...props.modelValue, { number: '', label: '' }]);
};

const removePhone = (index: number) => {
  const updated = [...props.modelValue];
  updated.splice(index, 1);
  emit('update:modelValue', updated);
};

const updatePhone = (index: number, field: keyof PhoneEntry, value: string | undefined) => {
  const updated = [...props.modelValue];
  const current = updated[index];
  if (!current) return; // Guard against undefined

  // Explicitly preserve all required fields to satisfy TypeScript
  updated[index] = {
    number: current.number,
    label: current.label,
    [field]: value
  };
  emit('update:modelValue', updated);
};
</script>
