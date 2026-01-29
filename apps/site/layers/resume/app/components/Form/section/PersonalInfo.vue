<template>
  <div class="resume-form-section-personal-info space-y-4">
    <h3 class="text-lg font-semibold">{{ $t('resume.form.personalInfo.title') }}</h3>

    <!-- Row 1: Full Name (full width) -->
    <div>
      <label class="mb-2 block text-sm font-medium">
        {{ $t('resume.form.personalInfo.fullName') }}
        <span class="text-error">*</span>
      </label>
      <UInput
        :model-value="modelValue.fullName"
        :placeholder="$t('resume.form.personalInfo.fullNamePlaceholder')"
        required
        size="lg"
        class="w-full"
        @update:model-value="update('fullName', $event)"
      />
    </div>

    <!-- Row 2: Email | Phone | Location (3 columns) -->
    <div class="grid gap-4 sm:grid-cols-3">
      <!-- Email -->
      <div>
        <label class="mb-2 block text-sm font-medium">
          {{ $t('resume.form.personalInfo.email') }}
          <span class="text-error">*</span>
        </label>
        <UInput
          :model-value="modelValue.email"
          type="email"
          :placeholder="$t('resume.form.personalInfo.emailPlaceholder')"
          required
          size="lg"
          class="w-full"
          @update:model-value="update('email', $event)"
        />
      </div>

      <!-- Phone -->
      <div>
        <label class="mb-2 block text-sm font-medium">
          {{ $t('resume.form.personalInfo.phone') }}
        </label>
        <UInput
          :model-value="modelValue.phone ?? ''"
          :placeholder="$t('resume.form.personalInfo.phonePlaceholder')"
          size="lg"
          class="w-full"
          @update:model-value="update('phone', $event || undefined)"
        />
      </div>

      <!-- Location -->
      <div>
        <label class="mb-2 block text-sm font-medium">
          {{ $t('resume.form.personalInfo.location') }}
        </label>
        <UInput
          :model-value="modelValue.location ?? ''"
          :placeholder="$t('resume.form.personalInfo.locationPlaceholder')"
          size="lg"
          class="w-full"
          @update:model-value="update('location', $event || undefined)"
        />
      </div>
    </div>

    <!-- Row 3: LinkedIn | Website | GitHub (3 columns) -->
    <div class="grid gap-4 sm:grid-cols-3">
      <!-- LinkedIn -->
      <div>
        <label class="mb-2 block text-sm font-medium">
          {{ $t('resume.form.personalInfo.linkedin') }}
        </label>
        <UInput
          :model-value="modelValue.linkedin ?? ''"
          type="url"
          :placeholder="$t('resume.form.personalInfo.linkedinPlaceholder')"
          size="lg"
          class="w-full"
          @update:model-value="update('linkedin', $event || undefined)"
        />
      </div>

      <!-- Website -->
      <div>
        <label class="mb-2 block text-sm font-medium">
          {{ $t('resume.form.personalInfo.website') }}
        </label>
        <UInput
          :model-value="modelValue.website ?? ''"
          type="url"
          :placeholder="$t('resume.form.personalInfo.websitePlaceholder')"
          size="lg"
          class="w-full"
          @update:model-value="update('website', $event || undefined)"
        />
      </div>

      <!-- GitHub -->
      <div>
        <label class="mb-2 block text-sm font-medium">
          {{ $t('resume.form.personalInfo.github') }}
        </label>
        <UInput
          :model-value="modelValue.github ?? ''"
          type="url"
          :placeholder="$t('resume.form.personalInfo.githubPlaceholder')"
          size="lg"
          class="w-full"
          @update:model-value="update('github', $event || undefined)"
        />
      </div>
    </div>

    <!-- Row 4: Title/Headline (full width) -->
    <div>
      <label class="mb-2 block text-sm font-medium">
        {{ $t('resume.form.personalInfo.title') }}
      </label>
      <UInput
        :model-value="modelValue.title ?? ''"
        :placeholder="$t('resume.form.personalInfo.titlePlaceholder')"
        size="lg"
        class="w-full"
        @update:model-value="update('title', $event || undefined)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * ResumeForm PersonalInfo Section
 *
 * Handles personal info fields: fullName, title, email, phone, location, linkedin, website, github
 */

import type { PersonalInfo } from '@int/schema';

defineOptions({ name: 'ResumeFormSectionPersonalInfo' });

const props = defineProps<{
  modelValue: PersonalInfo;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: PersonalInfo];
}>();

const update = <K extends keyof PersonalInfo>(key: K, value: PersonalInfo[K]) => {
  emit('update:modelValue', { ...props.modelValue, [key]: value });
};
</script>
