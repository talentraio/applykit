<template>
  <div class="admin-llm-models-page p-4 md:p-6">
    <UiPageHeader
      :title="$t('admin.llm.models.title')"
      :description="$t('admin.llm.models.description')"
    />

    <div class="mt-6 space-y-4">
      <UAlert
        v-if="error"
        color="error"
        variant="soft"
        icon="i-lucide-alert-circle"
        :title="$t('common.error.generic')"
        :description="error.message"
      />

      <UPageCard>
        <template #header>
          <h2 class="text-lg font-semibold">
            {{ isEditing ? $t('admin.llm.models.edit') : $t('admin.llm.models.create') }}
          </h2>
        </template>

        <div class="grid gap-4 md:grid-cols-2">
          <UFormField label="Provider" required>
            <USelectMenu
              v-model="form.provider"
              :items="providerOptions"
              value-key="value"
              :search-input="false"
              :disabled="saving || isEditing"
            />
          </UFormField>

          <UFormField label="Model key" required>
            <UInput v-model="form.modelKey" :disabled="saving || isEditing" />
          </UFormField>

          <UFormField label="Display name" required>
            <UInput v-model="form.displayName" :disabled="saving" />
          </UFormField>

          <UFormField label="Status">
            <USelectMenu
              v-model="form.status"
              :items="statusOptions"
              value-key="value"
              :search-input="false"
              :disabled="saving"
            />
          </UFormField>

          <UFormField label="Input price / 1M USD" required>
            <UInput
              v-model="form.inputPricePer1mUsd"
              type="number"
              min="0"
              step="0.000001"
              :disabled="saving"
            />
          </UFormField>

          <UFormField label="Output price / 1M USD" required>
            <UInput
              v-model="form.outputPricePer1mUsd"
              type="number"
              min="0"
              step="0.000001"
              :disabled="saving"
            />
          </UFormField>

          <UFormField label="Cached input price / 1M USD">
            <UInput
              v-model="form.cachedInputPricePer1mUsd"
              type="number"
              min="0"
              step="0.000001"
              :disabled="saving"
            />
          </UFormField>

          <UFormField label="Max context tokens">
            <UInput
              v-model="form.maxContextTokens"
              type="number"
              min="1"
              step="1"
              :disabled="saving"
            />
          </UFormField>

          <UFormField label="Max output tokens">
            <UInput
              v-model="form.maxOutputTokens"
              type="number"
              min="1"
              step="1"
              :disabled="saving"
            />
          </UFormField>
        </div>

        <div class="mt-4 grid gap-4 md:grid-cols-3">
          <UFormField label="Supports JSON">
            <USwitch v-model="form.supportsJson" :disabled="saving" />
          </UFormField>
          <UFormField label="Supports tools">
            <USwitch v-model="form.supportsTools" :disabled="saving" />
          </UFormField>
          <UFormField label="Supports streaming">
            <USwitch v-model="form.supportsStreaming" :disabled="saving" />
          </UFormField>
        </div>

        <UFormField class="mt-4" label="Notes">
          <UTextarea v-model="form.notes" :disabled="saving" />
        </UFormField>

        <div class="mt-4 flex flex-wrap gap-2">
          <UButton :loading="saving" @click="handleSave">
            {{ $t('admin.llm.common.save') }}
          </UButton>
          <UButton color="neutral" variant="ghost" :disabled="saving" @click="resetForm">
            {{ $t('admin.llm.common.cancel') }}
          </UButton>
        </div>
      </UPageCard>

      <div v-if="loading && !hasItems" class="flex items-center justify-center py-8">
        <UIcon name="i-lucide-loader-2" class="h-6 w-6 animate-spin text-primary" />
      </div>

      <UPageCard v-else-if="!hasItems">
        <div class="py-10 text-center text-sm text-muted">
          {{ $t('admin.llm.models.empty') }}
        </div>
      </UPageCard>

      <UPageCard v-for="model in items" :key="model.id">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div class="space-y-2">
            <div class="flex items-center gap-2">
              <h3 class="text-base font-semibold">{{ model.displayName }}</h3>
              <UBadge color="neutral" variant="soft">{{ model.status }}</UBadge>
            </div>
            <p class="text-sm text-muted">{{ model.provider }} / {{ model.modelKey }}</p>
            <p class="text-sm text-muted">
              Input: {{ model.inputPricePer1mUsd }} | Output: {{ model.outputPricePer1mUsd }}
            </p>
            <p class="text-xs text-muted">Updated: {{ formatDate(model.updatedAt) }}</p>
          </div>

          <div class="flex flex-wrap gap-2">
            <UButton
              color="neutral"
              variant="soft"
              size="sm"
              :disabled="saving"
              @click="startEdit(model)"
            >
              {{ $t('admin.llm.models.edit') }}
            </UButton>
            <UButton
              color="error"
              variant="soft"
              size="sm"
              :disabled="saving"
              @click="handleDelete(model.id)"
            >
              {{ $t('admin.llm.models.deactivate') }}
            </UButton>
          </div>
        </div>
      </UPageCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { LlmModel, LlmModelStatus, LLMProvider } from '@int/schema';
import { LLM_MODEL_STATUS_MAP, LLM_PROVIDER_MAP } from '@int/schema';
import { format } from 'date-fns';

defineOptions({ name: 'AdminLlmModelsPage' });

type FormState = {
  provider: LLMProvider;
  modelKey: string;
  displayName: string;
  status: LlmModelStatus;
  inputPricePer1mUsd: string;
  outputPricePer1mUsd: string;
  cachedInputPricePer1mUsd: string;
  maxContextTokens: string;
  maxOutputTokens: string;
  supportsJson: boolean;
  supportsTools: boolean;
  supportsStreaming: boolean;
  notes: string;
};

