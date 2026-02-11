import type { ResumeContent } from '@int/schema';
import { createSharedContextPromptPrefix, GENERATE_SHARED_SYSTEM_PROMPT } from './shared-context';

/**
 * Scoring prompt pack.
 *
 * Step 1: Extract vacancy signals
 * Step 2: Map evidence for before/after resumes
 */

export const GENERATE_SCORE_SYSTEM_PROMPT = GENERATE_SHARED_SYSTEM_PROMPT;

const EXTRACT_SIGNALS_INSTRUCTIONS = `Task:
Extract structured vacancy signals as JSON.

Output JSON schema:
{
  "signals": {
    "jobFamily": string,
    "seniority": string | null,
    "coreRequirements": [{ "name": string, "weight": number, "confidence": number }],
    "mustHave": [{ "name": string, "weight": number, "confidence": number }],
    "niceToHave": [{ "name": string, "weight": number, "confidence": number }],
    "responsibilities": [{ "name": string, "weight": number, "confidence": number }],
    "domainTerms": string[],
    "constraints": string[]
  }
}

Rules:
- weights and confidence must be within 0..1
- keep output domain-agnostic (not IT-only)
- return valid JSON only`;

const MAP_EVIDENCE_INSTRUCTIONS = `Task:
Map vacancy signals to resume evidence for both original and tailored resume.

Output JSON schema:
{
  "evidence": [
    {
      "signalType": "core" | "mustHave" | "niceToHave" | "responsibility",
      "signalName": string,
      "strengthBefore": number,
      "strengthAfter": number,
      "presentBefore": boolean,
      "presentAfter": boolean,
      "evidenceRefsBefore": string[],
      "evidenceRefsAfter": string[]
    }
  ]
}

Rules:
- strengths must be within 0..1
- evidenceRefs should reference sections or bullets in plain text paths
- no narrative text, JSON only`;

export function createExtractSignalsUserPrompt(sharedContext: string): string {
  const sharedPrefix = createSharedContextPromptPrefix(sharedContext);

  return `${sharedPrefix}

${EXTRACT_SIGNALS_INSTRUCTIONS}`;
}

export function createMapEvidenceUserPrompt(
  sharedContext: string,
  tailoredResume: ResumeContent,
  signals: unknown
): string {
  const sharedPrefix = createSharedContextPromptPrefix(sharedContext);

  return `${sharedPrefix}

${MAP_EVIDENCE_INSTRUCTIONS}

Signals:
${JSON.stringify(signals, null, 2)}

Tailored resume:
${JSON.stringify(tailoredResume, null, 2)}`;
}
