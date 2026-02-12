import type { ResumeContent } from '@int/schema';
import { createSharedContextPromptPrefix, GENERATE_SHARED_SYSTEM_PROMPT } from './shared-context';

/**
 * Scoring prompt pack.
 *
 * Step 1: Extract vacancy signals
 * Step 2: Map evidence for before/after resumes
 */

export const GENERATE_SCORE_SYSTEM_PROMPT = GENERATE_SHARED_SYSTEM_PROMPT;

const SCORING_SHARED_GUIDELINES = `Scoring protocol:
1) Use only data from shared context and provided JSON fragments.
2) Keep output concise and machine-readable.
3) Do not repeat long narrative text.
4) Prefer short stable identifiers in evidence refs.
5) Keep the same semantic scale for strengths: 0..1.
6) If evidence is uncertain, lower confidence/strength instead of guessing.
7) Return JSON only.
8) Never return partial JSON. If response may be too long, reduce list sizes but always close the JSON object.

Output size control:
- Keep arrays compact.
- Prefer top-ranked signals by relevance.
- Do not include duplicate signals.
- Limit verbosity in every string field.
- Keep signal names short (1-5 words).
- Keep evidence refs short and minimal.

Quality gates:
- Never invent resume facts.
- Never invent vacancy facts.
- Preserve role/domain neutrality (not IT-only).`;

const EXTRACT_SIGNALS_INSTRUCTIONS = `Task:
Extract structured vacancy signals as JSON.

Output JSON schema:
{
  "signals": {
    "coreRequirements": [{ "name": string, "weight": number }],
    "mustHave": [{ "name": string, "weight": number }],
    "niceToHave": [{ "name": string, "weight": number }],
    "responsibilities": [{ "name": string, "weight": number }]
  }
}

Rules:
- weights must be within 0..1
- keep output domain-agnostic (not IT-only)
- keep at most 4 items per signal array
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
      "evidenceRefBefore": string | null,
      "evidenceRefAfter": string | null
    }
  ]
}

Rules:
- strengths must be within 0..1
- evidenceRef values should be short plain-text paths (e.g. "experience[0].bullets[1]")
- keep at most 10 evidence items total
- no narrative text, JSON only`;

const createScoringSharedPrefix = (sharedContext: string): string => {
  return `${createSharedContextPromptPrefix(sharedContext)}

${SCORING_SHARED_GUIDELINES}`;
};

const compactForPrompt = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    const compact = value.map(item => compactForPrompt(item)).filter(item => item !== undefined);

    return compact.length > 0 ? compact : undefined;
  }

  if (value && typeof value === 'object') {
    const compactEntries = Object.entries(value)
      .map(([key, nestedValue]) => [key, compactForPrompt(nestedValue)] as const)
      .filter(([, nestedValue]) => nestedValue !== undefined);

    if (compactEntries.length === 0) {
      return undefined;
    }

    return Object.fromEntries(compactEntries);
  }

  if (value === null || value === '') {
    return undefined;
  }

  return value;
};

const compactSignalsForMapPrompt = (signals: unknown): unknown => {
  if (!signals || typeof signals !== 'object') {
    return signals;
  }

  const typedSignals = signals as {
    coreRequirements?: Array<{ name?: string; weight?: number }>;
    mustHave?: Array<{ name?: string; weight?: number }>;
    niceToHave?: Array<{ name?: string; weight?: number }>;
    responsibilities?: Array<{ name?: string; weight?: number }>;
  };

  const compactSignalItems = (
    items: Array<{ name?: string; weight?: number }> | undefined
  ): Array<{ name: string; weight: number }> => {
    if (!Array.isArray(items)) {
      return [];
    }

    return items
      .map(item => ({
        name: typeof item.name === 'string' ? item.name : '',
        weight: typeof item.weight === 'number' ? item.weight : 0
      }))
      .filter(item => item.name.length > 0);
  };

  return {
    coreRequirements: compactSignalItems(typedSignals.coreRequirements),
    mustHave: compactSignalItems(typedSignals.mustHave),
    niceToHave: compactSignalItems(typedSignals.niceToHave),
    responsibilities: compactSignalItems(typedSignals.responsibilities)
  };
};

export function createExtractSignalsUserPrompt(sharedContext: string): string {
  const sharedPrefix = createScoringSharedPrefix(sharedContext);

  return `${sharedPrefix}

${EXTRACT_SIGNALS_INSTRUCTIONS}`;
}

export function createMapEvidenceUserPrompt(
  sharedContext: string,
  tailoredResume: ResumeContent,
  signals: unknown
): string {
  const sharedPrefix = createScoringSharedPrefix(sharedContext);
  const compactSignals = compactSignalsForMapPrompt(signals);
  const compactTailoredResume = compactForPrompt(tailoredResume) ?? tailoredResume;

  return `${sharedPrefix}

${MAP_EVIDENCE_INSTRUCTIONS}

Signals:
${JSON.stringify(compactSignals)}

Tailored resume:
${JSON.stringify(compactTailoredResume)}`;
}
