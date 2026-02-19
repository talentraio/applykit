import type { Component, ComputedRef, Ref } from 'vue';
import type {
  EditableScenarioKey,
  RoutingScenarioDraft
} from '../components/routing/Scenarios/types';
import { LazyModalRoutingScenariosEdit } from '#components';
import { LLM_SCENARIO_KEY_MAP } from '@int/schema';
import { computed, defineAsyncComponent, ref } from 'vue';
import {
  cloneRoutingScenarioDraft,
  createEmptyRoutingScenarioDraft
} from '../components/routing/Scenarios/types';

const ROUTING_SCENARIO_EDITOR_OVERLAY_ID = 'admin-routing-scenarios-edit-modal';
const ROUTING_SCENARIO_EDITOR_OVERLAY_OPEN_STATE_KEY =
  'admin-routing-scenarios-edit-modal-overlay-open';

type UseRoutingScenarioEditorOptions = {
  getSavedDraft: (scenarioKey: EditableScenarioKey) => RoutingScenarioDraft;
  getDescription: (scenarioKey: EditableScenarioKey) => string;
  getFormProps: (scenarioKey: EditableScenarioKey) => Record<string, unknown>;
  hasRequiredValues?: (scenarioKey: EditableScenarioKey, draft: RoutingScenarioDraft) => boolean;
  isSaving?: Ref<boolean> | ComputedRef<boolean>;
  onSave: () => Promise<void> | void;
};

type RoutingScenariosEditModalClosePayload = { action: 'cancelled' } | { action: 'submitted' };

type UseRoutingScenarioEditorReturn = {
  modalScenarioKey: Ref<EditableScenarioKey | null>;
  modalDraft: Ref<RoutingScenarioDraft>;
  modalCanSave: ComputedRef<boolean>;
  openScenarioEditor: (scenarioKey: EditableScenarioKey) => void;
  closeScenarioEditor: (payload?: RoutingScenariosEditModalClosePayload) => void;
};

const scenarioFormComponents: Record<EditableScenarioKey, Component> = {
  [LLM_SCENARIO_KEY_MAP.RESUME_PARSE]: defineAsyncComponent(
    () => import('@admin/llm/app/components/routing/Scenarios/form/ResumeParse.vue')
  ),
  [LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION]: defineAsyncComponent(
    () => import('@admin/llm/app/components/routing/Scenarios/form/ResumeAdaptation.vue')
  ),
  [LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION_SCORING_DETAIL]: defineAsyncComponent(
    () => import('@admin/llm/app/components/routing/Scenarios/form/ResumeDetailedScoring.vue')
  ),
  [LLM_SCENARIO_KEY_MAP.COVER_LETTER_GENERATION]: defineAsyncComponent(
    () => import('@admin/llm/app/components/routing/Scenarios/form/CoverLetter.vue')
  )
};

