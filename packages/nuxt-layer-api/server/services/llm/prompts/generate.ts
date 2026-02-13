/**
 * Adaptation prompt.
 *
 * Produces tailored resume content only.
 * Match scoring is executed in a dedicated second call.
 */
import type { LlmStrategyKey } from '@int/schema';
import { LLM_STRATEGY_KEY_MAP } from '@int/schema';
import { createSharedContextPromptPrefix, GENERATE_SHARED_SYSTEM_PROMPT } from './shared-context';

export const GENERATE_SYSTEM_PROMPT = GENERATE_SHARED_SYSTEM_PROMPT;

const ADAPTATION_TASK_INSTRUCTIONS = `Task:
Tailor resume content for the target vacancy while preserving factual accuracy.

You may optimize:
- summary wording
- bullet ordering and emphasis
- section ordering
- skills ordering
- project/certification ordering

You must never:
- invent qualifications, achievements, companies, dates, or skills
- alter personal identity/contact fields
- alter employment dates, company names, or education facts
- remove existing skills/entities from source data

Return only valid JSON matching this schema:
{
  "content": {
    // ResumeContent object
  }
}

Rules:
- Keep existing schema shape and data types
- Keep all dates in YYYY-MM format
- Keep URLs valid
- Do not include markdown or explanations`;

const ECONOMY_STRATEGY_INSTRUCTIONS = `Strategy: economy
- Operate in minimal_edit mode
- Keep the original structure and wording unless a clear relevance gain exists
- Prioritize reordering over rewriting
- Rewrite only summary and the most relevant bullets in latest experience entries
- Do not expand section sizes or add extra narrative text
- Keep edits concise, plain, and ATS-friendly`;

const QUALITY_STRATEGY_INSTRUCTIONS = `Strategy: quality
- Allow deeper targeted rewriting for summary and key bullets
- Improve clarity, specificity, and flow while preserving factual accuracy
- Increase keyword alignment naturally (no keyword stuffing)
- Keep bullet language human and concrete; avoid AI-like cliches
- Prefer action + context (+ impact when present in source data)
- Do not invent metrics or achievements`;

const STRATEGY_INSTRUCTIONS: Record<LlmStrategyKey, string> = {
  [LLM_STRATEGY_KEY_MAP.ECONOMY]: ECONOMY_STRATEGY_INSTRUCTIONS,
  [LLM_STRATEGY_KEY_MAP.QUALITY]: QUALITY_STRATEGY_INSTRUCTIONS
};

export function createGenerateUserPrompt(
  sharedContext: string,
  strategyKey: LlmStrategyKey
): string {
  const sharedPrefix = createSharedContextPromptPrefix(sharedContext);
  const strategyInstructions = STRATEGY_INSTRUCTIONS[strategyKey];

  return `${sharedPrefix}

${ADAPTATION_TASK_INSTRUCTIONS}
${strategyInstructions}

Return JSON with "content" only.`;
}
