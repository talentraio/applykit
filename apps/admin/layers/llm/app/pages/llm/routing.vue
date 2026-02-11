<template>
  <div class="admin-llm-routing-page p-4 md:p-6">
    <UiPageHeader
      :title="$t('admin.llm.routing.title')"
      :description="$t('admin.llm.routing.description')"
    />

    <div class="mt-6 space-y-4">
      <UAlert
        v-if="pageErrorMessage"
        color="error"
        variant="soft"
        icon="i-lucide-alert-circle"
        :title="$t('common.error.generic')"
        :description="pageErrorMessage"
      />

      <LlmRoutingScenarios
        :title="$t('admin.llm.routing.title')"
        :description="$t('admin.llm.routing.description')"
        :loading="isInitialLoading"
        :is-empty="routingItems.length === 0"
        :empty-label="$t('admin.llm.routing.empty')"
        :scenario-cards="scenarioCards"
        @edit="openScenarioEditor"
      />
    </div>

    <LlmRoutingScenariosEditModal
      v-model:open="modalOpen"
      v-model:draft="modalDraft"
      :title="modalTitle"
      :description="modalDescription"
      :form-component="activeFormComponent"
      :form-props="activeFormProps"
      :loading="routingSaving"
      :can-save="modalCanSave"
      @cancel="closeScenarioEditor"
      @save="saveScenario"
    />
  </div>
</template>

<script setup lang="ts">
import type { LlmRoutingItem, LlmScenarioKey, LlmStrategyKey } from '@int/schema';
import type {
  EditableScenarioKey,
  RoutingScenarioCardsConfig,
  RoutingScenarioDraft,
  RoutingSelectOption
} from '../../components/routing/Scenarios/types';
import { LLM_SCENARIO_KEY_MAP, LLM_STRATEGY_KEY_MAP } from '@int/schema';
import { useRoutingScenarioEditor } from '../../composables/useRoutingScenarioEditor';

defineOptions({ name: 'AdminLlmRoutingPage' });

type ApiErrorWithMessage = {
  data?: {
    message?: string;
  };
};

const {
  items: routingItems,
  loading: routingLoading,
  saving: routingSaving,
  error: routingError,
  fetchAll: fetchRouting,
  updateDefault
} = useAdminLlmRouting();

const { items: allModels, activeItems: activeModels, fetchAll: fetchModels } = useAdminLlmModels();

const { t } = useI18n();
const toast = useToast();

const { pending: initialPending, error: initialLoadError } = await useAsyncData(
  'admin-llm-routing-page',
  async () => {
    await Promise.all([fetchRouting(), fetchModels()]);
    return true;
  }
);

const routingByScenario = computed(() => {
  const map = new Map<LlmScenarioKey, LlmRoutingItem>();
  routingItems.value.forEach(item => {
    map.set(item.scenarioKey, item);
  });
  return map;
});

const resumeParseItem = computed(() => {
  return routingByScenario.value.get(LLM_SCENARIO_KEY_MAP.RESUME_PARSE) ?? null;
});

const resumeAdaptationItem = computed(() => {
  return routingByScenario.value.get(LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION) ?? null;
});

const resumeScoringItem = computed(() => {
  return routingByScenario.value.get(LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION_SCORING) ?? null;
});

const coverLetterItem = computed(() => {
  return routingByScenario.value.get(LLM_SCENARIO_KEY_MAP.COVER_LETTER_GENERATION) ?? null;
});

const hasAdaptationCard = computed(() => {
  return Boolean(resumeAdaptationItem.value || resumeScoringItem.value);
});

const canEditAdaptation = computed(() => {
  return Boolean(resumeAdaptationItem.value && resumeScoringItem.value);
});

const modelOptions = computed<RoutingSelectOption[]>(() =>
  activeModels.value.map(model => ({
    label: `${model.displayName} (${model.provider})`,
    value: model.id
  }))
);

const strategyOptions = computed<RoutingSelectOption[]>(() => [
  {
    label: t('admin.llm.routing.strategy.economy'),
    value: LLM_STRATEGY_KEY_MAP.ECONOMY
  },
  {
    label: t('admin.llm.routing.strategy.quality'),
    value: LLM_STRATEGY_KEY_MAP.QUALITY
  }
]);

