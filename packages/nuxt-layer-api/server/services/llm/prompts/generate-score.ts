import type { ResumeContent } from '@int/schema';
import { createSharedContextPromptPrefix, GENERATE_SHARED_SYSTEM_PROMPT } from './shared-context';

/**
 * Scoring prompt.
 *
 * Calculates before/after fit scores for resume adaptation.
 */

export const GENERATE_SCORE_SYSTEM_PROMPT = GENERATE_SHARED_SYSTEM_PROMPT;

const SCORING_TASK_INSTRUCTIONS = `Task:
Evaluate how well resume versions match vacancy requirements.

Output must be valid JSON only:
{
  "matchScoreBefore": number,
  "matchScoreAfter": number
}

Scoring constraints:
- both scores are integers in range 0..100
- scoreAfter must be greater than or equal to scoreBefore
- be realistic, avoid inflated scores
- base score uses original resume fit
- after score uses tailored resume fit`;

export function createGenerateScoreUserPrompt(
  sharedContext: string,
  tailoredResume: ResumeContent
): string {
  const sharedPrefix = createSharedContextPromptPrefix(sharedContext);

  return `${sharedPrefix}

${SCORING_TASK_INSTRUCTIONS}

Tailored resume:
${JSON.stringify(tailoredResume, null, 2)}

Return JSON with matchScoreBefore and matchScoreAfter only.`;
}
