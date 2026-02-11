import type { Component, ComputedRef, Ref } from 'vue';
import type {
  EditableScenarioKey,
  RoutingScenarioDraft
} from '../components/routing/Scenarios/types';
import { LLM_SCENARIO_KEY_MAP } from '@int/schema';
import { computed, defineAsyncComponent, ref } from 'vue';
import {
  cloneRoutingScenarioDraft,
  createEmptyRoutingScenarioDraft
} from '../components/routing/Scenarios/types';

type UseRoutingScenarioEditorOptions = {
  getSavedDraft: (scenarioKey: EditableScenarioKey) => RoutingScenarioDraft;
  getDescription: (scenarioKey: EditableScenarioKey) => string;
  getFormProps: (scenarioKey: EditableScenarioKey) => Record<string, unknown>;
  hasRequiredValues?: (scenarioKey: EditableScenarioKey, draft: RoutingScenarioDraft) => boolean;
};

type UseRoutingScenarioEditorReturn = {
  modalOpen: Ref<boolean>;
  modalScenarioKey: Ref<EditableScenarioKey | null>;
  modalDraft: Ref<RoutingScenarioDraft>;
  modalTitle: ComputedRef<string>;
  modalDescription: ComputedRef<string>;
  activeFormComponent: ComputedRef<Component>;
  activeFormProps: ComputedRef<Record<string, unknown>>;
  modalCanSave: ComputedRef<boolean>;
  openScenarioEditor: (scenarioKey: EditableScenarioKey) => void;
  closeScenarioEditor: () => void;
};

const scenarioFormComponents: Record<EditableScenarioKey, Component> = {
  [LLM_SCENARIO_KEY_MAP.RESUME_PARSE]: defineAsyncComponent(
    () => import('@admin/llm/app/components/routing/Scenarios/form/ResumeParse.vue')
  ),
  [LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION]: defineAsyncComponent(
    () => import('@admin/llm/app/components/routing/Scenarios/form/ResumeAdaptation.vue')
  ),
  [LLM_SCENARIO_KEY_MAP.COVER_LETTER_GENERATION]: defineAsyncComponent(
    () => import('@admin/llm/app/components/routing/Scenarios/form/CoverLetter.vue')
  )
};

export function useRoutingScenarioEditor(
  options: UseRoutingScenarioEditorOptions
): UseRoutingScenarioEditorReturn {
  const { t } = useI18n();

  const modalOpen = ref(false);
  const modalScenarioKey = ref<EditableScenarioKey | null>(null);
  const modalDraft = ref<RoutingScenarioDraft>(createEmptyRoutingScenarioDraft());
  const savedDraft = ref<RoutingScenarioDraft>(createEmptyRoutingScenarioDraft());

  const openScenarioEditor = (scenarioKey: EditableScenarioKey) => {
    const nextSavedDraft = options.getSavedDraft(scenarioKey);

    modalScenarioKey.value = scenarioKey;
    savedDraft.value = cloneRoutingScenarioDraft(nextSavedDraft);
    modalDraft.value = cloneRoutingScenarioDraft(nextSavedDraft);
    modalOpen.value = true;
  };

  const closeScenarioEditor = () => {
    modalOpen.value = false;
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

  const activeFormComponent = computed<Component>(() => {
    const scenarioKey = modalScenarioKey.value;
    return scenarioKey
      ? scenarioFormComponents[scenarioKey]
      : scenarioFormComponents[LLM_SCENARIO_KEY_MAP.RESUME_PARSE];
  });

  const activeFormProps = computed<Record<string, unknown>>(() => {
    const scenarioKey = modalScenarioKey.value;
    if (!scenarioKey) {
      return {};
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

    if (scenarioKey === LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION) {
      return (
        modalDraft.value.primaryModelId !== savedDraft.value.primaryModelId ||
        modalDraft.value.secondaryModelId !== savedDraft.value.secondaryModelId ||
        modalDraft.value.tertiaryModelId !== savedDraft.value.tertiaryModelId ||
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

  return {
    modalOpen,
    modalScenarioKey,
    modalDraft,
    modalTitle,
    modalDescription,
    activeFormComponent,
    activeFormProps,
    modalCanSave,
    openScenarioEditor,
    closeScenarioEditor
  };
}
