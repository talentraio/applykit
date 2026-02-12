import type { LLM_SCENARIO_KEY_MAP } from '@int/schema';

export type RoutingSelectOption = {
  label: string;
  value: string;
};

export type EditableScenarioKey =
  | typeof LLM_SCENARIO_KEY_MAP.RESUME_PARSE
  | typeof LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION
  | typeof LLM_SCENARIO_KEY_MAP.RESUME_ADAPTATION_SCORING_DETAIL
  | typeof LLM_SCENARIO_KEY_MAP.COVER_LETTER_GENERATION;

export type RoutingScenarioCardConfig = {
  description?: string;
  capabilities?: string[];
  editDisabled?: boolean;
};

export type RoutingScenarioCardsConfig = Partial<
  Record<EditableScenarioKey, RoutingScenarioCardConfig>
>;

export type RoutingScenarioDraft = {
  primaryModelId: string;
  secondaryModelId: string;
  tertiaryModelId: string;
  strategyKey: string;
};

export type ResumeAdaptationRuntimeConfig = {
  adaptationTemperature: string;
  adaptationMaxTokens: string;
  adaptationResponseFormat: string;
  scoringTemperature: string;
  scoringMaxTokens: string;
  scoringResponseFormat: string;
};

export const createEmptyRoutingScenarioDraft = (): RoutingScenarioDraft => ({
  primaryModelId: '',
  secondaryModelId: '',
  tertiaryModelId: '',
  strategyKey: ''
});

export const cloneRoutingScenarioDraft = (draft: RoutingScenarioDraft): RoutingScenarioDraft => ({
  primaryModelId: draft.primaryModelId,
  secondaryModelId: draft.secondaryModelId,
  tertiaryModelId: draft.tertiaryModelId,
  strategyKey: draft.strategyKey
});
