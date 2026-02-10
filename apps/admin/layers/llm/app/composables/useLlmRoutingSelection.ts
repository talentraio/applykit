import type { LlmScenarioKey } from '@int/schema';

export type UseLlmRoutingSelectionReturn = {
  setPrimarySelection: (scenarioKey: LlmScenarioKey, value: string) => void;
  setRetrySelection: (scenarioKey: LlmScenarioKey, value: string) => void;
  selectedPrimaryModelId: (scenarioKey: LlmScenarioKey, fallback?: string) => string;
  selectedRetryModelId: (scenarioKey: LlmScenarioKey, fallback?: string) => string;
  clearScenarioSelections: (scenarioKey: LlmScenarioKey) => void;
  clearAllSelections: () => void;
};

/**
 * Shared selection state for LLM routing cards.
 *
 * Keeps temporary primary/retry model choices keyed by scenario.
 * If no temporary choice exists, falls back to the provided saved value.
 */
export function useLlmRoutingSelection(): UseLlmRoutingSelectionReturn {
  const primarySelection = reactive<Partial<Record<LlmScenarioKey, string>>>({});
  const retrySelection = reactive<Partial<Record<LlmScenarioKey, string>>>({});

  const setPrimarySelection = (scenarioKey: LlmScenarioKey, value: string) => {
    primarySelection[scenarioKey] = value;
  };

  const setRetrySelection = (scenarioKey: LlmScenarioKey, value: string) => {
    retrySelection[scenarioKey] = value;
  };

  const selectedPrimaryModelId = (scenarioKey: LlmScenarioKey, fallback = ''): string => {
    return primarySelection[scenarioKey] ?? fallback;
  };

  const selectedRetryModelId = (scenarioKey: LlmScenarioKey, fallback = ''): string => {
    return retrySelection[scenarioKey] ?? fallback;
  };

  const clearScenarioSelections = (scenarioKey: LlmScenarioKey) => {
    delete primarySelection[scenarioKey];
    delete retrySelection[scenarioKey];
  };

  const clearAllSelections = () => {
    Object.keys(primarySelection).forEach(key => {
      delete primarySelection[key as LlmScenarioKey];
    });

    Object.keys(retrySelection).forEach(key => {
      delete retrySelection[key as LlmScenarioKey];
    });
  };

  return {
    setPrimarySelection,
    setRetrySelection,
    selectedPrimaryModelId,
    selectedRetryModelId,
    clearScenarioSelections,
    clearAllSelections
  };
}
