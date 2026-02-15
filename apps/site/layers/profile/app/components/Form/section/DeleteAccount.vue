<template>
  <div class="user-profile-form-section-delete-account border-t pt-6">
    <div class="rounded-lg border border-error/30 bg-error/5 p-4">
      <h3 class="text-lg font-semibold text-error">{{ $t('profile.delete.title') }}</h3>
      <p class="mt-2 text-sm text-muted">{{ $t('profile.delete.description') }}</p>
      <UButton
        type="button"
        color="error"
        variant="soft"
        class="mt-4"
        icon="i-lucide-trash-2"
        :loading="isDeleting"
        @click="showConfirmModal = true"
      >
        {{ $t('profile.delete.button') }}
      </UButton>
    </div>

    <!-- Confirmation Modal -->
    <UModal v-model:open="showConfirmModal">
      <template #content>
        <UCard>
          <template #header>
            <div class="flex items-center gap-3">
              <div class="rounded-full bg-error/10 p-2">
                <UIcon name="i-lucide-alert-triangle" class="h-6 w-6 text-error" />
              </div>
              <h3 class="text-lg font-semibold">{{ $t('profile.delete.confirmTitle') }}</h3>
            </div>
          </template>

          <div class="space-y-4">
            <p>{{ $t('profile.delete.confirmDescription') }}</p>
            <ul class="list-inside list-disc space-y-1 text-sm text-muted">
              <li>{{ $t('profile.delete.willDelete.profile') }}</li>
              <li>{{ $t('profile.delete.willDelete.resumes') }}</li>
              <li>{{ $t('profile.delete.willDelete.vacancies') }}</li>
              <li>{{ $t('profile.delete.willDelete.generations') }}</li>
              <li>{{ $t('profile.delete.willDelete.apiKeys') }}</li>
            </ul>
            <p class="font-medium text-error">{{ $t('profile.delete.irreversible') }}</p>
          </div>

          <template #footer>
            <div class="flex justify-end gap-3">
              <UButton
                type="button"
                color="neutral"
                variant="soft"
                :disabled="isDeleting"
                @click="showConfirmModal = false"
              >
                {{ $t('common.cancel') }}
              </UButton>
              <UButton type="button" color="error" :loading="isDeleting" @click="handleDelete">
                {{
                  isDeleting ? $t('profile.delete.deleting') : $t('profile.delete.confirmButton')
                }}
              </UButton>
            </div>
          </template>
        </UCard>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
/**
 * ProfileForm Delete Account Section
 *
 * Shows delete account button with confirmation modal.
 * Deletes all user data and marks user as deleted.
 */

defineOptions({ name: 'ProfileFormSectionDeleteAccount' });

const emit = defineEmits<{
  deleted: [];
  error: [error: Error];
}>();

const { t } = useI18n();

const showConfirmModal = ref(false);
const isDeleting = ref(false);

const handleDelete = async () => {
  isDeleting.value = true;

  try {
    await useApi('/api/profile/account', {
      method: 'DELETE'
    });

    showConfirmModal.value = false;
    emit('deleted');

    // Redirect to home page after deletion
    await navigateTo('/');
  } catch (error) {
    console.error('Failed to delete account:', error);
    emit('error', error instanceof Error ? error : new Error(t('profile.delete.error')));
  } finally {
    isDeleting.value = false;
  }
};
</script>
