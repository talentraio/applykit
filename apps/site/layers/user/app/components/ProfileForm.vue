<template>
  <div class="profile-form">
    <form class="space-y-6" @submit.prevent="handleSubmit">
      <!-- Basic Information Section -->
      <div class="space-y-4">
        <h3 class="text-lg font-semibold">Basic Information</h3>

        <div class="grid gap-4 sm:grid-cols-2">
          <!-- First Name -->
          <div>
            <label class="mb-2 block text-sm font-medium">
              {{ $t('profile.form.firstName') }}
              <span class="text-error">*</span>
            </label>
            <UInput
              v-model="formData.firstName"
              :placeholder="$t('profile.form.firstName')"
              required
              size="lg"
            />
          </div>

          <!-- Last Name -->
          <div>
            <label class="mb-2 block text-sm font-medium">
              {{ $t('profile.form.lastName') }}
              <span class="text-error">*</span>
            </label>
            <UInput
              v-model="formData.lastName"
              :placeholder="$t('profile.form.lastName')"
              required
              size="lg"
            />
          </div>
        </div>

        <!-- Email -->
        <div>
          <label class="mb-2 block text-sm font-medium">
            {{ $t('profile.form.email') }}
            <span class="text-error">*</span>
          </label>
          <UInput
            v-model="formData.email"
            type="email"
            :placeholder="$t('profile.form.email')"
            required
            size="lg"
          />
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <!-- Country (ISO 3166-1 alpha-2) -->
          <div>
            <label class="mb-2 block text-sm font-medium">
              {{ $t('profile.form.country') }}
              <span class="text-error">*</span>
            </label>
            <UInput
              v-model="formData.country"
              :placeholder="$t('profile.form.country')"
              maxlength="2"
              required
              size="lg"
            />
            <p class="mt-1 text-xs text-muted">ISO 3166-1 alpha-2 code (e.g., US, GB, DE)</p>
          </div>

          <!-- Search Region -->
          <div>
            <label class="mb-2 block text-sm font-medium">
              {{ $t('profile.form.searchRegion') }}
              <span class="text-error">*</span>
            </label>
            <UInput
              v-model="formData.searchRegion"
              :placeholder="$t('profile.form.searchRegion')"
              required
              size="lg"
            />
          </div>
        </div>

        <!-- Work Format -->
        <div>
          <label class="mb-2 block text-sm font-medium">
            {{ $t('profile.form.workFormat') }}
            <span class="text-error">*</span>
          </label>
          <USelectMenu
            v-model="formData.workFormat"
            :options="workFormatOptions"
            size="lg"
            required
          />
        </div>
      </div>

      <!-- Languages Section -->
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold">
            {{ $t('profile.form.languages') }}
            <span class="text-error">*</span>
          </h3>
          <UButton
            type="button"
            color="primary"
            variant="soft"
            icon="i-lucide-plus"
            size="sm"
            @click="addLanguage"
          >
            {{ $t('profile.form.addLanguage') }}
          </UButton>
        </div>

        <div v-if="formData.languages.length === 0" class="rounded-lg border border-dashed p-4">
          <p class="text-center text-sm text-muted">Add at least one language</p>
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="(lang, index) in formData.languages"
            :key="index"
            class="grid gap-3 rounded-lg border p-4 sm:grid-cols-[1fr_1fr_auto]"
          >
            <div>
              <label class="mb-1 block text-xs font-medium text-muted">
                {{ $t('profile.form.language') }}
              </label>
              <UInput v-model="lang.language" placeholder="English" required size="md" />
            </div>
            <div>
              <label class="mb-1 block text-xs font-medium text-muted">
                {{ $t('profile.form.languageLevel') }}
              </label>
              <UInput v-model="lang.level" placeholder="Native" required size="md" />
            </div>
            <div class="flex items-end">
              <UButton
                type="button"
                color="error"
                variant="ghost"
                icon="i-lucide-trash-2"
                size="sm"
                @click="removeLanguage(index)"
              >
                {{ $t('profile.form.removeLanguage') }}
              </UButton>
            </div>
          </div>
        </div>
      </div>

      <!-- Phone Numbers Section (Optional) -->
      <div class="space-y-4">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold">{{ $t('profile.form.phones') }}</h3>
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

        <div v-if="formData.phones.length === 0" class="rounded-lg border border-dashed p-4">
          <p class="text-center text-sm text-muted">No phone numbers added (optional)</p>
        </div>

        <div v-else class="space-y-3">
          <div
            v-for="(phone, index) in formData.phones"
            :key="index"
            class="grid gap-3 rounded-lg border p-4 sm:grid-cols-[1fr_1fr_auto]"
          >
            <div>
              <label class="mb-1 block text-xs font-medium text-muted">
                {{ $t('profile.form.phoneNumber') }}
              </label>
              <UInput v-model="phone.number" placeholder="+1 234 567 8900" required size="md" />
            </div>
            <div>
              <label class="mb-1 block text-xs font-medium text-muted">
                {{ $t('profile.form.phoneLabel') }}
              </label>
              <UInput v-model="phone.label" placeholder="Mobile" size="md" />
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
                {{ $t('profile.form.removePhone') }}
              </UButton>
            </div>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="flex items-center justify-end gap-3 border-t pt-6">
        <UButton
          v-if="showCancel"
          type="button"
          color="neutral"
          variant="soft"
          @click="handleCancel"
        >
          {{ $t('common.cancel') }}
        </UButton>
        <UButton type="submit" color="primary" :loading="saving" size="lg">
          {{ saving ? $t('profile.save.saving') : $t('profile.save.button') }}
        </UButton>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
