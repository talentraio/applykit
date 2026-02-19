<template>
  <UModal
    v-model:open="open"
    :title="isEditing ? $t('admin.llm.models.edit') : $t('admin.llm.models.create')"
    :description="$t('admin.llm.models.description')"
    :dismissible="false"
    :ui="{ content: 'max-w-3xl' }"
    class="llm-modal-model-form"
  >
    <template #body>
      <div class="space-y-4">
        <UAlert
          v-if="validationError"
          color="error"
          variant="soft"
          icon="i-lucide-alert-circle"
          :title="validationError"
        />

        <div class="grid gap-4 md:grid-cols-2">
          <UFormField label="Provider" required class="w-full">
            <USelectMenu
              v-model="form.provider"
              :items="providerOptions"
              value-key="value"
              :search-input="false"
              :disabled="loading || isEditing"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Status" class="w-full">
            <USelectMenu
              v-model="form.status"
              :items="statusOptions"
              value-key="value"
              :search-input="false"
              :disabled="loading"
              class="w-full"
            />
          </UFormField>
        </div>

        <div class="grid gap-4 md:grid-cols-2">
          <UFormField label="Model key" required class="w-full">
            <UInput v-model="form.modelKey" :disabled="loading || isEditing" class="w-full" />
          </UFormField>

          <UFormField label="Display name" class="w-full">
            <UInput v-model="form.displayName" :disabled="loading" class="w-full" />
          </UFormField>
        </div>

        <div class="grid gap-4 md:grid-cols-3">
          <UFormField label="Input price / 1M USD" required class="w-full">
            <UInput
              v-model="form.inputPricePer1mUsd"
              type="number"
              min="0"
              step="0.000001"
              :disabled="loading"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Output price / 1M USD" required class="w-full">
            <UInput
              v-model="form.outputPricePer1mUsd"
              type="number"
              min="0"
              step="0.000001"
              :disabled="loading"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Cached input price / 1M USD" class="w-full">
            <UInput
              v-model="form.cachedInputPricePer1mUsd"
              type="number"
              min="0"
              step="0.000001"
              :disabled="loading"
              class="w-full"
            />
          </UFormField>
        </div>

        <div class="grid gap-4 md:grid-cols-2">
          <UFormField label="Max context tokens" class="w-full">
            <UInput
              v-model="form.maxContextTokens"
              type="number"
              min="1"
              step="1"
              :disabled="loading"
              class="w-full"
            />
          </UFormField>

          <UFormField label="Max output tokens" class="w-full">
            <UInput
              v-model="form.maxOutputTokens"
              type="number"
              min="1"
              step="1"
              :disabled="loading"
              class="w-full"
            />
          </UFormField>
        </div>

        <div class="grid gap-4 md:grid-cols-3">
          <UFormField label="Supports JSON">
            <USwitch v-model="form.supportsJson" :disabled="loading" />
          </UFormField>

          <UFormField label="Supports tools">
            <USwitch v-model="form.supportsTools" :disabled="loading" />
          </UFormField>

          <UFormField label="Supports streaming">
            <USwitch v-model="form.supportsStreaming" :disabled="loading" />
          </UFormField>
        </div>

        <UFormField label="Notes" class="w-full">
          <UTextarea v-model="form.notes" :disabled="loading" class="w-full" />
        </UFormField>
      </div>
    </template>

    <template #footer>
      <div class="flex w-full items-center justify-end gap-2">
        <UButton
          color="neutral"
          variant="ghost"
          :disabled="loading"
          class="w-[120px] justify-center"
          @click="handleCancel"
        >
          {{ $t('admin.llm.common.cancel') }}
        </UButton>

        <UButton
          :loading="loading"
          :disabled="loading"
          class="w-[120px] justify-center"
          @click="handleSubmit"
        >
          {{ $t('admin.llm.common.save') }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>

<script setup lang="ts">
import type {
  LlmModel,
  LlmModelCreateInput,
  LlmModelStatus,
  LlmModelUpdateInput,
  LLMProvider
} from '@int/schema';
import { LLM_MODEL_STATUS_MAP, LLM_PROVIDER_MAP } from '@int/schema';

type Props = {
  loading?: boolean;
  model?: LlmModel | null;
};

type UpdatePayload = {
  id: string;
  input: LlmModelUpdateInput;
};

type LlmModelFormClosePayload = { action: 'cancelled' } | { action: 'submitted' };

type NumericFieldValue = string | number;

type FormState = {
  provider: LLMProvider;
  modelKey: string;
  displayName: string;
  status: LlmModelStatus;
  inputPricePer1mUsd: NumericFieldValue;
  outputPricePer1mUsd: NumericFieldValue;
  cachedInputPricePer1mUsd: NumericFieldValue;
  maxContextTokens: NumericFieldValue;
  maxOutputTokens: NumericFieldValue;
  supportsJson: boolean;
  supportsTools: boolean;
  supportsStreaming: boolean;
  notes: string;
};

defineOptions({ name: 'LlmModalModelForm' });

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  model: null
});

