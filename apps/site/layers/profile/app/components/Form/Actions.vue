<template>
  <div class="user-profile-form-actions flex items-center justify-end gap-3 border-t pt-6">
    <UButton
      v-if="showCancel"
      type="button"
      color="neutral"
      variant="soft"
      @click="$emit('cancel')"
    >
      {{ $t('common.cancel') }}
    </UButton>
    <UButton type="submit" color="primary" :loading="saving" size="lg">
      {{ saving ? $t('profile.save.saving') : $t('profile.save.button') }}
    </UButton>
  </div>
</template>

<script setup lang="ts">
/**
 * ProfileForm Actions
 *
 * Form action buttons: submit and cancel
 *
 * TR012 - Created as part of ProfileForm decomposition
 */

defineOptions({ name: 'ProfileFormActions' });

defineProps<{
  showCancel?: boolean;
  saving?: boolean;
}>();

defineEmits<{
  cancel: [];
}>();
</script>
