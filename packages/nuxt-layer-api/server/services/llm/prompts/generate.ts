/**
 * Adaptation prompt.
 *
 * Produces tailored resume content only.
 * Match scoring is executed in a dedicated second call.
 */
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

export function createGenerateUserPrompt(sharedContext: string): string {
  const sharedPrefix = createSharedContextPromptPrefix(sharedContext);

  return `${sharedPrefix}

${ADAPTATION_TASK_INSTRUCTIONS}

Return JSON with "content" only.`;
}