const resolveModelLabel = (modelId: string | null): string => {
  if (!modelId) {
    return t('admin.roles.routing.notConfigured');
  }

  const model = allModels.value.find(item => item.id === modelId);
  if (!model) {
    return t('admin.roles.routing.modelUnavailable');
  }

  return `${model.displayName} (${model.provider})`;
};

const resolveStrategyLabel = (strategyKey: string | null): string => {
  if (strategyKey === LLM_STRATEGY_KEY_MAP.QUALITY) {
    return t('admin.llm.routing.strategy.quality');
  }

  return t('admin.llm.routing.strategy.economy');
};

const resumeParseCapabilities = computed<string[]>(() => {
  const item = resumeParseItem.value;
  if (!item) return [];

  return [
    t('admin.llm.routing.capability.defaultModel', {
      model: resolveModelLabel(item.default?.modelId ?? null)
    }),
    t('admin.llm.routing.capability.retryModel', {
      model: resolveModelLabel(item.default?.retryModelId ?? null)
    })
  ];
});

const resumeAdaptationCapabilities = computed<string[]>(() => {
  const adaptation = resumeAdaptationItem.value;
  const scoring = resumeScoringItem.value;

  return [
    t('admin.llm.routing.capability.defaultModel', {
      model: resolveModelLabel(adaptation?.default?.modelId ?? null)
    }),
    t('admin.llm.routing.capability.scoringModel', {
      model: resolveModelLabel(scoring?.default?.modelId ?? null)
    }),
    t('admin.llm.routing.capability.retryModel', {
      model: resolveModelLabel(adaptation?.default?.retryModelId ?? null)
    }),
    t('admin.llm.routing.capability.strategy', {
      strategy: resolveStrategyLabel(
        adaptation?.default?.strategyKey ?? LLM_STRATEGY_KEY_MAP.ECONOMY
      )
    })
  ];
});

const coverLetterCapabilities = computed<string[]>(() => {
  const item = coverLetterItem.value;
  if (!item) return [];

  return [
    t('admin.llm.routing.capability.defaultModel', {
      model: resolveModelLabel(item.default?.modelId ?? null)
    })
  ];
});

const scenarioCards = computed<RoutingScenarioCardsConfig>(() => {
  const cards: RoutingScenarioCardsConfig = {};

  if (resumeParseItem.value) {
    cards[LLM_SCENARIO_KEY_MAP.RESUME_PARSE] = {
      capabilities: resumeParseCapabilities.value,
      editDisabled: routingSaving.value
    };
  }

  if (hasAdaptationCard.value) {
    cards[LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION] = {
      capabilities: resumeAdaptationCapabilities.value,
      editDisabled: routingSaving.value || !canEditAdaptation.value
    };
  }

  if (coverLetterItem.value) {
    cards[LLM_SCENARIO_KEY_MAP.COVER_LETTER_GENERATION] = {
      capabilities: coverLetterCapabilities.value,
      editDisabled: routingSaving.value
    };
  }

  return cards;
});

const isInitialLoading = computed(() => {
  return initialPending.value || routingLoading.value;
});

const pageErrorMessage = computed(() => {
  if (routingError.value) {
    return routingError.value;
  }

  const errorValue = initialLoadError.value;
  if (!errorValue) {
    return '';
  }

  return errorValue instanceof Error ? errorValue.message : t('common.error.generic');
});

const getSavedDraftForScenario = (scenarioKey: EditableScenarioKey): RoutingScenarioDraft => {
  if (scenarioKey === LLM_SCENARIO_KEY_MAP.RESUME_PARSE) {
    return {
      primaryModelId: resumeParseItem.value?.default?.modelId ?? '',
      secondaryModelId: resumeParseItem.value?.default?.retryModelId ?? '',
      tertiaryModelId: '',
      strategyKey: ''
    };
  }

  if (scenarioKey === LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION) {
    return {
      primaryModelId: resumeAdaptationItem.value?.default?.modelId ?? '',
      secondaryModelId: resumeScoringItem.value?.default?.modelId ?? '',
      tertiaryModelId: resumeAdaptationItem.value?.default?.retryModelId ?? '',
      strategyKey: resumeAdaptationItem.value?.default?.strategyKey ?? LLM_STRATEGY_KEY_MAP.ECONOMY
    };
  }

  return {
    primaryModelId: coverLetterItem.value?.default?.modelId ?? '',
    secondaryModelId: '',
    tertiaryModelId: '',
    strategyKey: ''
  };
};

