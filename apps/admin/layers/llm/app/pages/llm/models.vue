<template>
  <div class="admin-llm-models-page p-4 md:p-6">
    <UiPageHeader
      :title="$t('admin.llm.models.title')"
      :description="$t('admin.llm.models.description')"
    />

    <div class="mt-6 space-y-4">
      <UAlert
        v-if="listErrorMessage"
        color="error"
        variant="soft"
        icon="i-lucide-alert-circle"
        :title="$t('common.error.generic')"
        :description="listErrorMessage"
      />

      <div class="flex justify-end">
        <UButton icon="i-lucide-plus" :disabled="saving" @click="openCreateModal">
          {{ $t('admin.llm.models.create') }}
        </UButton>
      </div>

      <div v-if="pending && !hasItems" class="flex items-center justify-center py-8">
        <UIcon name="i-lucide-loader-2" class="h-6 w-6 animate-spin text-primary" />
      </div>

      <UPageCard v-else-if="!hasItems">
        <div class="py-10 text-center text-sm text-muted">
          {{ $t('admin.llm.models.empty') }}
        </div>
      </UPageCard>

      <LlmModelsCard
        v-for="model in items"
        :key="model.id"
        :model="model"
        :saving="saving"
        @edit="openEditModal"
        @deactivate="handleDeactivate"
      />

      <LlmModalModelForm
        v-model:open="modelFormOpen"
        :loading="saving"
        :model="editingModel"
        @create="handleCreate"
        @update="handleUpdate"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { LlmModel, LlmModelCreateInput, LlmModelUpdateInput } from '@int/schema';
import { LLM_MODEL_STATUS_MAP } from '@int/schema';

defineOptions({ name: 'AdminLlmModelsPage' });

type UpdatePayload = {
  id: string;
  input: LlmModelUpdateInput;
};

const { items, saving, fetchAll, create, update } = useAdminLlmModels();
const { t } = useI18n();
const toast = useToast();

const hasItems = computed(() => items.value.length > 0);
const isFormOpen = ref(false);
const editingModel = ref<LlmModel | null>(null);

const modelFormOpen = computed({
  get: () => isFormOpen.value,
  set: value => {
    isFormOpen.value = value;
    if (!value) {
      editingModel.value = null;
    }
  }
});

const openCreateModal = () => {
  editingModel.value = null;
  modelFormOpen.value = true;
};

const openEditModal = (model: LlmModel) => {
  editingModel.value = model;
  modelFormOpen.value = true;
};

const closeModelForm = () => {
  modelFormOpen.value = false;
};

type ApiErrorWithMessage = {
  data?: {
    message?: string;
  };
};

const errorMessage = (error: unknown): string => {
  const apiError = error as ApiErrorWithMessage;
  if (typeof apiError?.data?.message === 'string' && apiError.data.message.length > 0) {
    return apiError.data.message;
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return t('common.error.generic');
};

const handleCreate = async (input: LlmModelCreateInput) => {
  try {
    await create(input);
    closeModelForm();
  } catch (error) {
    toast.add({
      title: t('common.error.generic'),
      description: errorMessage(error),
      color: 'error'
    });
  }
};

const handleUpdate = async (payload: UpdatePayload) => {
  try {
    await update(payload.id, payload.input);
    closeModelForm();
  } catch (error) {
    toast.add({
      title: t('common.error.generic'),
      description: errorMessage(error),
      color: 'error'
    });
  }
};

const handleDeactivate = async (model: LlmModel) => {
  if (model.status === LLM_MODEL_STATUS_MAP.ARCHIVED) {
    return;
  }

  const nextStatus =
    model.status === LLM_MODEL_STATUS_MAP.ACTIVE
      ? LLM_MODEL_STATUS_MAP.DISABLED
      : LLM_MODEL_STATUS_MAP.ARCHIVED;

  try {
    await update(model.id, { status: nextStatus });
  } catch (error) {
    toast.add({
      title: t('common.error.generic'),
      description: errorMessage(error),
      color: 'error'
    });
  }
};

const { pending, error: modelsFetchError } = await useAsyncData(
  'admin-llm-models',
  async () => await fetchAll()
);

const listErrorMessage = computed(() => {
  if (hasItems.value) {
    return '';
  }

  const errorValue = modelsFetchError.value;
  if (!errorValue) {
    return '';
  }

  return errorValue instanceof Error ? errorValue.message : t('common.error.generic');
});
</script>

<style lang="scss">
.admin-llm-models-page {
  // Reserved for page-specific styles.
}
</style>
