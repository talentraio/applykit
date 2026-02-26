<template>
  <LlmRoutingScenarios
    :title="$t('admin.roles.routing.title')"
    :description="$t('admin.roles.routing.description')"
    :loading="isInitialLoading"
    :is-empty="routingItems.length === 0"
    :empty-label="$t('admin.llm.routing.empty')"
    :edit-label="$t('admin.roles.edit')"
    :scenario-cards="scenarioCards"
    class="roles-item-scenarios"
    @edit="openScenarioEditor"
  />
</template>

<script setup lang="ts">
import type {
  EditableScenarioKey,
  ResumeAdaptationRuntimeConfig,
  RoutingScenarioCardsConfig,
  RoutingScenarioDraft,
  RoutingSelectOption
} from '@admin/llm/app/components/routing/Scenarios/types';
import type { LlmRoutingItem, LlmScenarioKey, LlmStrategyKey, Role } from '@int/schema';
import { useRoutingScenarioEditor } from '@admin/llm/app/composables/useRoutingScenarioEditor';
import { LLM_SCENARIO_KEY_MAP, LLM_STRATEGY_KEY_MAP } from '@int/schema';

defineOptions({ name: 'RolesItemScenarios' });

const props = defineProps<Props>();

type Props = {
  role: Role;
};

const INHERIT_MODEL_ID = '__inherit__';
const INHERIT_STRATEGY_KEY = '__inherit_strategy__';
const INHERIT_REASONING_EFFORT = '__inherit_reasoning_effort__';
const ADAPTATION_RUNTIME_DEFAULT_TEMPERATURE = 0.3;
const ADAPTATION_RUNTIME_DEFAULT_MAX_TOKENS = 6000;
const ADAPTATION_RUNTIME_DEFAULT_RESPONSE_FORMAT = 'json';
const ADAPTATION_RUNTIME_DEFAULT_REASONING_EFFORT = 'auto';
const SCORING_RUNTIME_DEFAULT_TEMPERATURE = 0;
const SCORING_RUNTIME_DEFAULT_MAX_TOKENS = 800;
const SCORING_RUNTIME_DEFAULT_RESPONSE_FORMAT = 'json';

const {
  items: routingItems,
  loading: routingLoading,
  saving: routingSaving,
  fetchAll: fetchRouting,
  upsertRoleEnabledOverride,
  deleteRoleEnabledOverride,
  upsertRoleOverride,
  deleteRoleOverride
} = useAdminLlmRouting();

const { items: llmModels, activeItems: activeModels, fetchAll: fetchModels } = useAdminLlmModels();

const { t } = useI18n();
const toast = useToast();

const notifyError = (error: unknown) => {
  if (!import.meta.client) return;

  let description: string | undefined;

  if (isApiError(error)) {
    const data = error.data;
    if (typeof data === 'object' && data !== null && 'message' in data) {
      const msg = (data as Record<string, unknown>).message;
      if (typeof msg === 'string' && msg.length > 0) description = msg;
    }
  } else if (error instanceof Error && error.message.length > 0) {
    description = error.message;
  }

  toast.add({
    title: t('common.error.generic'),
    description,
    color: 'error'
  });
};