export function useRoutingScenarioEditor(
  options: UseRoutingScenarioEditorOptions
): UseRoutingScenarioEditorReturn {
  const { t } = useI18n();
  const overlayOpen = useState<boolean>(
    ROUTING_SCENARIO_EDITOR_OVERLAY_OPEN_STATE_KEY,
    () => false
  );
  const editScenarioOverlay = useProgrammaticOverlay<
    typeof LazyModalRoutingScenariosEdit,
    RoutingScenariosEditModalClosePayload | undefined
  >(LazyModalRoutingScenariosEdit, {
    id: ROUTING_SCENARIO_EDITOR_OVERLAY_ID,
    destroyOnClose: true
  });

  const modalScenarioKey = ref<EditableScenarioKey | null>(null);
  const modalDraft = ref<RoutingScenarioDraft>(createEmptyRoutingScenarioDraft());
  const savedDraft = ref<RoutingScenarioDraft>(createEmptyRoutingScenarioDraft());

  const resetEditorState = () => {
    modalScenarioKey.value = null;
    modalDraft.value = createEmptyRoutingScenarioDraft();
    savedDraft.value = createEmptyRoutingScenarioDraft();
  };

  const modalTitle = computed(() => {
    const scenarioKey = modalScenarioKey.value;
    if (!scenarioKey) {
      return '';
    }

    const label =
      scenarioKey === LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION
        ? t('admin.llm.routing.scenarios.resume_adaptation_with_scoring')
        : t(`admin.llm.routing.scenarios.${scenarioKey}`);

    return t('admin.llm.routing.modal.editTitle', { scenario: label });
  });

  const modalDescription = computed(() => {
    const scenarioKey = modalScenarioKey.value;
    if (!scenarioKey) {
      return '';
    }

    return options.getDescription(scenarioKey);
  });

  const activeFormComponent = computed<Component | null>(() => {
    const scenarioKey = modalScenarioKey.value;
    return scenarioKey ? scenarioFormComponents[scenarioKey] : null;
  });

  const activeFormProps = computed<Record<string, unknown> | null>(() => {
    const scenarioKey = modalScenarioKey.value;
    if (!scenarioKey) {
      return null;
    }

    return options.getFormProps(scenarioKey);
  });

  const modalHasChanges = computed(() => {
    const scenarioKey = modalScenarioKey.value;
    if (!scenarioKey) return false;

    if (scenarioKey === LLM_SCENARIO_KEY_MAP.RESUME_PARSE) {
      return (
        modalDraft.value.primaryModelId !== savedDraft.value.primaryModelId ||
        modalDraft.value.secondaryModelId !== savedDraft.value.secondaryModelId
      );
    }

    if (scenarioKey === LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION_SCORING_DETAIL) {
      return (
        modalDraft.value.primaryModelId !== savedDraft.value.primaryModelId ||
        modalDraft.value.secondaryModelId !== savedDraft.value.secondaryModelId ||
        modalDraft.value.flowEnabled !== savedDraft.value.flowEnabled
      );
    }

    if (scenarioKey === LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION) {
      return (
        modalDraft.value.primaryModelId !== savedDraft.value.primaryModelId ||
        modalDraft.value.secondaryModelId !== savedDraft.value.secondaryModelId ||
        modalDraft.value.tertiaryModelId !== savedDraft.value.tertiaryModelId ||
        modalDraft.value.reasoningEffort !== savedDraft.value.reasoningEffort ||
        modalDraft.value.strategyKey !== savedDraft.value.strategyKey
      );
    }

    return modalDraft.value.primaryModelId !== savedDraft.value.primaryModelId;
  });

  const modalHasRequiredValues = computed(() => {
    const scenarioKey = modalScenarioKey.value;
    if (!scenarioKey) {
      return false;
    }

    if (!options.hasRequiredValues) {
      return true;
    }

    return options.hasRequiredValues(scenarioKey, modalDraft.value);
  });

  const modalCanSave = computed(() => {
    return modalHasChanges.value && modalHasRequiredValues.value;
  });

  const openScenarioEditor = (scenarioKey: EditableScenarioKey) => {
    if (overlayOpen.value) {
      return;
    }

    const nextSavedDraft = options.getSavedDraft(scenarioKey);

    modalScenarioKey.value = scenarioKey;
    savedDraft.value = cloneRoutingScenarioDraft(nextSavedDraft);
    modalDraft.value = cloneRoutingScenarioDraft(nextSavedDraft);
    overlayOpen.value = true;

    void (async () => {
      try {
        await editScenarioOverlay.open({
          title: modalTitle.value,
          description: modalDescription.value,
          formComponent: activeFormComponent.value,
          formProps: () => activeFormProps.value,
          loading: () => options.isSaving?.value ?? false,
          canSave: () => modalCanSave.value,
          draft: modalDraft.value,
          onSave: () => {
            if (options.isSaving?.value || !modalCanSave.value) {
              return;
            }

            void options.onSave();
          }
        });
      } finally {
        overlayOpen.value = false;
        resetEditorState();
      }
    })();
  };

  const closeScenarioEditor = (
    payload: RoutingScenariosEditModalClosePayload = { action: 'cancelled' }
  ) => {
    if (overlayOpen.value) {
      overlayOpen.value = false;
      editScenarioOverlay.close(payload);
    }

    resetEditorState();
  };

  return {
    modalScenarioKey,
    modalDraft,
    modalCanSave,
    openScenarioEditor,
    closeScenarioEditor
  };
}
