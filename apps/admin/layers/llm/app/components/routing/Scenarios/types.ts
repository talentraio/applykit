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
  reasoningEffort: string;
  strategyKey: string;
  flowEnabled: boolean;
  draftModelId: string;
  draftReasoningEffort: string;
  draftFlowEnabled: boolean;
  highModelId: string;
  highReasoningEffort: string;
  highFlowEnabled: boolean;
  highHumanizerEnabled: boolean;
  highHumanizerModelId: string;
};

export type ResumeAdaptationRuntimeConfig = {
  adaptationTemperature: string;
  adaptationMaxTokens: string;
  adaptationResponseFormat: string;
  adaptationReasoningEffort: string;
  scoringTemperature: string;
  scoringMaxTokens: string;
  scoringResponseFormat: string;
};

export const createEmptyRoutingScenarioDraft = (): RoutingScenarioDraft => ({
  primaryModelId: '',
  secondaryModelId: '',
  tertiaryModelId: '',
  reasoningEffort: '',
  strategyKey: '',
  flowEnabled: true,
  draftModelId: '',
  draftReasoningEffort: '',
  draftFlowEnabled: true,
  highModelId: '',
  highReasoningEffort: '',
  highFlowEnabled: true,
  highHumanizerEnabled: false,
  highHumanizerModelId: ''
});

export const cloneRoutingScenarioDraft = (draft: RoutingScenarioDraft): RoutingScenarioDraft => ({
  primaryModelId: draft.primaryModelId,
  secondaryModelId: draft.secondaryModelId,
  tertiaryModelId: draft.tertiaryModelId,
  reasoningEffort: draft.reasoningEffort,
  strategyKey: draft.strategyKey,
  flowEnabled: draft.flowEnabled,
  draftModelId: draft.draftModelId,
  draftReasoningEffort: draft.draftReasoningEffort,
  draftFlowEnabled: draft.draftFlowEnabled,
  highModelId: draft.highModelId,
  highReasoningEffort: draft.highReasoningEffort,
  highFlowEnabled: draft.highFlowEnabled,
  highHumanizerEnabled: draft.highHumanizerEnabled,
  highHumanizerModelId: draft.highHumanizerModelId
});