const emit = defineEmits<{
  create: [input: LlmModelCreateInput];
  update: [payload: UpdatePayload];
  close: [payload: LlmModelFormClosePayload];
}>();

const open = defineModel<boolean>('open', { required: true });

const { t } = useI18n();
const validationError = ref<string | null>(null);
const loading = computed(() => props.loading);

const providerOptions = computed<Array<{ label: string; value: LLMProvider }>>(() => [
  { label: 'OpenAI', value: LLM_PROVIDER_MAP.OPENAI },
  { label: 'Gemini', value: LLM_PROVIDER_MAP.GEMINI }
]);

const statusOptions = computed<Array<{ label: string; value: LlmModelStatus }>>(() => [
  { label: 'Active', value: LLM_MODEL_STATUS_MAP.ACTIVE },
  { label: 'Disabled', value: LLM_MODEL_STATUS_MAP.DISABLED },
  { label: 'Archived', value: LLM_MODEL_STATUS_MAP.ARCHIVED }
]);

const createDefaultFormState = (): FormState => ({
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

const form = reactive<FormState>(createDefaultFormState());
const isEditing = computed(() => Boolean(props.model));

const normalizeNumericField = (value: NumericFieldValue): string => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value.toString() : '';
  }

  return value.trim();
};

const toNumberOrNull = (value: NumericFieldValue): number | null => {
  const normalized = normalizeNumericField(value);
  if (normalized === '') return null;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const toPositiveIntegerOrNull = (value: NumericFieldValue): number | null => {
  const parsed = toNumberOrNull(value);
  if (parsed === null) return null;
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
};

const applyModelToForm = (model: LlmModel | null) => {
  if (!model) {
    Object.assign(form, createDefaultFormState());
    return;
  }

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

watch(
  () => ({ isOpen: open.value, modelId: props.model?.id ?? null }),
  value => {
    if (value.isOpen) {
      validationError.value = null;
      applyModelToForm(props.model);
    }
  },
  { immediate: true }
);

const handleCancel = () => {
  validationError.value = null;
  open.value = false;
  emit('close', { action: 'cancelled' });
};

const handleSubmit = () => {
  validationError.value = null;

  const modelKey = form.modelKey.trim();
  const displayName = form.displayName.trim() || modelKey;
  const inputPricePer1mUsd = toNumberOrNull(form.inputPricePer1mUsd);
  const outputPricePer1mUsd = toNumberOrNull(form.outputPricePer1mUsd);
  const cachedInputPricePer1mUsd = toNumberOrNull(form.cachedInputPricePer1mUsd);
  const maxContextTokens = toPositiveIntegerOrNull(form.maxContextTokens);
  const maxOutputTokens = toPositiveIntegerOrNull(form.maxOutputTokens);

  if (inputPricePer1mUsd === null || outputPricePer1mUsd === null) {
    validationError.value = t('common.error.validation');
    return;
  }

  if (props.model) {
    emit('update', {
      id: props.model.id,
      input: {
        displayName,
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
      }
    });
    return;
  }

  emit('create', {
    provider: form.provider,
    modelKey,
    displayName,
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
};
</script>

<style lang="scss">
.llm-modal-model-form {
  // Reserved for modal-specific styling
}
</style>