const getModalDescriptionByScenario = (scenarioKey: EditableScenarioKey): string => {
  if (scenarioKey === LLM_SCENARIO_KEY_MAP.RESUME_PARSE) {
    return resumeParseItem.value?.description ?? '';
  }

  if (scenarioKey === LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION) {
    return resumeAdaptationItem.value?.description ?? '';
  }

  return coverLetterItem.value?.description ?? '';
};

const getModalFormPropsByScenario = (scenarioKey: EditableScenarioKey): Record<string, unknown> => {
  if (scenarioKey === LLM_SCENARIO_KEY_MAP.RESUME_PARSE) {
    return {
      modelOptions: modelOptions.value,
      primaryLabel: t('admin.llm.routing.defaultLabel'),
      retryLabel: t('admin.llm.routing.retryLabel'),
      disabled: routingSaving.value
    };
  }

  if (scenarioKey === LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION) {
    return {
      modelOptions: modelOptions.value,
      strategyOptions: strategyOptions.value,
      primaryLabel: t('admin.llm.routing.defaultLabel'),
      scoringLabel: t('admin.llm.routing.scoringLabel'),
      retryLabel: t('admin.llm.routing.retryLabel'),
      strategyLabel: t('admin.llm.routing.strategyLabel'),
      disabled: routingSaving.value
    };
  }

  return {
    modelOptions: modelOptions.value,
    primaryLabel: t('admin.llm.routing.defaultLabel'),
    disabled: routingSaving.value
  };
};

const normalizeStrategyKey = (value: string): LlmStrategyKey => {
  if (value === LLM_STRATEGY_KEY_MAP.QUALITY) {
    return LLM_STRATEGY_KEY_MAP.QUALITY;
  }

  return LLM_STRATEGY_KEY_MAP.ECONOMY;
};

const hasRequiredValuesForScenario = (
  scenarioKey: EditableScenarioKey,
  draft: RoutingScenarioDraft
): boolean => {
  if (scenarioKey === LLM_SCENARIO_KEY_MAP.RESUME_PARSE) {
    return Boolean(draft.primaryModelId && draft.secondaryModelId);
  }

  if (scenarioKey === LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION) {
    return Boolean(draft.primaryModelId && draft.secondaryModelId && draft.strategyKey);
  }

  return Boolean(draft.primaryModelId);
};

const {
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
} = useRoutingScenarioEditor({
  getSavedDraft: getSavedDraftForScenario,
  getDescription: getModalDescriptionByScenario,
  getFormProps: getModalFormPropsByScenario,
  hasRequiredValues: hasRequiredValuesForScenario
});

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

const saveScenario = async () => {
  const scenarioKey = modalScenarioKey.value;
  if (!scenarioKey || !modalCanSave.value) return;

  try {
    if (scenarioKey === LLM_SCENARIO_KEY_MAP.RESUME_PARSE) {
      await updateDefault(LLM_SCENARIO_KEY_MAP.RESUME_PARSE, {
        modelId: modalDraft.value.primaryModelId,
        retryModelId: modalDraft.value.secondaryModelId,
        strategyKey: null
      });
    } else if (scenarioKey === LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION) {
      await Promise.all([
        updateDefault(LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION, {
          modelId: modalDraft.value.primaryModelId,
          retryModelId: modalDraft.value.tertiaryModelId || null,
          strategyKey: normalizeStrategyKey(modalDraft.value.strategyKey)
        }),
        updateDefault(LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION_SCORING, {
          modelId: modalDraft.value.secondaryModelId,
          retryModelId: null,
          strategyKey: null
        })
      ]);
    } else {
      await updateDefault(LLM_SCENARIO_KEY_MAP.COVER_LETTER_GENERATION, {
        modelId: modalDraft.value.primaryModelId,
        retryModelId: null,
        strategyKey: null
      });
    }

    await fetchRouting();
    closeScenarioEditor();
  } catch (error) {
    toast.add({
      title: t('common.error.generic'),
      description: errorMessage(error),
      color: 'error'
    });
  }
};
</script>

<style lang="scss">
.admin-llm-routing-page {
  // Reserved for page-specific styles.
}
</style>
