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
  </div>
</template>

<script setup lang="ts">
import type { LlmRoutingItem, LlmScenarioKey, LlmStrategyKey } from '@int/schema';
import type {
  EditableScenarioKey,
  ResumeAdaptationRuntimeConfig,
  RoutingScenarioCardsConfig,
  RoutingScenarioDraft,
  RoutingSelectOption
} from '../../components/routing/Scenarios/types';
import { LLM_SCENARIO_KEY_MAP, LLM_STRATEGY_KEY_MAP } from '@int/schema';
import { useRoutingScenarioEditor } from '../../composables/useRoutingScenarioEditor';

defineOptions({ name: 'AdminLlmRoutingPage' });

const {
  items: routingItems,
  loading: routingLoading,
  saving: routingSaving,
  error: routingError,
  fetchAll: fetchRouting,
  updateDefault,
  updateScenarioEnabled
} = useAdminLlmRouting();

const { items: allModels, activeItems: activeModels, fetchAll: fetchModels } = useAdminLlmModels();

const { t } = useI18n();
const toast = useToast();

const ADAPTATION_RUNTIME_DEFAULT_TEMPERATURE = 0.3;
const ADAPTATION_RUNTIME_DEFAULT_MAX_TOKENS = 6000;
const ADAPTATION_RUNTIME_DEFAULT_RESPONSE_FORMAT = 'json';
const ADAPTATION_RUNTIME_DEFAULT_REASONING_EFFORT = 'auto';
const SCORING_RUNTIME_DEFAULT_TEMPERATURE = 0;
const SCORING_RUNTIME_DEFAULT_MAX_TOKENS = 800;
const SCORING_RUNTIME_DEFAULT_RESPONSE_FORMAT = 'json';

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

const coverLetterHighItem = computed(() => {
  return routingByScenario.value.get(LLM_SCENARIO_KEY_MAP.COVER_LETTER_GENERATION) ?? null;
});

const coverLetterDraftItem = computed(() => {
  return routingByScenario.value.get(LLM_SCENARIO_KEY_MAP.COVER_LETTER_GENERATION_DRAFT) ?? null;
});

const coverLetterHumanizerItem = computed(() => {
  return routingByScenario.value.get(LLM_SCENARIO_KEY_MAP.COVER_LETTER_HUMANIZER_CRITIC) ?? null;
});

