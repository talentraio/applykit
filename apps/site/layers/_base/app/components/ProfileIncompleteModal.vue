<template>
  <ClientOnly>
    <UModal
      v-model:open="isOpen"
      :title="$t('resume.profileIncomplete.title')"
      :description="$t('resume.profileIncomplete.description')"
    >
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center gap-3">
              <div
                class="flex h-10 w-10 items-center justify-center rounded-full bg-warning-500/10 text-warning-500"
              >
                <UIcon name="i-lucide-alert-triangle" class="h-5 w-5" />
              </div>
              <div>
                <h3 class="text-lg font-semibold">
                  {{ $t('resume.profileIncomplete.title') }}
                </h3>
                <p class="text-sm text-muted">
                  {{ $t('resume.profileIncomplete.description') }}
                </p>
              </div>
            </div>
          </template>

          <template #footer>
            <div class="flex justify-end gap-3">
              <UButton color="neutral" variant="ghost" @click="handleCancel">
                {{ $t('resume.profileIncomplete.cancel') }}
              </UButton>
              <UButton color="primary" @click="handleGoToProfile">
                {{ $t('resume.profileIncomplete.goToProfile') }}
              </UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </ClientOnly>
</template>

<script setup lang="ts">
/**
 * ProfileIncompleteModal Component
 *
 * Modal shown when user tries to perform an action that requires a complete profile.
 * Provides warning and navigation to profile page with optional return URL.
 */

type ProfileIncompleteModalClosePayload = { action: 'cancelled' } | { action: 'navigated' };

defineOptions({ name: 'ProfileIncompleteModal' });

const props = defineProps<{
  /** URL to return to after profile is completed */
  returnTo?: string;
}>();

const emit = defineEmits<{
  cancel: [];
  navigate: [];
  close: [payload: ProfileIncompleteModalClosePayload];
}>();

const isOpen = defineModel<boolean>('open', { default: false });

const handleCancel = () => {
  isOpen.value = false;
  emit('cancel');
  emit('close', { action: 'cancelled' });
};

const handleGoToProfile = () => {
  isOpen.value = false;
  emit('navigate');
  emit('close', { action: 'navigated' });

  const query = props.returnTo ? `?returnTo=${encodeURIComponent(props.returnTo)}` : '';
  void navigateTo(`/profile${query}`);
};
</script>