const {
  items,
  loading,
  saving,
  error,
  fetchAll,
  create,
  update,
  delete: remove
} = useAdminLlmModels();
const { t } = useI18n();
const toast = useToast();

const hasItems = computed(() => items.value.length > 0);
const editingId = ref<string | null>(null);

const form = reactive<FormState>({
  provider: LLM_PROVIDER_MAP.OPENAI,
  modelKey: '',
  displayName: '',
  status: LLM_MODEL_STATUS_MAP.ACTIVE,
  inputPricePer1mUsd: '0',
  outputPricePer1mUsd: '0',
  cachedInputPricePer1mUsd: '',
  maxContextTokens: '',
  maxOutputTokens: '',
  supportsJson: false,
  supportsTools: false,
  supportsStreaming: false,
  notes: ''
});

const isEditing = computed(() => Boolean(editingId.value));

const providerOptions = computed<Array<{ label: string; value: LLMProvider }>>(() => [
  { label: 'OpenAI', value: LLM_PROVIDER_MAP.OPENAI },
  { label: 'Gemini', value: LLM_PROVIDER_MAP.GEMINI }
]);

const statusOptions = computed<Array<{ label: string; value: LlmModelStatus }>>(() => [
  { label: 'Active', value: LLM_MODEL_STATUS_MAP.ACTIVE },
  { label: 'Disabled', value: LLM_MODEL_STATUS_MAP.DISABLED },
  { label: 'Archived', value: LLM_MODEL_STATUS_MAP.ARCHIVED }
]);

const toNumberOrNull = (value: string): number | null => {
  if (value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const toPositiveIntegerOrNull = (value: string): number | null => {
  const parsed = toNumberOrNull(value);
  if (parsed === null) return null;
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
};

const resetForm = () => {
  editingId.value = null;
  form.provider = LLM_PROVIDER_MAP.OPENAI;
  form.modelKey = '';
  form.displayName = '';
  form.status = LLM_MODEL_STATUS_MAP.ACTIVE;
  form.inputPricePer1mUsd = '0';
  form.outputPricePer1mUsd = '0';
  form.cachedInputPricePer1mUsd = '';
  form.maxContextTokens = '';
  form.maxOutputTokens = '';
  form.supportsJson = false;
  form.supportsTools = false;
  form.supportsStreaming = false;
  form.notes = '';
};

const startEdit = (model: LlmModel) => {
  editingId.value = model.id;
  form.provider = model.provider;
  form.modelKey = model.modelKey;
  form.displayName = model.displayName;
  form.status = model.status;
  form.inputPricePer1mUsd = model.inputPricePer1mUsd.toString();
  form.outputPricePer1mUsd = model.outputPricePer1mUsd.toString();
  form.cachedInputPricePer1mUsd = model.cachedInputPricePer1mUsd?.toString() ?? '';
  form.maxContextTokens = model.maxContextTokens?.toString() ?? '';
  form.maxOutputTokens = model.maxOutputTokens?.toString() ?? '';
  form.supportsJson = model.supportsJson;
  form.supportsTools = model.supportsTools;
  form.supportsStreaming = model.supportsStreaming;
  form.notes = model.notes ?? '';
};

const handleSave = async () => {
  const inputPricePer1mUsd = Number(form.inputPricePer1mUsd);
  const outputPricePer1mUsd = Number(form.outputPricePer1mUsd);
  const cachedInputPricePer1mUsd = toNumberOrNull(form.cachedInputPricePer1mUsd);
  const maxContextTokens = toPositiveIntegerOrNull(form.maxContextTokens);
  const maxOutputTokens = toPositiveIntegerOrNull(form.maxOutputTokens);

  if (!Number.isFinite(inputPricePer1mUsd) || !Number.isFinite(outputPricePer1mUsd)) {
    toast.add({ title: t('common.error.validation'), color: 'error' });
    return;
  }

  try {
    if (editingId.value) {
      await update(editingId.value, {
        displayName: form.displayName,
        status: form.status,
        inputPricePer1mUsd,
        outputPricePer1mUsd,
        cachedInputPricePer1mUsd,
        maxContextTokens,
        maxOutputTokens,
        supportsJson: form.supportsJson,
        supportsTools: form.supportsTools,
        supportsStreaming: form.supportsStreaming,
        notes: form.notes.trim() ? form.notes.trim() : null
      });
    } else {
      await create({
        provider: form.provider,
        modelKey: form.modelKey.trim(),
        displayName: form.displayName.trim(),
        status: form.status,
        inputPricePer1mUsd,
        outputPricePer1mUsd,
        cachedInputPricePer1mUsd,
        maxContextTokens,
        maxOutputTokens,
        supportsJson: form.supportsJson,
        supportsTools: form.supportsTools,
        supportsStreaming: form.supportsStreaming,
        notes: form.notes.trim() ? form.notes.trim() : null
      });
    }

    resetForm();
  } catch {
    toast.add({ title: t('common.error.generic'), color: 'error' });
  }
};

const handleDelete = async (id: string) => {
  try {
    await remove(id);
  } catch {
    toast.add({ title: t('common.error.generic'), color: 'error' });
  }
};

const formatDate = (value: Date | string): string => {
  return format(new Date(value), 'dd.MM.yyyy');
};

await callOnce('admin-llm-models', async () => {
  await fetchAll();
});
</script>

<style lang="scss">
.admin-llm-models-page {
  // Reserved for page-specific styles.
}
</style>