const detailedScoringItem = computed(() => {
  return routingByScenario.value.get(LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION_SCORING_DETAIL) ?? null;
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

const reasoningOptions = computed<RoutingSelectOption[]>(() => [
  {
    label: t('admin.llm.routing.reasoningEffort.auto'),
    value: 'auto'
  },
  {
    label: t('admin.llm.routing.reasoningEffort.low'),
    value: 'low'
  },
  {
    label: t('admin.llm.routing.reasoningEffort.medium'),
    value: 'medium'
  },
  {
    label: t('admin.llm.routing.reasoningEffort.high'),
    value: 'high'
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

const resolveReasoningEffortLabel = (reasoningEffort: string | null | undefined): string => {
  if (reasoningEffort === 'low') {
    return t('admin.llm.routing.reasoningEffort.low');
  }

  if (reasoningEffort === 'medium') {
    return t('admin.llm.routing.reasoningEffort.medium');
  }

  if (reasoningEffort === 'high') {
    return t('admin.llm.routing.reasoningEffort.high');
  }

  return t('admin.llm.routing.reasoningEffort.auto');
};

const formatRuntimeValue = (
  value: number | string | null | undefined,
  runtimeDefault: number | string
): string => {
  if (value === null || value === undefined || value === '') {
    return t('admin.llm.routing.runtimeConfig.runtimeDefault', {
      value: runtimeDefault
    });
  }

  return String(value);
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
    t('admin.llm.routing.capability.reasoningEffort', {
      value: resolveReasoningEffortLabel(adaptation?.default?.reasoningEffort)
    }),
    t('admin.llm.routing.capability.strategy', {
      strategy: resolveStrategyLabel(
        adaptation?.default?.strategyKey ?? LLM_STRATEGY_KEY_MAP.ECONOMY
      )
    })
  ];
});

const coverLetterCapabilities = computed<string[]>(() => {
  const highItem = coverLetterHighItem.value;
  const draftItem = coverLetterDraftItem.value;
  const humanizerItem = coverLetterHumanizerItem.value;

  if (!highItem && !draftItem && !humanizerItem) return [];

  const draftFlowStatus = draftItem?.enabled
    ? t('admin.llm.routing.detailedScoring.enabledShort')
    : t('admin.llm.routing.detailedScoring.disabledShort');
  const highFlowStatus = highItem?.enabled
    ? t('admin.llm.routing.detailedScoring.enabledShort')
    : t('admin.llm.routing.detailedScoring.disabledShort');
  const humanizerStatus = humanizerItem?.enabled
    ? t('admin.llm.routing.detailedScoring.enabledShort')
    : t('admin.llm.routing.detailedScoring.disabledShort');

  return [
    t('admin.llm.routing.coverLetter.capability.draftFlow', { status: draftFlowStatus }),
    t('admin.llm.routing.coverLetter.capability.draftModel', {
      model: resolveModelLabel(draftItem?.default?.modelId ?? null)
    }),
    t('admin.llm.routing.coverLetter.capability.draftReasoning', {
      value: resolveReasoningEffortLabel(draftItem?.default?.reasoningEffort)
    }),
    t('admin.llm.routing.coverLetter.capability.highFlow', { status: highFlowStatus }),
    t('admin.llm.routing.coverLetter.capability.highModel', {
      model: resolveModelLabel(highItem?.default?.modelId ?? null)
    }),
    t('admin.llm.routing.coverLetter.capability.highReasoning', {
      value: resolveReasoningEffortLabel(highItem?.default?.reasoningEffort)
    }),
    t('admin.llm.routing.coverLetter.capability.humanizer', { status: humanizerStatus }),
    t('admin.llm.routing.coverLetter.capability.humanizerModel', {
      model: resolveModelLabel(humanizerItem?.default?.modelId ?? null)
    })
  ];
});

const detailedScoringCapabilities = computed<string[]>(() => {
  const item = detailedScoringItem.value;
  if (!item) return [];

  return [
    t('admin.llm.routing.capability.flowState', {
      status: item.enabled
        ? t('admin.llm.routing.detailedScoring.enabledShort')
        : t('admin.llm.routing.detailedScoring.disabledShort')
    }),
    t('admin.llm.routing.capability.defaultModel', {
      model: resolveModelLabel(item.default?.modelId ?? null)
    }),
    t('admin.llm.routing.capability.retryModel', {
      model: resolveModelLabel(item.default?.retryModelId ?? null)
    })
  ];
});

const resumeAdaptationRuntimeConfig = computed<ResumeAdaptationRuntimeConfig | null>(() => {
  const adaptationDefault = resumeAdaptationItem.value?.default;
  const scoringDefault = resumeScoringItem.value?.default;

  if (!adaptationDefault || !scoringDefault) {
    return null;
  }

  return {
    adaptationTemperature: formatRuntimeValue(
      adaptationDefault.temperature,
      ADAPTATION_RUNTIME_DEFAULT_TEMPERATURE
    ),
    adaptationMaxTokens: formatRuntimeValue(
      adaptationDefault.maxTokens,
      ADAPTATION_RUNTIME_DEFAULT_MAX_TOKENS
    ),
    adaptationResponseFormat: formatRuntimeValue(
      adaptationDefault.responseFormat,
      ADAPTATION_RUNTIME_DEFAULT_RESPONSE_FORMAT
    ),
    adaptationReasoningEffort: formatRuntimeValue(
      adaptationDefault.reasoningEffort,
      ADAPTATION_RUNTIME_DEFAULT_REASONING_EFFORT
    ),
    scoringTemperature: formatRuntimeValue(
      scoringDefault.temperature,
      SCORING_RUNTIME_DEFAULT_TEMPERATURE
    ),
    scoringMaxTokens: formatRuntimeValue(
      scoringDefault.maxTokens,
      SCORING_RUNTIME_DEFAULT_MAX_TOKENS
    ),
    scoringResponseFormat: formatRuntimeValue(
      scoringDefault.responseFormat,
      SCORING_RUNTIME_DEFAULT_RESPONSE_FORMAT
    )
  };
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

  if (coverLetterHighItem.value || coverLetterDraftItem.value || coverLetterHumanizerItem.value) {
    cards[LLM_SCENARIO_KEY_MAP.COVER_LETTER_GENERATION] = {
      capabilities: coverLetterCapabilities.value,
      editDisabled: routingSaving.value
    };
  }

  if (detailedScoringItem.value) {
    cards[LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION_SCORING_DETAIL] = {
      capabilities: detailedScoringCapabilities.value,
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
      reasoningEffort: '',
      strategyKey: '',
      flowEnabled: true,
      draftModelId: '',
      draftReasoningEffort: 'auto',
      draftFlowEnabled: true,
      highModelId: '',
      highReasoningEffort: 'auto',
      highFlowEnabled: true,
      highHumanizerEnabled: false,
      highHumanizerModelId: ''
    };
  }

  if (scenarioKey === LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION) {
    return {
      primaryModelId: resumeAdaptationItem.value?.default?.modelId ?? '',
      secondaryModelId: resumeScoringItem.value?.default?.modelId ?? '',
      tertiaryModelId: resumeAdaptationItem.value?.default?.retryModelId ?? '',
      reasoningEffort: resumeAdaptationItem.value?.default?.reasoningEffort ?? 'auto',
      strategyKey: resumeAdaptationItem.value?.default?.strategyKey ?? LLM_STRATEGY_KEY_MAP.ECONOMY,
      flowEnabled: true,
      draftModelId: '',
      draftReasoningEffort: 'auto',
      draftFlowEnabled: true,
      highModelId: '',
      highReasoningEffort: 'auto',
      highFlowEnabled: true,
      highHumanizerEnabled: false,
      highHumanizerModelId: ''
    };
  }

  if (scenarioKey === LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION_SCORING_DETAIL) {
    return {
      primaryModelId: detailedScoringItem.value?.default?.modelId ?? '',
      secondaryModelId: detailedScoringItem.value?.default?.retryModelId ?? '',
      tertiaryModelId: '',
      reasoningEffort: '',
      strategyKey: '',
      flowEnabled: detailedScoringItem.value?.enabled ?? true,
      draftModelId: '',
      draftReasoningEffort: 'auto',
      draftFlowEnabled: true,
      highModelId: '',
      highReasoningEffort: 'auto',
      highFlowEnabled: true,
      highHumanizerEnabled: false,
      highHumanizerModelId: ''
    };
  }

  return {
    primaryModelId: coverLetterHighItem.value?.default?.modelId ?? '',
    secondaryModelId: '',
    tertiaryModelId: '',
    reasoningEffort: '',
    strategyKey: '',
    flowEnabled: true,
    draftModelId: coverLetterDraftItem.value?.default?.modelId ?? '',
    draftReasoningEffort: coverLetterDraftItem.value?.default?.reasoningEffort ?? 'auto',
    draftFlowEnabled: coverLetterDraftItem.value?.enabled ?? false,
    highModelId: coverLetterHighItem.value?.default?.modelId ?? '',
    highReasoningEffort: coverLetterHighItem.value?.default?.reasoningEffort ?? 'auto',
    highFlowEnabled: coverLetterHighItem.value?.enabled ?? false,
    highHumanizerEnabled: coverLetterHumanizerItem.value?.enabled ?? false,
    highHumanizerModelId: coverLetterHumanizerItem.value?.default?.modelId ?? ''
  };
};

const getModalDescriptionByScenario = (scenarioKey: EditableScenarioKey): string => {
  if (scenarioKey === LLM_SCENARIO_KEY_MAP.RESUME_PARSE) {
    return resumeParseItem.value?.description ?? '';
  }

  if (scenarioKey === LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION) {
    return resumeAdaptationItem.value?.description ?? '';
  }

  if (scenarioKey === LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION_SCORING_DETAIL) {
    return detailedScoringItem.value?.description ?? '';
  }

  return (
    coverLetterHighItem.value?.description ??
    coverLetterDraftItem.value?.description ??
    coverLetterHumanizerItem.value?.description ??
    ''
  );
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
      reasoningOptions: reasoningOptions.value,
      primaryLabel: t('admin.llm.routing.defaultLabel'),
      scoringLabel: t('admin.llm.routing.baseScoringLabel'),
      retryLabel: t('admin.llm.routing.retryLabel'),
      reasoningLabel: t('admin.llm.routing.reasoningEffortLabel'),
      strategyLabel: t('admin.llm.routing.strategyLabel'),
      disabled: routingSaving.value,
      runtimeConfig: resumeAdaptationRuntimeConfig.value
    };
  }

  if (scenarioKey === LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION_SCORING_DETAIL) {
    return {
      modelOptions: modelOptions.value,
      primaryLabel: t('admin.llm.routing.defaultLabel'),
      retryLabel: t('admin.llm.routing.retryLabel'),
      disabled: routingSaving.value,
      showFlowToggle: true,
      flowToggleLabel: t('admin.llm.routing.detailedScoring.enabledLabel'),
      flowToggleDescription: t('admin.llm.routing.detailedScoring.enabledDescription')
    };
  }

  return {
    modelOptions: modelOptions.value,
    reasoningOptions: reasoningOptions.value,
    draftFlowLabel: t('admin.llm.routing.coverLetter.flow.draft.label'),
    draftFlowDescription: t('admin.llm.routing.coverLetter.flow.draft.description'),
    highFlowLabel: t('admin.llm.routing.coverLetter.flow.high.label'),
    highFlowDescription: t('admin.llm.routing.coverLetter.flow.high.description'),
    humanizerLabel: t('admin.llm.routing.coverLetter.flow.humanizer.label'),
    humanizerDescription: t('admin.llm.routing.coverLetter.flow.humanizer.description'),
    draftModelLabel: t('admin.llm.routing.coverLetter.flow.draft.modelLabel'),
    draftReasoningLabel: t('admin.llm.routing.coverLetter.flow.draft.reasoningLabel'),
    highModelLabel: t('admin.llm.routing.coverLetter.flow.high.modelLabel'),
    highReasoningLabel: t('admin.llm.routing.coverLetter.flow.high.reasoningLabel'),
    humanizerModelLabel: t('admin.llm.routing.coverLetter.flow.humanizer.modelLabel'),
    disabled: routingSaving.value
  };
};

const normalizeStrategyKey = (value: string): LlmStrategyKey => {
  if (value === LLM_STRATEGY_KEY_MAP.QUALITY) {
    return LLM_STRATEGY_KEY_MAP.QUALITY;
  }

  return LLM_STRATEGY_KEY_MAP.ECONOMY;
};

const normalizeReasoningEffort = (value: string): 'auto' | 'low' | 'medium' | 'high' => {
  if (value === 'low') {
    return 'low';
  }

  if (value === 'medium') {
    return 'medium';
  }

  if (value === 'high') {
    return 'high';
  }

  return 'auto';
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

  if (scenarioKey === LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION_SCORING_DETAIL) {
    return !draft.flowEnabled || Boolean(draft.primaryModelId);
  }

  if (!draft.draftFlowEnabled && !draft.highFlowEnabled) {
    return true;
  }

  if (draft.draftFlowEnabled && !draft.draftModelId) {
    return false;
  }

  if (draft.highFlowEnabled && !draft.highModelId) {
    return false;
  }

  if (draft.highFlowEnabled && draft.highHumanizerEnabled && !draft.highHumanizerModelId) {
    return false;
  }

  return true;
};

const { modalScenarioKey, modalDraft, modalCanSave, openScenarioEditor, closeScenarioEditor } =
  useRoutingScenarioEditor({
    getSavedDraft: getSavedDraftForScenario,
    getDescription: getModalDescriptionByScenario,
    getFormProps: getModalFormPropsByScenario,
    hasRequiredValues: hasRequiredValuesForScenario,
    isSaving: routingSaving,
    onSave: () => {
      void saveScenario();
    }
  });

const errorMessage = (error: unknown): string => {
  if (isApiError(error)) {
    const data = error.data;
    if (typeof data === 'object' && data !== null && 'message' in data) {
      const msg = (data as Record<string, unknown>).message;
      if (typeof msg === 'string' && msg.length > 0) return msg;
    }
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return t('common.error.generic');
};

async function saveScenario() {
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
          reasoningEffort: normalizeReasoningEffort(modalDraft.value.reasoningEffort),
          strategyKey: normalizeStrategyKey(modalDraft.value.strategyKey)
        }),
        updateDefault(LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION_SCORING, {
          modelId: modalDraft.value.secondaryModelId,
          retryModelId: null,
          strategyKey: null
        })
      ]);
    } else if (scenarioKey === LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION_SCORING_DETAIL) {
      await updateScenarioEnabled(
        LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION_SCORING_DETAIL,
        modalDraft.value.flowEnabled
      );

      if (modalDraft.value.flowEnabled) {
        await updateDefault(LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION_SCORING_DETAIL, {
          modelId: modalDraft.value.primaryModelId,
          retryModelId: modalDraft.value.secondaryModelId || null,
          strategyKey: null
        });
      }
    } else {
      await updateScenarioEnabled(
        LLM_SCENARIO_KEY_MAP.COVER_LETTER_GENERATION_DRAFT,
        modalDraft.value.draftFlowEnabled
      );
      if (modalDraft.value.draftFlowEnabled) {
        await updateDefault(LLM_SCENARIO_KEY_MAP.COVER_LETTER_GENERATION_DRAFT, {
          modelId: modalDraft.value.draftModelId,
          retryModelId: null,
          reasoningEffort: normalizeReasoningEffort(modalDraft.value.draftReasoningEffort),
          strategyKey: null
        });
      }

      await updateScenarioEnabled(
        LLM_SCENARIO_KEY_MAP.COVER_LETTER_GENERATION,
        modalDraft.value.highFlowEnabled
      );
      if (modalDraft.value.highFlowEnabled) {
        await updateDefault(LLM_SCENARIO_KEY_MAP.COVER_LETTER_GENERATION, {
          modelId: modalDraft.value.highModelId,
          retryModelId: null,
          reasoningEffort: normalizeReasoningEffort(modalDraft.value.highReasoningEffort),
          strategyKey: null
        });
      }

      const humanizerEnabled =
        modalDraft.value.highFlowEnabled && modalDraft.value.highHumanizerEnabled;

      await updateScenarioEnabled(
        LLM_SCENARIO_KEY_MAP.COVER_LETTER_HUMANIZER_CRITIC,
        humanizerEnabled
      );
      if (humanizerEnabled) {
        await updateDefault(LLM_SCENARIO_KEY_MAP.COVER_LETTER_HUMANIZER_CRITIC, {
          modelId: modalDraft.value.highHumanizerModelId,
          retryModelId: null,
          strategyKey: null
        });
      }
    }

    await fetchRouting();
    closeScenarioEditor({ action: 'submitted' });
  } catch (error) {
    toast.add({
      title: t('common.error.generic'),
      description: errorMessage(error),
      color: 'error'
    });
  }
}
</script>

<style lang="scss">
.admin-llm-routing-page {
  // Reserved for page-specific styles.
}
</style>
