import type { LlmModel, LlmModelCreateInput, LlmModelUpdateInput } from '@int/schema';
import { LazyLlmModalModelForm } from '#components';

const LLM_MODEL_FORM_MODAL_OVERLAY_ID = 'admin-llm-model-form-modal';
const LLM_MODEL_FORM_MODAL_OVERLAY_OPEN_STATE_KEY = 'admin-llm-model-form-modal-overlay-open';

type LlmModelFormModalClosePayload = { action: 'cancelled' } | { action: 'submitted' };

type LlmModelFormUpdatePayload = {
  id: string;
  input: LlmModelUpdateInput;
};

export type OpenCreateLlmModelFormModalOptions = {
  onCreate: (input: LlmModelCreateInput) => Promise<boolean> | boolean;
};

export type OpenEditLlmModelFormModalOptions = {
  model: LlmModel;
  onUpdate: (payload: LlmModelFormUpdatePayload) => Promise<boolean> | boolean;
};

export type UseLlmModelFormModalComposable = {
  openCreateModelFormModal: (
    options: OpenCreateLlmModelFormModalOptions
  ) => Promise<LlmModelFormModalClosePayload | undefined>;
  openEditModelFormModal: (
    options: OpenEditLlmModelFormModalOptions
  ) => Promise<LlmModelFormModalClosePayload | undefined>;
  closeModelFormModal: () => void;
};

export function useLlmModelFormModal(): UseLlmModelFormModalComposable {
  const overlayOpen = useState<boolean>(LLM_MODEL_FORM_MODAL_OVERLAY_OPEN_STATE_KEY, () => false);
  const modelFormOverlay = useProgrammaticOverlay<
    typeof LazyLlmModalModelForm,
    LlmModelFormModalClosePayload | undefined
  >(LazyLlmModalModelForm, {
    id: LLM_MODEL_FORM_MODAL_OVERLAY_ID,
    destroyOnClose: true
  });

  const closeModelFormModal = (): void => {
    if (!overlayOpen.value) {
      return;
    }

    overlayOpen.value = false;
    modelFormOverlay.close({ action: 'cancelled' });
  };

  const openCreateModelFormModal = async (
    options: OpenCreateLlmModelFormModalOptions
  ): Promise<LlmModelFormModalClosePayload | undefined> => {
    if (overlayOpen.value) {
      return undefined;
    }

    let isSubmitting = false;

    const handleCreate = async (input: LlmModelCreateInput) => {
      if (isSubmitting) {
        return;
      }

      isSubmitting = true;
      modelFormOverlay.patch({ loading: true });

      try {
        const isSuccess = await options.onCreate(input);
        if (isSuccess) {
          modelFormOverlay.close({ action: 'submitted' });
          return;
        }
      } finally {
        isSubmitting = false;
      }

      modelFormOverlay.patch({ loading: false });
    };

    overlayOpen.value = true;

    try {
      return await modelFormOverlay.open({
        loading: false,
        model: null,
        onCreate: (input: LlmModelCreateInput) => {
          void handleCreate(input);
        }
      });
    } finally {
      overlayOpen.value = false;
    }
  };

  const openEditModelFormModal = async (
    options: OpenEditLlmModelFormModalOptions
  ): Promise<LlmModelFormModalClosePayload | undefined> => {
    if (overlayOpen.value) {
      return undefined;
    }

    let isSubmitting = false;

    const handleUpdate = async (payload: LlmModelFormUpdatePayload) => {
      if (isSubmitting) {
        return;
      }

      isSubmitting = true;
      modelFormOverlay.patch({ loading: true });

      try {
        const isSuccess = await options.onUpdate(payload);
        if (isSuccess) {
          modelFormOverlay.close({ action: 'submitted' });
          return;
        }
      } finally {
        isSubmitting = false;
      }

      modelFormOverlay.patch({ loading: false });
    };

    overlayOpen.value = true;

    try {
      return await modelFormOverlay.open({
        loading: false,
        model: options.model,
        onUpdate: (payload: LlmModelFormUpdatePayload) => {
          void handleUpdate(payload);
        }
      });
    } finally {
      overlayOpen.value = false;
    }
  };

  return {
    openCreateModelFormModal,
    openEditModelFormModal,
    closeModelFormModal
  };
}