const { pending } = await useAsyncData(
  'admin-role-scenarios',
  async () => {
    const [routingResult, modelsResult] = await Promise.allSettled([fetchRouting(), fetchModels()]);

    if (routingResult.status === 'rejected') {
      notifyError(routingResult.reason);
    }

    if (modelsResult.status === 'rejected') {
      notifyError(modelsResult.reason);
    }

    return true;
  },
  {
    watch: [() => props.role]
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

const isInitialLoading = computed(() => {
  return pending.value || routingLoading.value;
});

const isRoutingDisabled = computed(() => {
  return routingSaving.value || routingLoading.value || pending.value;
});

const modelOptionsWithInherit = computed<RoutingSelectOption[]>(() => [
  {
    label: t('admin.roles.routing.inheritDefault'),
    value: INHERIT_MODEL_ID
  },
  ...activeModels.value.map(model => ({
    label: `${model.displayName} (${model.provider})`,
    value: model.id
  }))
]);

const strategyOptionsWithInherit = computed<RoutingSelectOption[]>(() => [
  {
    label: t('admin.roles.routing.inheritDefault'),
    value: INHERIT_STRATEGY_KEY
  },
  {
    label: t('admin.llm.routing.strategy.economy'),
    value: LLM_STRATEGY_KEY_MAP.ECONOMY
  },
  {
    label: t('admin.llm.routing.strategy.quality'),
    value: LLM_STRATEGY_KEY_MAP.QUALITY
  }
]);

const reasoningOptionsWithInherit = computed<RoutingSelectOption[]>(() => [
  {
    label: t('admin.roles.routing.inheritDefault'),
    value: INHERIT_REASONING_EFFORT
  },
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

  const model = llmModels.value.find(item => item.id === modelId);
  if (!model) {
    return t('admin.roles.routing.modelUnavailable');
  }

  return `${model.displayName} (${model.provider})`;
};

const resolveStrategyLabel = (strategyKey: string | null): string => {
  if (!strategyKey) {
    return t('admin.roles.routing.notConfigured');
  }

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

const resolveInheritedModelLabel = (modelId: string): string => {
  if (!modelId) {
    return t('admin.roles.routing.inheritDefault');
  }

  return resolveModelLabel(modelId);
};

const resolveInheritedStrategyLabel = (strategyKey: string): string => {
  if (!strategyKey) {
    return t('admin.roles.routing.inheritDefault');
  }

  return resolveStrategyLabel(strategyKey);
};

const resolveInheritedReasoningEffortLabel = (reasoningEffort: string): string => {
  if (!reasoningEffort) {
    return t('admin.roles.routing.inheritDefault');
  }

  return resolveReasoningEffortLabel(reasoningEffort);
};

const findRoleOverride = (item: LlmRoutingItem | null) => {
  if (!item) return null;
  return item.overrides.find(entry => entry.role === props.role) ?? null;
};

const findRoleEnabledOverride = (item: LlmRoutingItem | null) => {
  if (!item) return null;
  return item.enabledOverrides.find(entry => entry.role === props.role) ?? null;
};

const resolveEffectiveFlowEnabled = (item: LlmRoutingItem | null): boolean => {
  const enabledOverride = findRoleEnabledOverride(item);
  if (enabledOverride) {
    return enabledOverride.enabled;
  }

  return item?.enabled ?? true;
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

const resolveEffectiveRuntimeValue = (
  item: LlmRoutingItem | null,
  selector: (
    assignment: NonNullable<LlmRoutingItem['default']>
  ) => number | string | null | undefined,
  runtimeDefault: number | string
): string => {
  const override = findRoleOverride(item);
  if (override) {
    return formatRuntimeValue(selector(override), runtimeDefault);
  }

  const assignment = item?.default;
  return formatRuntimeValue(assignment ? selector(assignment) : null, runtimeDefault);
};

const currentOverrideModelId = (item: LlmRoutingItem | null): string => {
  return findRoleOverride(item)?.modelId ?? '';
};

const currentRetryOverrideModelId = (item: LlmRoutingItem | null): string => {
  return findRoleOverride(item)?.retryModelId ?? '';
};

const currentStrategyOverrideKey = (item: LlmRoutingItem | null): string => {
  return findRoleOverride(item)?.strategyKey ?? '';
};

const currentReasoningEffortOverride = (item: LlmRoutingItem | null): string => {
  return findRoleOverride(item)?.reasoningEffort ?? '';
};

const toSelectModelId = (value: string): string => {
  return value || INHERIT_MODEL_ID;
};

const fromSelectModelId = (value: string): string => {
  return value === INHERIT_MODEL_ID ? '' : value;
};

const toSelectStrategyKey = (value: string): string => {
  return value || INHERIT_STRATEGY_KEY;
};

const fromSelectStrategyKey = (value: string): LlmStrategyKey | null => {
  if (value === INHERIT_STRATEGY_KEY || value.length === 0) {
    return null;
  }

  if (value === LLM_STRATEGY_KEY_MAP.QUALITY) {
    return LLM_STRATEGY_KEY_MAP.QUALITY;
  }

  return LLM_STRATEGY_KEY_MAP.ECONOMY;
};

const toSelectReasoningEffort = (value: string): string => {
  return value || INHERIT_REASONING_EFFORT;
};

const fromSelectReasoningEffort = (value: string): 'auto' | 'low' | 'medium' | 'high' | null => {
  if (value === INHERIT_REASONING_EFFORT || value.length === 0) {
    return null;
  }

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

const resumeParseCapabilities = computed<string[]>(() => {
  return [
    t('admin.roles.routing.currentModel', {
      model: resolveInheritedModelLabel(currentOverrideModelId(resumeParseItem.value))
    }),
    t('admin.roles.routing.currentRetryModel', {
      model: resolveInheritedModelLabel(currentRetryOverrideModelId(resumeParseItem.value))
    }),
    t('admin.roles.routing.defaultModel', {
      model: resolveModelLabel(resumeParseItem.value?.default?.modelId ?? null)
    }),
    t('admin.roles.routing.defaultRetryModel', {
      model: resolveModelLabel(resumeParseItem.value?.default?.retryModelId ?? null)
    })
  ];
});

const resumeAdaptationCapabilities = computed<string[]>(() => {
  return [
    t('admin.roles.routing.currentModel', {
      model: resolveInheritedModelLabel(currentOverrideModelId(resumeAdaptationItem.value))
    }),
    t('admin.roles.routing.currentScoringModel', {
      model: resolveInheritedModelLabel(currentOverrideModelId(resumeScoringItem.value))
    }),
    t('admin.roles.routing.currentRetryModel', {
      model: resolveInheritedModelLabel(currentRetryOverrideModelId(resumeAdaptationItem.value))
    }),
    t('admin.roles.routing.currentStrategy', {
      strategy: resolveInheritedStrategyLabel(
        currentStrategyOverrideKey(resumeAdaptationItem.value)
      )
    }),
    t('admin.roles.routing.currentReasoningEffort', {
      value: resolveInheritedReasoningEffortLabel(
        currentReasoningEffortOverride(resumeAdaptationItem.value)
      )
    }),
    t('admin.roles.routing.defaultModel', {
      model: resolveModelLabel(resumeAdaptationItem.value?.default?.modelId ?? null)
    }),
    t('admin.roles.routing.defaultScoringModel', {
      model: resolveModelLabel(resumeScoringItem.value?.default?.modelId ?? null)
    }),
    t('admin.roles.routing.defaultRetryModel', {
      model: resolveModelLabel(resumeAdaptationItem.value?.default?.retryModelId ?? null)
    }),
    t('admin.roles.routing.defaultStrategy', {
      strategy: resolveStrategyLabel(
        resumeAdaptationItem.value?.default?.strategyKey ?? LLM_STRATEGY_KEY_MAP.ECONOMY
      )
    }),
    t('admin.roles.routing.defaultReasoningEffort', {
      value: resolveReasoningEffortLabel(resumeAdaptationItem.value?.default?.reasoningEffort)
    })
  ];
});

const coverLetterCapabilities = computed<string[]>(() => {
  const draftFlowStatus = resolveEffectiveFlowEnabled(coverLetterDraftItem.value)
    ? t('admin.llm.routing.detailedScoring.enabledShort')
    : t('admin.llm.routing.detailedScoring.disabledShort');
  const highFlowStatus = resolveEffectiveFlowEnabled(coverLetterHighItem.value)
    ? t('admin.llm.routing.detailedScoring.enabledShort')
    : t('admin.llm.routing.detailedScoring.disabledShort');
  const humanizerStatus = resolveEffectiveFlowEnabled(coverLetterHumanizerItem.value)
    ? t('admin.llm.routing.detailedScoring.enabledShort')
    : t('admin.llm.routing.detailedScoring.disabledShort');

  return [
    t('admin.llm.routing.coverLetter.capability.draftFlow', {
      status: draftFlowStatus
    }),
    t('admin.roles.routing.currentModel', {
      model: resolveInheritedModelLabel(currentOverrideModelId(coverLetterDraftItem.value))
    }),
    t('admin.roles.routing.currentReasoningEffort', {
      value: resolveInheritedReasoningEffortLabel(
        currentReasoningEffortOverride(coverLetterDraftItem.value)
      )
    }),
    t('admin.roles.routing.defaultModel', {
      model: resolveModelLabel(coverLetterDraftItem.value?.default?.modelId ?? null)
    }),
    t('admin.roles.routing.defaultReasoningEffort', {
      value: resolveReasoningEffortLabel(coverLetterDraftItem.value?.default?.reasoningEffort)
    }),
    t('admin.llm.routing.coverLetter.capability.highFlow', {
      status: highFlowStatus
    }),
    t('admin.roles.routing.currentModel', {
      model: resolveInheritedModelLabel(currentOverrideModelId(coverLetterHighItem.value))
    }),
    t('admin.roles.routing.currentReasoningEffort', {
      value: resolveInheritedReasoningEffortLabel(
        currentReasoningEffortOverride(coverLetterHighItem.value)
      )
    }),
    t('admin.roles.routing.defaultModel', {
      model: resolveModelLabel(coverLetterHighItem.value?.default?.modelId ?? null)
    }),
    t('admin.roles.routing.defaultReasoningEffort', {
      value: resolveReasoningEffortLabel(coverLetterHighItem.value?.default?.reasoningEffort)
    }),
    t('admin.llm.routing.coverLetter.capability.humanizer', {
      status: humanizerStatus
    }),
    t('admin.roles.routing.currentModel', {
      model: resolveInheritedModelLabel(currentOverrideModelId(coverLetterHumanizerItem.value))
    }),
    t('admin.roles.routing.defaultModel', {
      model: resolveModelLabel(coverLetterHumanizerItem.value?.default?.modelId ?? null)
    })
  ];
});

const detailedScoringCapabilities = computed<string[]>(() => {
  const flowStatus = resolveEffectiveFlowEnabled(detailedScoringItem.value)
    ? t('admin.llm.routing.detailedScoring.enabledShort')
    : t('admin.llm.routing.detailedScoring.disabledShort');

  return [
    t('admin.llm.routing.capability.flowState', {
      status: flowStatus
    }),
    t('admin.roles.routing.currentModel', {
      model: resolveInheritedModelLabel(currentOverrideModelId(detailedScoringItem.value))
    }),
    t('admin.roles.routing.currentRetryModel', {
      model: resolveInheritedModelLabel(currentRetryOverrideModelId(detailedScoringItem.value))
    }),
    t('admin.roles.routing.defaultModel', {
      model: resolveModelLabel(detailedScoringItem.value?.default?.modelId ?? null)
    }),
    t('admin.roles.routing.defaultRetryModel', {
      model: resolveModelLabel(detailedScoringItem.value?.default?.retryModelId ?? null)
    })
  ];
});

const resumeAdaptationRuntimeConfig = computed<ResumeAdaptationRuntimeConfig | null>(() => {
  if (!resumeAdaptationItem.value || !resumeScoringItem.value) {
    return null;
  }

  return {
    adaptationTemperature: resolveEffectiveRuntimeValue(
      resumeAdaptationItem.value,
      assignment => assignment.temperature,
      ADAPTATION_RUNTIME_DEFAULT_TEMPERATURE
    ),
    adaptationMaxTokens: resolveEffectiveRuntimeValue(
      resumeAdaptationItem.value,
      assignment => assignment.maxTokens,
      ADAPTATION_RUNTIME_DEFAULT_MAX_TOKENS
    ),
    adaptationResponseFormat: resolveEffectiveRuntimeValue(
      resumeAdaptationItem.value,
      assignment => assignment.responseFormat,
      ADAPTATION_RUNTIME_DEFAULT_RESPONSE_FORMAT
    ),
    adaptationReasoningEffort: resolveEffectiveRuntimeValue(
      resumeAdaptationItem.value,
      assignment => assignment.reasoningEffort,
      ADAPTATION_RUNTIME_DEFAULT_REASONING_EFFORT
    ),
    scoringTemperature: resolveEffectiveRuntimeValue(
      resumeScoringItem.value,
      assignment => assignment.temperature,
      SCORING_RUNTIME_DEFAULT_TEMPERATURE
    ),
    scoringMaxTokens: resolveEffectiveRuntimeValue(
      resumeScoringItem.value,
      assignment => assignment.maxTokens,
      SCORING_RUNTIME_DEFAULT_MAX_TOKENS
    ),
    scoringResponseFormat: resolveEffectiveRuntimeValue(
      resumeScoringItem.value,
      assignment => assignment.responseFormat,
      SCORING_RUNTIME_DEFAULT_RESPONSE_FORMAT
    )
  };
});

const scenarioCards = computed<RoutingScenarioCardsConfig>(() => {
  const cards: RoutingScenarioCardsConfig = {};

  if (resumeParseItem.value) {
    cards[LLM_SCENARIO_KEY_MAP.RESUME_PARSE] = {
      capabilities: resumeParseCapabilities.value,
      editDisabled: isRoutingDisabled.value
    };
  }

  if (hasAdaptationCard.value) {
    cards[LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION] = {
      capabilities: resumeAdaptationCapabilities.value,
      editDisabled: isRoutingDisabled.value || !canEditAdaptation.value
    };
  }

  if (coverLetterHighItem.value || coverLetterDraftItem.value || coverLetterHumanizerItem.value) {
    cards[LLM_SCENARIO_KEY_MAP.COVER_LETTER_GENERATION] = {
      capabilities: coverLetterCapabilities.value,
      editDisabled: isRoutingDisabled.value
    };
  }

  if (detailedScoringItem.value) {
    cards[LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION_SCORING_DETAIL] = {
      capabilities: detailedScoringCapabilities.value,
      editDisabled: isRoutingDisabled.value
    };
  }

  return cards;
});

const getSavedDraftForScenario = (scenarioKey: EditableScenarioKey): RoutingScenarioDraft => {
  if (scenarioKey === LLM_SCENARIO_KEY_MAP.RESUME_PARSE) {
    return {
      primaryModelId: toSelectModelId(currentOverrideModelId(resumeParseItem.value)),
      secondaryModelId: toSelectModelId(currentRetryOverrideModelId(resumeParseItem.value)),
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
      primaryModelId: toSelectModelId(currentOverrideModelId(resumeAdaptationItem.value)),
      secondaryModelId: toSelectModelId(currentOverrideModelId(resumeScoringItem.value)),
      tertiaryModelId: toSelectModelId(currentRetryOverrideModelId(resumeAdaptationItem.value)),
      reasoningEffort: toSelectReasoningEffort(
        currentReasoningEffortOverride(resumeAdaptationItem.value)
      ),
      strategyKey: toSelectStrategyKey(currentStrategyOverrideKey(resumeAdaptationItem.value)),
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
      primaryModelId: toSelectModelId(currentOverrideModelId(detailedScoringItem.value)),
      secondaryModelId: toSelectModelId(currentRetryOverrideModelId(detailedScoringItem.value)),
      tertiaryModelId: '',
      reasoningEffort: '',
      strategyKey: '',
      flowEnabled: resolveEffectiveFlowEnabled(detailedScoringItem.value),
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
    primaryModelId: toSelectModelId(currentOverrideModelId(coverLetterHighItem.value)),
    secondaryModelId: '',
    tertiaryModelId: '',
    reasoningEffort: '',
    strategyKey: '',
    flowEnabled: true,
    draftModelId: toSelectModelId(currentOverrideModelId(coverLetterDraftItem.value)),
    draftReasoningEffort: toSelectReasoningEffort(
      currentReasoningEffortOverride(coverLetterDraftItem.value)
    ),
    draftFlowEnabled: resolveEffectiveFlowEnabled(coverLetterDraftItem.value),
    highModelId: toSelectModelId(currentOverrideModelId(coverLetterHighItem.value)),
    highReasoningEffort: toSelectReasoningEffort(
      currentReasoningEffortOverride(coverLetterHighItem.value)
    ),
    highFlowEnabled: resolveEffectiveFlowEnabled(coverLetterHighItem.value),
    highHumanizerEnabled: resolveEffectiveFlowEnabled(coverLetterHumanizerItem.value),
    highHumanizerModelId: toSelectModelId(currentOverrideModelId(coverLetterHumanizerItem.value))
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
      modelOptions: modelOptionsWithInherit.value,
      primaryLabel: t('admin.roles.routing.overrideLabel'),
      retryLabel: t('admin.roles.routing.retryOverrideLabel'),
      disabled: isRoutingDisabled.value,
      emptyValue: INHERIT_MODEL_ID,
      disableRetryWhenPrimaryEmpty: true
    };
  }

  if (scenarioKey === LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION) {
    return {
      modelOptions: modelOptionsWithInherit.value,
      strategyOptions: strategyOptionsWithInherit.value,
      reasoningOptions: reasoningOptionsWithInherit.value,
      primaryLabel: t('admin.roles.routing.overrideLabel'),
      scoringLabel: t('admin.roles.routing.baseScoringOverrideLabel'),
      retryLabel: t('admin.roles.routing.retryOverrideLabel'),
      reasoningLabel: t('admin.llm.routing.reasoningEffortLabel'),
      strategyLabel: t('admin.roles.routing.strategyOverrideLabel'),
      disabled: isRoutingDisabled.value,
      emptyValue: INHERIT_MODEL_ID,
      disableTertiaryWhenPrimaryEmpty: true,
      disableStrategyWhenPrimaryEmpty: true,
      disableReasoningWhenPrimaryEmpty: true,
      runtimeConfig: resumeAdaptationRuntimeConfig.value
    };
  }

  if (scenarioKey === LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION_SCORING_DETAIL) {
    return {
      modelOptions: modelOptionsWithInherit.value,
      primaryLabel: t('admin.roles.routing.overrideLabel'),
      retryLabel: t('admin.roles.routing.retryOverrideLabel'),
      disabled: isRoutingDisabled.value,
      emptyValue: INHERIT_MODEL_ID,
      disableRetryWhenPrimaryEmpty: true,
      showFlowToggle: true,
      flowToggleLabel: t('admin.llm.routing.detailedScoring.enabledLabel'),
      flowToggleDescription: t('admin.llm.routing.detailedScoring.enabledDescription')
    };
  }

  return {
    modelOptions: modelOptionsWithInherit.value,
    reasoningOptions: reasoningOptionsWithInherit.value,
    draftFlowLabel: t('admin.llm.routing.coverLetter.flow.draft.label'),
    draftFlowDescription: t('admin.llm.routing.coverLetter.flow.draft.description'),
    highFlowLabel: t('admin.llm.routing.coverLetter.flow.high.label'),
    highFlowDescription: t('admin.llm.routing.coverLetter.flow.high.description'),
    humanizerLabel: t('admin.llm.routing.coverLetter.flow.humanizer.label'),
    humanizerDescription: t('admin.llm.routing.coverLetter.flow.humanizer.description'),
    draftModelLabel: t('admin.roles.routing.overrideLabel'),
    draftReasoningLabel: t('admin.llm.routing.coverLetter.flow.draft.reasoningLabel'),
    highModelLabel: t('admin.roles.routing.overrideLabel'),
    highReasoningLabel: t('admin.llm.routing.coverLetter.flow.high.reasoningLabel'),
    humanizerModelLabel: t('admin.roles.routing.overrideLabel'),
    disabled: isRoutingDisabled.value
  };
};

const { modalScenarioKey, modalDraft, modalCanSave, openScenarioEditor, closeScenarioEditor } =
  useRoutingScenarioEditor({
    getSavedDraft: getSavedDraftForScenario,
    getDescription: getModalDescriptionByScenario,
    getFormProps: getModalFormPropsByScenario,
    isSaving: isRoutingDisabled,
    onSave: () => {
      void saveScenario();
    }
  });

async function saveScenario() {
  const scenarioKey = modalScenarioKey.value;
  if (!scenarioKey || !modalCanSave.value) return;

  try {
    if (scenarioKey === LLM_SCENARIO_KEY_MAP.RESUME_PARSE) {
      const selectedPrimary = fromSelectModelId(modalDraft.value.primaryModelId);
      const selectedRetry = fromSelectModelId(modalDraft.value.secondaryModelId);
      const existingPrimary = currentOverrideModelId(resumeParseItem.value);

      if (selectedPrimary) {
        await upsertRoleOverride(LLM_SCENARIO_KEY_MAP.RESUME_PARSE, props.role, {
          modelId: selectedPrimary,
          retryModelId: selectedRetry || null,
          strategyKey: null
        });
      } else if (existingPrimary) {
        await deleteRoleOverride(LLM_SCENARIO_KEY_MAP.RESUME_PARSE, props.role);
      }
    } else if (scenarioKey === LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION) {
      const selectedPrimary = fromSelectModelId(modalDraft.value.primaryModelId);
      const selectedScoring = fromSelectModelId(modalDraft.value.secondaryModelId);
      const selectedRetry = fromSelectModelId(modalDraft.value.tertiaryModelId);
      const selectedStrategy = fromSelectStrategyKey(modalDraft.value.strategyKey);
      const selectedReasoningEffort = fromSelectReasoningEffort(modalDraft.value.reasoningEffort);

      const existingPrimary = currentOverrideModelId(resumeAdaptationItem.value);
      const existingScoring = currentOverrideModelId(resumeScoringItem.value);

      const updates: Promise<unknown>[] = [];

      if (selectedPrimary) {
        updates.push(
          upsertRoleOverride(LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION, props.role, {
            modelId: selectedPrimary,
            retryModelId: selectedRetry || null,
            reasoningEffort: selectedReasoningEffort,
            strategyKey: selectedStrategy
          })
        );
      } else if (existingPrimary) {
        updates.push(deleteRoleOverride(LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION, props.role));
      }

      if (selectedScoring) {
        updates.push(
          upsertRoleOverride(LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION_SCORING, props.role, {
            modelId: selectedScoring,
            retryModelId: null,
            strategyKey: null
          })
        );
      } else if (existingScoring) {
        updates.push(
          deleteRoleOverride(LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION_SCORING, props.role)
        );
      }

      if (updates.length > 0) {
        await Promise.all(updates);
      }
    } else if (scenarioKey === LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION_SCORING_DETAIL) {
      const scenarioDefaultEnabled = detailedScoringItem.value?.enabled ?? true;
      const currentEnabledOverride = findRoleEnabledOverride(detailedScoringItem.value);

      if (modalDraft.value.flowEnabled === scenarioDefaultEnabled) {
        if (currentEnabledOverride) {
          await deleteRoleEnabledOverride(
            LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION_SCORING_DETAIL,
            props.role
          );
        }
      } else {
        await upsertRoleEnabledOverride(
          LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION_SCORING_DETAIL,
          props.role,
          modalDraft.value.flowEnabled
        );
      }

      const selectedPrimary = fromSelectModelId(modalDraft.value.primaryModelId);
      const selectedRetry = fromSelectModelId(modalDraft.value.secondaryModelId);
      const existingPrimary = currentOverrideModelId(detailedScoringItem.value);

      if (selectedPrimary) {
        await upsertRoleOverride(
          LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION_SCORING_DETAIL,
          props.role,
          {
            modelId: selectedPrimary,
            retryModelId: selectedRetry || null,
            strategyKey: null
          }
        );
      } else if (existingPrimary) {
        await deleteRoleOverride(LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION_SCORING_DETAIL, props.role);
      }
    } else {
      const updates: Promise<unknown>[] = [];

      const draftDefaultEnabled = coverLetterDraftItem.value?.enabled ?? true;
      const draftEnabledOverride = findRoleEnabledOverride(coverLetterDraftItem.value);
      if (modalDraft.value.draftFlowEnabled === draftDefaultEnabled) {
        if (draftEnabledOverride) {
          updates.push(
            deleteRoleEnabledOverride(
              LLM_SCENARIO_KEY_MAP.COVER_LETTER_GENERATION_DRAFT,
              props.role
            )
          );
        }
      } else {
        updates.push(
          upsertRoleEnabledOverride(
            LLM_SCENARIO_KEY_MAP.COVER_LETTER_GENERATION_DRAFT,
            props.role,
            modalDraft.value.draftFlowEnabled
          )
        );
      }

      const highDefaultEnabled = coverLetterHighItem.value?.enabled ?? true;
      const highEnabledOverride = findRoleEnabledOverride(coverLetterHighItem.value);
      if (modalDraft.value.highFlowEnabled === highDefaultEnabled) {
        if (highEnabledOverride) {
          updates.push(
            deleteRoleEnabledOverride(LLM_SCENARIO_KEY_MAP.COVER_LETTER_GENERATION, props.role)
          );
        }
      } else {
        updates.push(
          upsertRoleEnabledOverride(
            LLM_SCENARIO_KEY_MAP.COVER_LETTER_GENERATION,
            props.role,
            modalDraft.value.highFlowEnabled
          )
        );
      }

      const humanizerDefaultEnabled = coverLetterHumanizerItem.value?.enabled ?? false;
      const nextHumanizerEnabled =
        modalDraft.value.highFlowEnabled && modalDraft.value.highHumanizerEnabled;
      const humanizerEnabledOverride = findRoleEnabledOverride(coverLetterHumanizerItem.value);
      if (nextHumanizerEnabled === humanizerDefaultEnabled) {
        if (humanizerEnabledOverride) {
          updates.push(
            deleteRoleEnabledOverride(
              LLM_SCENARIO_KEY_MAP.COVER_LETTER_HUMANIZER_CRITIC,
              props.role
            )
          );
        }
      } else {
        updates.push(
          upsertRoleEnabledOverride(
            LLM_SCENARIO_KEY_MAP.COVER_LETTER_HUMANIZER_CRITIC,
            props.role,
            nextHumanizerEnabled
          )
        );
      }

      const selectedDraftModel = fromSelectModelId(modalDraft.value.draftModelId);
      const selectedDraftReasoningEffort = fromSelectReasoningEffort(
        modalDraft.value.draftReasoningEffort
      );
      const existingDraftModel = currentOverrideModelId(coverLetterDraftItem.value);
      if (selectedDraftModel) {
        updates.push(
          upsertRoleOverride(LLM_SCENARIO_KEY_MAP.COVER_LETTER_GENERATION_DRAFT, props.role, {
            modelId: selectedDraftModel,
            retryModelId: null,
            reasoningEffort: selectedDraftReasoningEffort,
            strategyKey: null
          })
        );
      } else if (existingDraftModel) {
        updates.push(
          deleteRoleOverride(LLM_SCENARIO_KEY_MAP.COVER_LETTER_GENERATION_DRAFT, props.role)
        );
      }

      const selectedHighModel = fromSelectModelId(modalDraft.value.highModelId);
      const selectedHighReasoningEffort = fromSelectReasoningEffort(
        modalDraft.value.highReasoningEffort
      );
      const existingHighModel = currentOverrideModelId(coverLetterHighItem.value);
      if (selectedHighModel) {
        updates.push(
          upsertRoleOverride(LLM_SCENARIO_KEY_MAP.COVER_LETTER_GENERATION, props.role, {
            modelId: selectedHighModel,
            retryModelId: null,
            reasoningEffort: selectedHighReasoningEffort,
            strategyKey: null
          })
        );
      } else if (existingHighModel) {
        updates.push(deleteRoleOverride(LLM_SCENARIO_KEY_MAP.COVER_LETTER_GENERATION, props.role));
      }

      const selectedHumanizerModel = fromSelectModelId(modalDraft.value.highHumanizerModelId);
      const existingHumanizerModel = currentOverrideModelId(coverLetterHumanizerItem.value);
      if (selectedHumanizerModel) {
        updates.push(
          upsertRoleOverride(LLM_SCENARIO_KEY_MAP.COVER_LETTER_HUMANIZER_CRITIC, props.role, {
            modelId: selectedHumanizerModel,
            retryModelId: null,
            strategyKey: null
          })
        );
      } else if (existingHumanizerModel) {
        updates.push(
          deleteRoleOverride(LLM_SCENARIO_KEY_MAP.COVER_LETTER_HUMANIZER_CRITIC, props.role)
        );
      }

      if (updates.length > 0) {
        await Promise.all(updates);
      }
    }

    await fetchRouting();
    closeScenarioEditor({ action: 'submitted' });
  } catch (error) {
    notifyError(error);
  }
}

watch(
  () => props.role,
  () => {
    closeScenarioEditor();
  }
);
</script>

<style lang="scss">
.roles-item-scenarios {
  // Reserved for component-specific styles.
}
</style>