/**
 * ProfileForm Component
 *
 * Form for creating/editing user profile
 * Includes validation and dynamic language/phone entry management
 *
 * T090 [US3] ProfileForm component with all required fields
 */

import type { LanguageEntry, PhoneEntry, Profile, ProfileInput } from '@int/schema'

defineOptions({ name: 'UserProfileForm' })

const props = withDefaults(
  defineProps<{
    /**
     * Initial profile data (for editing)
     */
    profile?: Profile | null
    /**
     * Show cancel button
     */
    showCancel?: boolean
    /**
     * Loading state
     */
    saving?: boolean
  }>(),
  {
    profile: null,
    showCancel: false,
    saving: false
  }
)

const emit = defineEmits<{
  save: [data: ProfileInput]
  cancel: []
}>()

type ProfileFormData = {
  firstName: string
  lastName: string
  email: string
  country: string
  searchRegion: string
  workFormat: 'remote' | 'hybrid' | 'onsite'
  languages: LanguageEntry[]
  phones: PhoneEntry[]
}

const { t } = useI18n()

// Work format options
const workFormatOptions = computed(() => [
  { label: t('profile.form.workFormatOptions.remote'), value: 'remote' },
  { label: t('profile.form.workFormatOptions.onsite'), value: 'onsite' },
  { label: t('profile.form.workFormatOptions.hybrid'), value: 'hybrid' }
])

// Form data
const formData = reactive<ProfileFormData>({
  firstName: props.profile?.firstName || '',
  lastName: props.profile?.lastName || '',
  email: props.profile?.email || '',
  country: props.profile?.country || '',
  searchRegion: props.profile?.searchRegion || '',
  workFormat: props.profile?.workFormat || 'remote',
  languages: props.profile?.languages || [],
  phones: props.profile?.phones || []
})

/**
 * Add a new language entry
 */
const addLanguage = () => {
  formData.languages.push({
    language: '',
    level: ''
  })
}

/**
 * Remove a language entry
 */
const removeLanguage = (index: number) => {
  formData.languages.splice(index, 1)
}

/**
 * Add a new phone entry
 */
const addPhone = () => {
  formData.phones.push({
    number: '',
    label: ''
  })
}

/**
 * Remove a phone entry
 */
const removePhone = (index: number) => {
  formData.phones.splice(index, 1)
}

/**
 * Handle form submission
 */
const handleSubmit = () => {
  // Validate at least one language
  if (formData.languages.length === 0) {
    return
  }

  // Build ProfileInput
  const data: ProfileInput = {
    firstName: formData.firstName.trim(),
    lastName: formData.lastName.trim(),
    email: formData.email.trim(),
    country: formData.country.trim().toUpperCase(),
    searchRegion: formData.searchRegion.trim(),
    workFormat: formData.workFormat,
    languages: formData.languages.filter(l => l.language && l.level),
    phones:
      formData.phones.filter(p => p.number).length > 0
        ? formData.phones.filter(p => p.number)
        : undefined
  }

  emit('save', data)
}

/**
 * Handle cancel
 */
const handleCancel = () => {
  emit('cancel')
}

// Watch for profile changes (when editing)
watch(
  () => props.profile,
  newProfile => {
    if (newProfile) {
      formData.firstName = newProfile.firstName
      formData.lastName = newProfile.lastName
      formData.email = newProfile.email
      formData.country = newProfile.country
      formData.searchRegion = newProfile.searchRegion
      formData.workFormat = newProfile.workFormat
      formData.languages = [...newProfile.languages]
      formData.phones = newProfile.phones ? [...newProfile.phones] : []
    }
  },
  { immediate: true }
)
</script>

<style lang="scss">
.profile-form {
  // Component-specific styles if needed
}
</style>
