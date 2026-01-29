<template>
  <div class="resume-form-section-experience-entry rounded-lg border p-4 space-y-4">
    <!-- Basic Info: Company | Position | Location (3 columns) -->
    <div class="grid gap-4 sm:grid-cols-3">
      <!-- Company -->
      <div>
        <label class="mb-1 block text-xs font-medium text-muted">
          {{ $t('resume.form.experience.company') }}
          <span class="text-error">*</span>
        </label>
        <UInput
          :model-value="modelValue.company"
          :placeholder="$t('resume.form.experience.companyPlaceholder')"
          required
          size="md"
          class="w-full"
          @update:model-value="update('company', $event)"
        />
      </div>

      <!-- Position -->
      <div>
        <label class="mb-1 block text-xs font-medium text-muted">
          {{ $t('resume.form.experience.position') }}
          <span class="text-error">*</span>
        </label>
        <UInput
          :model-value="modelValue.position"
          :placeholder="$t('resume.form.experience.positionPlaceholder')"
          required
          size="md"
          class="w-full"
          @update:model-value="update('position', $event)"
        />
      </div>

      <!-- Location -->
      <div>
        <label class="mb-1 block text-xs font-medium text-muted">
          {{ $t('resume.form.experience.location') }}
        </label>
        <UInput
          :model-value="modelValue.location ?? ''"
          :placeholder="$t('resume.form.experience.locationPlaceholder')"
          size="md"
          class="w-full"
          @update:model-value="update('location', $event || undefined)"
        />
      </div>
    </div>

    <!-- Dates -->
    <div class="grid gap-4 sm:grid-cols-2">
      <div>
        <label class="mb-1 block text-xs font-medium text-muted">
          {{ $t('resume.form.experience.startDate') }}
          <span class="text-error">*</span>
        </label>
        <ResumeFormSectionDateInput
          :model-value="modelValue.startDate"
          @update:model-value="update('startDate', $event ?? '')"
        />
      </div>
      <div>
        <label class="mb-1 block text-xs font-medium text-muted">
          {{ $t('resume.form.experience.endDate') }}
        </label>
        <div class="space-y-2">
          <ResumeFormSectionDateInput
            v-if="!currentlyHere"
            :model-value="modelValue.endDate ?? undefined"
            @update:model-value="update('endDate', $event ?? null)"
          />
          <UCheckbox
            :model-value="currentlyHere"
            :label="$t('resume.form.experience.currentlyHere')"
            @update:model-value="handleCurrentlyHereChange"
          />
        </div>
      </div>
    </div>

    <!-- Description -->
    <div>
      <label class="mb-1 block text-xs font-medium text-muted">
        {{ $t('resume.form.experience.description') }}
        <span class="text-error">*</span>
      </label>
      <UTextarea
        :model-value="modelValue.description"
        :placeholder="$t('resume.form.experience.descriptionPlaceholder')"
        :rows="3"
        required
        size="md"
        class="w-full"
        @update:model-value="update('description', $event)"
      />
    </div>

    <!-- Bullets (Achievements) -->
    <div>
      <label class="mb-1 block text-xs font-medium text-muted">
        {{ $t('resume.form.experience.bullets') }}
      </label>
      <div class="space-y-2">
        <div v-for="(bullet, index) in modelValue.bullets ?? []" :key="index" class="flex gap-2">
          <UInput
            :model-value="bullet"
            :placeholder="$t('resume.form.experience.bulletPlaceholder')"
            size="md"
            class="flex-1"
            @update:model-value="updateBullet(index, $event)"
          />
          <UButton
            type="button"
            color="error"
            variant="ghost"
            icon="i-lucide-trash-2"
            size="md"
            @click="removeBullet(index)"
          />
        </div>
        <UButton
          type="button"
          color="neutral"
          variant="soft"
          icon="i-lucide-plus"
          size="sm"
          @click="addBullet"
        >
          {{ $t('resume.form.experience.addBullet') }}
        </UButton>
      </div>
    </div>

    <!-- Technologies -->
    <div>
      <label class="mb-1 block text-xs font-medium text-muted">
        {{ $t('resume.form.experience.technologies') }}
      </label>
      <div class="flex flex-wrap gap-2 mb-2">
        <UBadge
          v-for="(tech, index) in modelValue.technologies ?? []"
          :key="index"
          color="neutral"
          variant="soft"
          class="flex items-center gap-1"
        >
          {{ tech }}
          <button type="button" class="ml-1 hover:text-error" @click="removeTechnology(index)">
            <UIcon name="i-lucide-x" class="h-3 w-3" />
          </button>
        </UBadge>
      </div>
      <div class="flex gap-2">
        <UInput
          v-model="newTechnology"
          :placeholder="$t('resume.form.experience.technologyPlaceholder')"
          size="md"
          class="flex-1"
          @keydown.enter.prevent="addTechnology"
        />
        <UButton
          type="button"
          color="neutral"
          variant="soft"
          icon="i-lucide-plus"
          size="md"
          :disabled="!newTechnology.trim()"
          @click="addTechnology"
        >
          {{ $t('common.add') }}
        </UButton>
      </div>
    </div>

    <!-- Links -->
    <div>
      <label class="mb-1 block text-xs font-medium text-muted">
        {{ $t('resume.form.experience.links') }}
      </label>
      <div class="space-y-2">
        <div
          v-for="(link, index) in modelValue.links ?? []"
          :key="index"
          class="grid gap-2 sm:grid-cols-[1fr_2fr_auto]"
        >
          <UInput
            :model-value="link.name"
            :placeholder="$t('resume.form.experience.linkName')"
            size="md"
            class="w-full"
            @update:model-value="updateLink(index, 'name', $event)"
          />
          <UInput
            :model-value="link.link"
            type="url"
            :placeholder="$t('resume.form.experience.linkUrl')"
            size="md"
            class="w-full"
            @update:model-value="updateLink(index, 'link', $event)"
          />
          <UButton
            type="button"
            color="error"
            variant="ghost"
            icon="i-lucide-trash-2"
            size="md"
            @click="removeLink(index)"
          />
        </div>
        <UButton
          type="button"
          color="neutral"
          variant="soft"
          icon="i-lucide-plus"
          size="sm"
          @click="addLink"
        >
          {{ $t('resume.form.experience.addLink') }}
        </UButton>
      </div>
    </div>

    <!-- Remove Entry Button -->
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
 * ResumeForm ExperienceEntry
 *
 * Single experience entry with all fields including nested arrays
 */

