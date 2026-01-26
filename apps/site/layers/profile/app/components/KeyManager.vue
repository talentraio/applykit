<template>
  <div class="profile-key-manager space-y-6">
    <div class="space-y-2">
      <h2 class="text-lg font-semibold">
        {{ $t('settings.keys.title') }}
      </h2>
      <p class="text-sm text-muted">
        {{ $t('settings.keys.description') }}
      </p>
    </div>

    <UForm :state="formState" class="space-y-4" @submit="handleSave">
      <div class="grid gap-4 md:grid-cols-2">
        <UFormField :label="$t('settings.keys.provider')" name="provider" required>
          <USelectMenu
            :model-value="formState.provider"
            :items="providerItems"
            value-key="value"
            size="lg"
            @update:model-value="updateProvider"
          />
        </UFormField>

        <UFormField :label="$t('settings.keys.key')" name="apiKey" required>
          <UInput
            v-model="formState.apiKey"
            :placeholder="$t('settings.keys.keyPlaceholder')"
            type="password"
            size="lg"
          />
        </UFormField>
      </div>

      <p class="text-xs text-muted">
        {{ $t('settings.keys.localNote') }}
      </p>

      <div class="flex justify-end">
        <UButton type="submit" :loading="isSaving">
          {{ isSaving ? $t('settings.keys.saving') : $t('settings.keys.save') }}
        </UButton>
      </div>
    </UForm>

    <UAlert
      v-if="localError"
      color="error"
      variant="soft"
      icon="i-lucide-alert-circle"
      :title="localError.title"
      :description="localError.description"
    />

    <UAlert
      v-if="error"
      color="error"
      variant="soft"
      icon="i-lucide-alert-circle"
      :title="$t('settings.keys.error.fetchFailed')"
      :description="error.message"
    />

    <div v-if="loading" class="flex items-center justify-center py-8">
      <UIcon name="i-lucide-loader-2" class="h-6 w-6 animate-spin text-primary" />
    </div>

    <UPageCard v-else-if="keys.length === 0" class="text-center">
      <div class="py-8 text-sm text-muted">
        {{ $t('settings.keys.empty') }}
      </div>
    </UPageCard>

    <div v-else class="space-y-3">
      <UCard v-for="key in keys" :key="key.id">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div class="space-y-1">
            <p class="text-sm font-medium">
              {{ providerLabels[key.provider] }}
            </p>
            <p class="text-xs text-muted">
              {{ $t('settings.keys.keyHint', { hint: key.keyHint }) }}
            </p>
            <p v-if="hasLocalKey(key.provider)" class="text-xs text-muted">
              {{ $t('settings.keys.localStatus') }}
            </p>
          </div>
          <UButton
            variant="ghost"
            color="error"
            :loading="deletingKeyId === key.id"
            @click="handleDelete(key.id, key.provider)"
          >
            {{ $t('settings.keys.delete') }}
          </UButton>
        </div>
      </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * KeyManager Component
 *
 * Allows users to store BYOK keys locally and sync hint metadata to server.
 * Full keys are stored in browser localStorage only.
 *
 * Related: T130 (US7)
 */

import type { LLMProvider } from '@int/schema';

defineOptions({ name: 'ProfileKeyManager' });

const { keys, loading, error, saveKey, deleteKey } = useKeys();
const { t } = useI18n();
const toast = useToast();

const defaultProvider: LLMProvider = 'openai';

type KeyFormState = {
  provider: LLMProvider;
  apiKey: string;
};

const formState = reactive<KeyFormState>({
  provider: defaultProvider,
  apiKey: ''
});

const isSaving = ref(false);
const deletingKeyId = ref<string | null>(null);
const localError = ref<{ title: string; description?: string } | null>(null);

type ProviderOption = { label: string; value: LLMProvider };

const providerItems = computed<ProviderOption[]>(() => [
  { label: t('settings.keys.providers.openai'), value: 'openai' },
  { label: t('settings.keys.providers.gemini'), value: 'gemini' }
]);

const providerLabels = computed<Record<LLMProvider, string>>(() => ({
  openai: t('settings.keys.providers.openai'),
  gemini: t('settings.keys.providers.gemini')
}));

const localKeys = ref<Record<LLMProvider, string | null>>({
  openai: null,
  gemini: null
});

const storageKey = (provider: LLMProvider) => `applykit.byok.${provider}`;

const updateProvider = (provider: LLMProvider | null) => {
  if (!provider) return;
  formState.provider = provider;
};

const loadLocalKeys = () => {
  if (!import.meta.client) return;

  localKeys.value = {
    openai: localStorage.getItem(storageKey('openai')),
    gemini: localStorage.getItem(storageKey('gemini'))
  };
};

const hasLocalKey = (provider: LLMProvider) => Boolean(localKeys.value[provider]);

const getKeyHint = (apiKey: string) => apiKey.slice(-4);

const handleSave = async () => {
  localError.value = null;

  const apiKey = formState.apiKey.trim();
  if (apiKey.length < 4) {
    localError.value = { title: t('settings.keys.error.invalidKey') };
    return;
  }

  isSaving.value = true;

  try {
    const keyHint = getKeyHint(apiKey);
    await saveKey({ provider: formState.provider, keyHint });

    if (import.meta.client) {
      localStorage.setItem(storageKey(formState.provider), apiKey);
      localKeys.value[formState.provider] = apiKey;
    }

    formState.apiKey = '';

    toast.add({
      title: t('settings.keys.success.saved'),
      color: 'success'
    });
  } catch (err) {
    localError.value = {
      title: t('settings.keys.error.saveFailed'),
      description: err instanceof Error ? err.message : undefined
    };
    toast.add({
      title: t('settings.keys.error.saveFailed'),
      color: 'error'
    });
  } finally {
    isSaving.value = false;
  }
};

const handleDelete = async (id: string, provider: LLMProvider) => {
  deletingKeyId.value = id;
  localError.value = null;

  try {
    await deleteKey(id);

    if (import.meta.client) {
      localStorage.removeItem(storageKey(provider));
      localKeys.value[provider] = null;
    }

    toast.add({
      title: t('settings.keys.success.deleted'),
      color: 'success'
    });
  } catch (err) {
    localError.value = {
      title: t('settings.keys.error.deleteFailed'),
      description: err instanceof Error ? err.message : undefined
    };
    toast.add({
      title: t('settings.keys.error.deleteFailed'),
      color: 'error'
    });
  } finally {
    deletingKeyId.value = null;
  }
};

onMounted(() => {
  loadLocalKeys();
});
</script>

<style lang="scss">
.profile-key-manager {
  // Component-specific styling if needed
}
</style>
