import type {
  LLMProvider,
  LlmReasoningEffort,
  LlmResponseFormat,
  LlmScenarioKey,
  LlmStrategyKey,
  Role
} from '@int/schema';
import { llmRoutingRepository } from '../../data/repositories';

type ResolvedScenarioPhaseModel = {
  provider: LLMProvider;
  model: string;
  inputPricePer1mUsd: number;
  outputPricePer1mUsd: number;
  cachedInputPricePer1mUsd: number | null;
};

export type ResolvedScenarioModel = {
  source: 'role_override' | 'scenario_default';
  primary: ResolvedScenarioPhaseModel;
  retry: ResolvedScenarioPhaseModel | null;
  temperature: number | null;
  maxTokens: number | null;
  responseFormat: LlmResponseFormat | null;
  reasoningEffort: LlmReasoningEffort | null;
  strategyKey: LlmStrategyKey | null;
};

export async function resolveScenarioModel(
  role: Role,
  scenario: LlmScenarioKey
): Promise<ResolvedScenarioModel | null> {
  const resolved = await llmRoutingRepository.resolveRuntimeModel(role, scenario);
  if (!resolved) {
    return null;
  }

  const primary: ResolvedScenarioPhaseModel = {
    provider: resolved.model.provider,
    model: resolved.model.modelKey,
    inputPricePer1mUsd: resolved.model.inputPricePer1mUsd,
    outputPricePer1mUsd: resolved.model.outputPricePer1mUsd,
    cachedInputPricePer1mUsd: resolved.model.cachedInputPricePer1mUsd ?? null
  };

  const retry: ResolvedScenarioPhaseModel | null = resolved.retryModel
    ? {
        provider: resolved.retryModel.provider,
        model: resolved.retryModel.modelKey,
        inputPricePer1mUsd: resolved.retryModel.inputPricePer1mUsd,
        outputPricePer1mUsd: resolved.retryModel.outputPricePer1mUsd,
        cachedInputPricePer1mUsd: resolved.retryModel.cachedInputPricePer1mUsd ?? null
      }
    : null;

  return {
    source: resolved.source,
    primary,
    retry,
    temperature: resolved.assignment.temperature ?? null,
    maxTokens: resolved.assignment.maxTokens ?? null,
    responseFormat: resolved.assignment.responseFormat ?? null,
    reasoningEffort: resolved.assignment.reasoningEffort ?? null,
    strategyKey: resolved.assignment.strategyKey ?? null
  };
}
