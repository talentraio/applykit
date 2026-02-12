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
- Prefer minimal, high-impact edits over full rewrites
- Reorder content to improve relevance before rewriting text
- Keep phrasing concise and direct
- Avoid adding decorative language`;

const QUALITY_STRATEGY_INSTRUCTIONS = `Strategy: quality
- Keep ATS keyword alignment while improving readability
- Avoid AI-like cliches (e.g. results-driven, passionate, dynamic)
- Maintain natural variation in bullet phrasing
- Improve summary clarity without changing factual meaning`;

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
