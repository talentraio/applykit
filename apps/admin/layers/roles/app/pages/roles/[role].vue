<template>
  <div class="admin-role-detail-page p-4 md:p-6">
    <UiPageHeader :title="roleTitle">
      <template #actions>
        <UButton color="neutral" variant="ghost" size="sm" @click="goBack">
          {{ $t('common.back') }}
        </UButton>
      </template>
    </UiPageHeader>

    <div class="mt-6 space-y-4">
      <div v-if="isInitialLoading" class="flex items-center justify-center py-12">
        <UIcon name="i-lucide-loader-2" class="h-6 w-6 animate-spin text-primary" />
      </div>

      <UAlert
        v-else-if="detailError"
        color="error"
        variant="soft"
        icon="i-lucide-alert-circle"
        :title="$t('common.error.generic')"
        :description="detailError.message"
      />

      <UPageCard v-else class="admin-role-detail-page__card">
        <template #header>
          <div class="space-y-1">
            <h2 class="text-lg font-semibold">
              {{ $t('admin.roles.settingsTitle') }}
            </h2>
            <p class="text-sm text-muted">
              {{ $t('admin.roles.settingsDescription') }}
            </p>
          </div>
        </template>

        <div class="space-y-5">
          <UAlert
            v-if="localError"
            color="error"
            variant="soft"
            icon="i-lucide-alert-circle"
            :title="localError"
          />

          <UAlert
            v-if="isSuperAdmin"
            color="warning"
            variant="soft"
            icon="i-lucide-shield-check"
            :title="$t('admin.roles.superAdminHint')"
          />

          <div class="grid gap-4 md:grid-cols-2">
            <UFormField :label="$t('admin.roles.fields.platformLlm')">
              <USelectMenu
                v-model="platformLlmEnabled"
                :items="toggleOptions"
                value-key="value"
                size="sm"
                class="min-w-40 md:min-w-48"
                :search-input="false"
                :disabled="isRestricted || isDisabled"
              />
            </UFormField>
          </div>

          <UFormField :label="$t('admin.roles.fields.provider')">
            <USelectMenu
              v-model="platformProvider"
              :items="providerOptions"
              value-key="value"
              size="sm"
              class="min-w-40 md:min-w-48"
              :search-input="false"
              :disabled="isDisabled"
            />
          </UFormField>

          <UFormField :label="$t('admin.roles.fields.dailyBudget')">
            <div v-if="isSuperAdmin" class="flex h-10 items-center">
              <UBadge color="neutral" variant="soft">
                {{ $t('common.unlimited') }}
              </UBadge>
            </div>
            <UInput
              v-else
              v-model="dailyBudgetCap"
              type="number"
              min="0"
              step="0.01"
              size="sm"
              class="min-w-40 md:min-w-48"
              :disabled="isRestricted || isDisabled"
            />
          </UFormField>

          <div class="flex flex-wrap items-center gap-3">
            <UButton :loading="saving" :disabled="!canSave" @click="handleSave">
              {{ saving ? $t('common.loading') : $t('common.save') }}
            </UButton>
            <UButton
              color="neutral"
              variant="ghost"
              :disabled="isDisabled || !hasChanges"
              @click="resetForm"
            >
              {{ $t('common.clear') }}
            </UButton>
          </div>
        </div>
      </UPageCard>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * Admin Role Detail Page
 *
 * Updates role-specific LLM settings.
 */

import type { PlatformProvider } from '@int/schema';
import { PLATFORM_PROVIDER_MAP, RoleSchema, USER_ROLE_MAP } from '@int/schema';

defineOptions({ name: 'AdminRoleDetailPage' });

const route = useRoute();
const { t, te } = useI18n();
const toast = useToast();

const { current, loading, saving, error, fetchRole, updateRole } = useAdminRoles();

const roleValidation = RoleSchema.safeParse(route.params.role);
if (!roleValidation.success) {
  throw createError({
    statusCode: 404,
    message: 'Role not found'
  });
}

const role = ref(roleValidation.data);

const platformLlmEnabled = ref(false);
const platformProvider = ref<PlatformProvider>(PLATFORM_PROVIDER_MAP.OPENAI);
const dailyBudgetCap = ref('0');
const localError = ref<string | null>(null);

const isInitialLoading = computed(() => loading.value && !current.value);
const detailError = computed(() => (!current.value ? error.value : null));

await callOnce(`admin-role-${role.value}`, async () => {
  await fetchRole(role.value);
});

const roleTitle = computed(() => {
  const key = `admin.roles.names.${role.value}`;
  const label = te(key) ? t(key) : role.value;
  return t('admin.roles.detailTitle', { role: label });
});

const isSuperAdmin = computed(() => role.value === USER_ROLE_MAP.SUPER_ADMIN);
const isRestricted = computed(() => isSuperAdmin.value);
const isDisabled = computed(() => loading.value || saving.value || !current.value);

const toggleOptions = computed<Array<{ label: string; value: boolean }>>(() => [
  { label: t('admin.system.status.enabled'), value: true },
  { label: t('admin.system.status.disabled'), value: false }
]);

const providerOptions = computed<Array<{ label: string; value: PlatformProvider }>>(() => [
  { label: t('admin.system.providers.openai'), value: PLATFORM_PROVIDER_MAP.OPENAI },
  { label: t('admin.system.providers.gemini_flash'), value: PLATFORM_PROVIDER_MAP.GEMINI_FLASH }
]);

const parsedBudget = computed(() => Number(dailyBudgetCap.value));
const isBudgetValid = computed(
  () => Number.isFinite(parsedBudget.value) && parsedBudget.value >= 0
);

const hasChanges = computed(() => {
  if (!current.value) return false;

  return (
    platformLlmEnabled.value !== current.value.platformLlmEnabled ||
    platformProvider.value !== current.value.platformProvider ||
    parsedBudget.value !== current.value.dailyBudgetCap
  );
});

const canSave = computed(() => !isDisabled.value && isBudgetValid.value && hasChanges.value);

const resetForm = () => {
  if (!current.value) return;

  platformLlmEnabled.value = current.value.platformLlmEnabled;
  platformProvider.value = current.value.platformProvider;
  dailyBudgetCap.value = current.value.dailyBudgetCap.toString();
  localError.value = null;
};

watch(
  current,
  value => {
    if (!value) return;
    platformLlmEnabled.value = value.platformLlmEnabled;
    platformProvider.value = value.platformProvider;
    dailyBudgetCap.value = value.dailyBudgetCap.toString();
  },
  { immediate: true }
);

const handleSave = async () => {
  if (!current.value) return;
  localError.value = null;

  if (!isBudgetValid.value) {
    localError.value = t('common.error.validation');
    return;
  }

  try {
    await updateRole(role.value, {
      platformLlmEnabled: platformLlmEnabled.value,
      platformProvider: platformProvider.value,
      dailyBudgetCap: parsedBudget.value
    });
  } catch {
    toast.add({
      title: t('common.error.generic'),
      color: 'error'
    });
  }
};

const goBack = () => {
  navigateTo('/roles');
};

watch(
  () => route.params.role,
  async value => {
    const validation = RoleSchema.safeParse(value);
    if (!validation.success) return;

    role.value = validation.data;
    localError.value = null;

    try {
      await fetchRole(role.value);
    } catch {
      // Error is already exposed via store state
    }
  }
);
</script>

<style lang="scss">
.admin-role-detail-page {
  &__card {
    // Reserved for card-specific styling
  }
}
</style>
