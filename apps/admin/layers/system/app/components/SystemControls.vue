<template>
  <UPageCard class="system-controls">
    <template #header>
      <div class="space-y-1">
        <h2 class="text-lg font-semibold">
          {{ $t('admin.system.controls.title') }}
        </h2>
        <p class="text-sm text-muted">
          {{ $t('admin.system.controls.description') }}
        </p>
      </div>
    </template>

    <div v-if="isInitialLoading" class="flex items-center justify-center py-8">
      <UIcon name="i-lucide-loader-2" class="h-6 w-6 animate-spin text-primary" />
    </div>

    <UAlert
      v-else-if="!config && error"
      color="error"
      variant="soft"
      icon="i-lucide-alert-circle"
      :title="$t('common.error.generic')"
      :description="error.message"
    />

    <div v-else class="space-y-4">
      <UAlert
        v-if="error"
        color="error"
        variant="soft"
        icon="i-lucide-alert-circle"
        :title="$t('common.error.generic')"
        :description="error.message"
      />
      <div class="grid gap-4 md:grid-cols-2">
        <UFormField :label="$t('admin.system.platformLlm')">
          <USelectMenu
            :model-value="platformValue"
            :items="toggleOptions"
            value-key="value"
            size="sm"
            :disabled="isDisabled"
            @update:model-value="updatePlatformLlm"
          />
        </UFormField>

        <UFormField :label="$t('admin.system.byok')">
          <USelectMenu
            :model-value="byokValue"
            :items="toggleOptions"
            value-key="value"
            size="sm"
            :disabled="isDisabled"
            @update:model-value="updateByok"
          />
        </UFormField>
      </div>

      <UFormField :label="$t('admin.system.platformProvider')">
        <USelectMenu
          :model-value="config?.platformProvider"
          :items="providerOptions"
          value-key="value"
          size="sm"
          :disabled="isDisabled"
          @update:model-value="updateProvider"
        />
      </UFormField>
    </div>
  </UPageCard>
</template>

<script setup lang="ts">
/**
 * SystemControls Component
 *
 * Allows admins to toggle platform LLM/BYOK access and select provider.
 *
 * Related: T148 (US9)
 */

import type { PlatformProvider } from '@int/schema';
import { PLATFORM_PROVIDER_MAP } from '@int/schema';

defineOptions({ name: 'SystemControls' });

const props = withDefaults(
  defineProps<{
    config: {
      platformLlmEnabled: boolean;
      byokEnabled: boolean;
      platformProvider: PlatformProvider;
    } | null;
    loading?: boolean;
    saving?: boolean;
    error?: Error | null;
  }>(),
  {
    loading: false,
    saving: false,
    error: null
  }
);

const emit = defineEmits<{
  update: [
    payload: {
      platformLlmEnabled?: boolean;
      byokEnabled?: boolean;
      platformProvider?: PlatformProvider;
    }
  ];
}>();

const { t } = useI18n();

const isInitialLoading = computed(() => props.loading && !props.config);
const isDisabled = computed(() => props.loading || props.saving || !props.config);

const toggleOptions = computed<Array<{ label: string; value: 'enabled' | 'disabled' }>>(() => [
  { label: t('admin.system.status.enabled'), value: 'enabled' },
  { label: t('admin.system.status.disabled'), value: 'disabled' }
]);

const providerOptions = computed<Array<{ label: string; value: PlatformProvider }>>(() => [
  { label: t('admin.system.providers.openai'), value: PLATFORM_PROVIDER_MAP.OPENAI },
  { label: t('admin.system.providers.gemini_flash'), value: PLATFORM_PROVIDER_MAP.GEMINI_FLASH }
]);

const platformValue = computed(() => {
  if (!props.config) return undefined;
  return props.config.platformLlmEnabled ? 'enabled' : 'disabled';
});

const byokValue = computed(() => {
  if (!props.config) return undefined;
  return props.config.byokEnabled ? 'enabled' : 'disabled';
});

const updatePlatformLlm = (value: 'enabled' | 'disabled' | null) => {
  if (!value) return;
  emit('update', { platformLlmEnabled: value === 'enabled' });
};

const updateByok = (value: 'enabled' | 'disabled' | null) => {
  if (!value) return;
  emit('update', { byokEnabled: value === 'enabled' });
};

const updateProvider = (value: PlatformProvider | null) => {
  if (!value) return;
  emit('update', { platformProvider: value });
};
</script>

<style lang="scss">
.system-controls {
  // Reserved for component-specific styling
}
</style>
