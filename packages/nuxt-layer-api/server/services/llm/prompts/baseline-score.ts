import type { ResumeContent } from '@int/schema';
import { createSharedContextPromptPrefix, GENERATE_SHARED_SYSTEM_PROMPT } from './shared-context';

export const BASELINE_SCORE_SYSTEM_PROMPT = GENERATE_SHARED_SYSTEM_PROMPT;

const BASELINE_SCORE_GUIDELINES = `Task:
Estimate baseline match score before and after resume adaptation.

Output JSON schema:
{
  "matchScoreBefore": number,
  "matchScoreAfter": number
}

Rules:
- Return valid JSON only.
- Scores must be integers from 0 to 100.
- Ensure matchScoreAfter is not lower than matchScoreBefore.
- Do not add explanation fields.`;

export function createBaselineScoreUserPrompt(
  sharedContext: string,
  tailoredResume: ResumeContent
): string {
  return `${createSharedContextPromptPrefix(sharedContext)}

Tailored resume:
${JSON.stringify(tailoredResume)}

${BASELINE_SCORE_GUIDELINES}`;
}
