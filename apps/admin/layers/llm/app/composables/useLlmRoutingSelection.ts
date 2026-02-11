import type { LlmScenarioKey } from '@int/schema';

export type UseLlmRoutingSelectionReturn = {
  setPrimarySelection: (scenarioKey: LlmScenarioKey, value: string) => void;
  setSecondarySelection: (scenarioKey: LlmScenarioKey, value: string) => void;
  selectedPrimaryModelId: (scenarioKey: LlmScenarioKey, fallback?: string) => string;
  selectedSecondaryModelId: (scenarioKey: LlmScenarioKey, fallback?: string) => string;
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
  const secondarySelection = reactive<Partial<Record<LlmScenarioKey, string>>>({});

  const setPrimarySelection = (scenarioKey: LlmScenarioKey, value: string) => {
    primarySelection[scenarioKey] = value;
  };

  const setSecondarySelection = (scenarioKey: LlmScenarioKey, value: string) => {
    secondarySelection[scenarioKey] = value;
  };

  const selectedPrimaryModelId = (scenarioKey: LlmScenarioKey, fallback = ''): string => {
    return primarySelection[scenarioKey] ?? fallback;
  };

  const selectedSecondaryModelId = (scenarioKey: LlmScenarioKey, fallback = ''): string => {
    return secondarySelection[scenarioKey] ?? fallback;
  };

  const clearScenarioSelections = (scenarioKey: LlmScenarioKey) => {
    delete primarySelection[scenarioKey];
    delete secondarySelection[scenarioKey];
  };

  const clearAllSelections = () => {
    Object.keys(primarySelection).forEach(key => {
      delete primarySelection[key as LlmScenarioKey];
    });

    Object.keys(secondarySelection).forEach(key => {
      delete secondarySelection[key as LlmScenarioKey];
    });
  };

  return {
    setPrimarySelection,
    setSecondarySelection,
    selectedPrimaryModelId,
    selectedSecondaryModelId,
    clearScenarioSelections,
    clearAllSelections
  };
}
