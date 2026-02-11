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

  <LlmRoutingScenariosEditModal
    v-model:open="modalOpen"
    v-model:draft="modalDraft"
    :title="modalTitle"
    :description="modalDescription"
    :form-component="activeFormComponent"
    :form-props="activeFormProps"
    :loading="isRoutingDisabled"
    :can-save="modalCanSave"
    @cancel="closeScenarioEditor"
    @save="saveScenario"
  />
</template>

<script setup lang="ts">
import type {
  EditableScenarioKey,
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

type ApiErrorWithMessage = {
  data?: {
    message?: string;
  };
};

const INHERIT_MODEL_ID = '__inherit__';
const INHERIT_STRATEGY_KEY = '__inherit_strategy__';

const {
  items: routingItems,
  loading: routingLoading,
  saving: routingSaving,
  fetchAll: fetchRouting,
  upsertRoleOverride,
  deleteRoleOverride
} = useAdminLlmRouting();

const { items: llmModels, activeItems: activeModels, fetchAll: fetchModels } = useAdminLlmModels();

const { t } = useI18n();
const toast = useToast();

const notifyError = (error: unknown) => {
  if (!import.meta.client) return;

  const apiError = error as ApiErrorWithMessage;
  const description =
    typeof apiError?.data?.message === 'string' && apiError.data.message.length > 0
      ? apiError.data.message
      : error instanceof Error && error.message.length > 0
        ? error.message
        : undefined;

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

const coverLetterItem = computed(() => {
  return routingByScenario.value.get(LLM_SCENARIO_KEY_MAP.COVER_LETTER_GENERATION) ?? null;
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

const findRoleOverride = (item: LlmRoutingItem | null) => {
  if (!item) return null;
  return item.overrides.find(entry => entry.role === props.role) ?? null;
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
    })
  ];
});

const coverLetterCapabilities = computed<string[]>(() => {
  return [
    t('admin.roles.routing.currentModel', {
      model: resolveInheritedModelLabel(currentOverrideModelId(coverLetterItem.value))
    }),
    t('admin.roles.routing.defaultModel', {
      model: resolveModelLabel(coverLetterItem.value?.default?.modelId ?? null)
    })
  ];
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

  if (coverLetterItem.value) {
    cards[LLM_SCENARIO_KEY_MAP.COVER_LETTER_GENERATION] = {
      capabilities: coverLetterCapabilities.value,
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
      strategyKey: ''
    };
  }

  if (scenarioKey === LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION) {
    return {
      primaryModelId: toSelectModelId(currentOverrideModelId(resumeAdaptationItem.value)),
      secondaryModelId: toSelectModelId(currentOverrideModelId(resumeScoringItem.value)),
      tertiaryModelId: toSelectModelId(currentRetryOverrideModelId(resumeAdaptationItem.value)),
      strategyKey: toSelectStrategyKey(currentStrategyOverrideKey(resumeAdaptationItem.value))
    };
  }

  return {
    primaryModelId: toSelectModelId(currentOverrideModelId(coverLetterItem.value)),
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
      primaryLabel: t('admin.roles.routing.overrideLabel'),
      scoringLabel: t('admin.roles.routing.scoringOverrideLabel'),
      retryLabel: t('admin.roles.routing.retryOverrideLabel'),
      strategyLabel: t('admin.roles.routing.strategyOverrideLabel'),
      disabled: isRoutingDisabled.value,
      emptyValue: INHERIT_MODEL_ID,
      disableTertiaryWhenPrimaryEmpty: true,
      disableStrategyWhenPrimaryEmpty: true
    };
  }

  return {
    modelOptions: modelOptionsWithInherit.value,
    primaryLabel: t('admin.roles.routing.overrideLabel'),
    disabled: isRoutingDisabled.value
  };
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
  getFormProps: getModalFormPropsByScenario
});

const saveScenario = async () => {
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

      const existingPrimary = currentOverrideModelId(resumeAdaptationItem.value);
      const existingScoring = currentOverrideModelId(resumeScoringItem.value);

      const updates: Promise<unknown>[] = [];

      if (selectedPrimary) {
        updates.push(
          upsertRoleOverride(LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION, props.role, {
            modelId: selectedPrimary,
            retryModelId: selectedRetry || null,
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
    } else {
      const selectedPrimary = fromSelectModelId(modalDraft.value.primaryModelId);
      const existingPrimary = currentOverrideModelId(coverLetterItem.value);

      if (selectedPrimary) {
        await upsertRoleOverride(LLM_SCENARIO_KEY_MAP.COVER_LETTER_GENERATION, props.role, {
          modelId: selectedPrimary,
          retryModelId: null,
          strategyKey: null
        });
      } else if (existingPrimary) {
        await deleteRoleOverride(LLM_SCENARIO_KEY_MAP.COVER_LETTER_GENERATION, props.role);
      }
    }

    await fetchRouting();
    closeScenarioEditor();
  } catch (error) {
    notifyError(error);
  }
};

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
