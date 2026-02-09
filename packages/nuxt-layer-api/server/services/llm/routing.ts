import type { LLMProvider, LlmResponseFormat, LlmScenarioKey, Role } from '@int/schema';
import { llmRoutingRepository } from '../../data/repositories';

export type ResolvedScenarioModel = {
  source: 'role_override' | 'scenario_default';
  provider: LLMProvider;
  model: string;
  inputPricePer1mUsd: number;
  outputPricePer1mUsd: number;
  cachedInputPricePer1mUsd: number | null;
  temperature: number | null;
  maxTokens: number | null;
  responseFormat: LlmResponseFormat | null;
};

export async function resolveScenarioModel(
  role: Role,
  scenario: LlmScenarioKey
): Promise<ResolvedScenarioModel | null> {
  const resolved = await llmRoutingRepository.resolveRuntimeModel(role, scenario);
  if (!resolved) {
    return null;
  }

  return {
    source: resolved.source,
    provider: resolved.model.provider,
    model: resolved.model.modelKey,
    inputPricePer1mUsd: resolved.model.inputPricePer1mUsd,
    outputPricePer1mUsd: resolved.model.outputPricePer1mUsd,
    cachedInputPricePer1mUsd: resolved.model.cachedInputPricePer1mUsd ?? null,
    temperature: resolved.assignment.temperature ?? null,
    maxTokens: resolved.assignment.maxTokens ?? null,
    responseFormat: resolved.assignment.responseFormat ?? null
  };
}