import type { ExperienceEntry, ExperienceLink } from '@int/schema';

defineOptions({ name: 'ResumeFormSectionExperienceEntry' });

const props = defineProps<{
  modelValue: ExperienceEntry;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: ExperienceEntry];
  remove: [];
}>();

const newTechnology = ref('');

const update = <K extends keyof ExperienceEntry>(key: K, value: ExperienceEntry[K]) => {
  emit('update:modelValue', { ...props.modelValue, [key]: value });
};

// Computed for "Currently here" checkbox
const currentlyHere = computed(() => props.modelValue.endDate === null);

const handleCurrentlyHereChange = (value: boolean | 'indeterminate') => {
  if (typeof value === 'boolean') {
    update('endDate', value ? null : undefined);
  }
};

// Bullets management
const addBullet = () => {
  const bullets = [...(props.modelValue.bullets ?? []), ''];
  emit('update:modelValue', { ...props.modelValue, bullets });
};

const updateBullet = (index: number, value: string) => {
  const bullets = [...(props.modelValue.bullets ?? [])];
  bullets[index] = value;
  emit('update:modelValue', { ...props.modelValue, bullets });
};

const removeBullet = (index: number) => {
  const bullets = [...(props.modelValue.bullets ?? [])];
  bullets.splice(index, 1);
  emit('update:modelValue', {
    ...props.modelValue,
    bullets: bullets.length > 0 ? bullets : undefined
  });
};

// Technologies management
const addTechnology = () => {
  const tech = newTechnology.value.trim();
  if (!tech) return;

  const technologies = [...(props.modelValue.technologies ?? []), tech];
  emit('update:modelValue', { ...props.modelValue, technologies });
  newTechnology.value = '';
};

const removeTechnology = (index: number) => {
  const technologies = [...(props.modelValue.technologies ?? [])];
  technologies.splice(index, 1);
  emit('update:modelValue', {
    ...props.modelValue,
    technologies: technologies.length > 0 ? technologies : undefined
  });
};

// Links management
const addLink = () => {
  const links: ExperienceLink[] = [...(props.modelValue.links ?? []), { name: '', link: '' }];
  emit('update:modelValue', { ...props.modelValue, links });
};

const updateLink = (index: number, field: keyof ExperienceLink, value: string) => {
  const links = [...(props.modelValue.links ?? [])];
  const current = links[index];
  if (!current) return;

  links[index] = { name: current.name, link: current.link, [field]: value };
  emit('update:modelValue', { ...props.modelValue, links });
};

const removeLink = (index: number) => {
  const links = [...(props.modelValue.links ?? [])];
  links.splice(index, 1);
  emit('update:modelValue', {
    ...props.modelValue,
    links: links.length > 0 ? links : undefined
  });
};
</script>
