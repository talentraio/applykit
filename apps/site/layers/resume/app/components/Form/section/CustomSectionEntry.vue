<template>
  <div class="resume-form-section-custom-section-entry rounded-lg border p-4 space-y-4">
    <!-- Section Title -->
    <div>
      <label class="mb-1 block text-xs font-medium text-muted">
        {{ $t('resume.form.customSections.sectionTitle') }}
        <span class="text-error">*</span>
      </label>
      <UInput
        :model-value="modelValue.sectionTitle"
        :placeholder="$t('resume.form.customSections.sectionTitlePlaceholder')"
        required
        size="md"
        class="w-full"
        @update:model-value="update('sectionTitle', $event)"
      />
    </div>

    <!-- Items -->
    <div>
      <div class="flex items-center justify-between mb-2">
        <label class="text-xs font-medium text-muted">
          {{ $t('resume.form.customSections.items') }}
          <span class="text-error">*</span>
        </label>
        <UButton
          type="button"
          color="neutral"
          variant="soft"
          icon="i-lucide-plus"
          size="xs"
          @click="addItem"
        >
          {{ $t('resume.form.customSections.addItem') }}
        </UButton>
      </div>
      <div class="space-y-3">
        <div
          v-for="(item, index) in modelValue.items"
          :key="index"
          class="rounded border p-3 space-y-2"
        >
          <div>
            <label class="mb-1 block text-xs text-muted">
              {{ $t('resume.form.customSections.itemTitle') }}
            </label>
            <UInput
              :model-value="item.title ?? ''"
              :placeholder="$t('resume.form.customSections.itemTitlePlaceholder')"
              size="sm"
              class="w-full"
              @update:model-value="updateItem(index, 'title', $event || undefined)"
            />
          </div>
          <div>
            <label class="mb-1 block text-xs text-muted">
              {{ $t('resume.form.customSections.itemDescription') }}
              <span class="text-error">*</span>
            </label>
            <UTextarea
              :model-value="item.description"
              :placeholder="$t('resume.form.customSections.itemDescriptionPlaceholder')"
              :rows="2"
              required
              size="sm"
              class="w-full"
              @update:model-value="updateItem(index, 'description', $event)"
            />
          </div>
          <div class="flex justify-end">
            <UButton
              type="button"
              color="error"
              variant="ghost"
              icon="i-lucide-trash-2"
              size="xs"
              :disabled="modelValue.items.length <= 1"
              @click="removeItem(index)"
            >
              {{ $t('common.remove') }}
            </UButton>
          </div>
        </div>
      </div>
    </div>

    <!-- Remove Section Button -->
    <div class="flex justify-end border-t pt-4">
      <UButton
        type="button"
        color="error"
        variant="ghost"
        icon="i-lucide-trash-2"
        size="sm"
        @click="$emit('remove')"
      >
        {{ $t('common.remove') }}
      </UButton>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * ResumeForm CustomSectionEntry
 *
 * Single custom section with title and items list
 */

import type { CustomSection, CustomSectionItem } from '@int/schema';

defineOptions({ name: 'ResumeFormSectionCustomSectionEntry' });

const props = defineProps<{
  modelValue: CustomSection;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: CustomSection];
  remove: [];
}>();

const update = <K extends keyof CustomSection>(key: K, value: CustomSection[K]) => {
  emit('update:modelValue', { ...props.modelValue, [key]: value });
};

const addItem = () => {
  const items: CustomSectionItem[] = [...props.modelValue.items, { description: '' }];
  emit('update:modelValue', { ...props.modelValue, items });
};

const updateItem = (index: number, field: keyof CustomSectionItem, value: string | undefined) => {
  const items = [...props.modelValue.items];
  const current = items[index];
  if (!current) return;

  items[index] = { title: current.title, description: current.description, [field]: value };
  emit('update:modelValue', { ...props.modelValue, items });
};

const removeItem = (index: number) => {
  // Don't remove the last item (min 1 required per schema)
  if (props.modelValue.items.length <= 1) return;

  const items = [...props.modelValue.items];
  items.splice(index, 1);
  emit('update:modelValue', { ...props.modelValue, items });
};
</script>
