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
- keep at most 8 evidence items total
- no narrative text, JSON only`;

const MAX_PROMPT_SKILL_GROUPS = 6;
const MAX_PROMPT_SKILLS_PER_GROUP = 8;
const MAX_PROMPT_EXPERIENCE_ITEMS = 4;
const MAX_PROMPT_BULLETS_PER_EXPERIENCE = 4;
const MAX_PROMPT_CERTIFICATIONS = 6;
const MAX_PROMPT_LANGUAGES = 6;
const MAX_PROMPT_TEXT_LENGTH = 280;

const trimPromptText = (
  value: string | undefined | null,
  maxLength = MAX_PROMPT_TEXT_LENGTH
): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.replace(/\s+/g, ' ').trim();
  if (normalized.length === 0) {
    return undefined;
  }

  return normalized.length <= maxLength
    ? normalized
    : `${normalized.slice(0, maxLength).trimEnd()}...`;
};

const toTailoredResumeProjection = (
  resume: ResumeContent
): {
  summary?: string;
  skills: Array<{ type?: string; skills: string[] }>;
  experience: Array<{
    company?: string;
    position?: string;
    startDate: string;
    endDate: string | null;
    description?: string;
    bullets: string[];
    technologies: string[];
  }>;
  certifications: Array<{ name?: string; issuer?: string }>;
  languages: Array<{ language?: string; level?: string }>;
} => {
  return {
    summary: trimPromptText(resume.summary, 400),
    skills: resume.skills.slice(0, MAX_PROMPT_SKILL_GROUPS).map(group => ({
      type: trimPromptText(group.type, 60),
      skills: group.skills
        .slice(0, MAX_PROMPT_SKILLS_PER_GROUP)
        .map(skill => trimPromptText(skill, 40))
        .filter((item): item is string => Boolean(item))
    })),
    experience: resume.experience.slice(0, MAX_PROMPT_EXPERIENCE_ITEMS).map(item => ({
      company: trimPromptText(item.company, 80),
      position: trimPromptText(item.position, 80),
      startDate: item.startDate,
      endDate: item.endDate ?? null,
      description: trimPromptText(item.description, 220),
      bullets: (item.bullets ?? [])
        .slice(0, MAX_PROMPT_BULLETS_PER_EXPERIENCE)
        .map(bullet => trimPromptText(bullet, 180))
        .filter((bullet): bullet is string => Boolean(bullet)),
      technologies: (item.technologies ?? [])
        .slice(0, MAX_PROMPT_SKILLS_PER_GROUP)
        .map(technology => trimPromptText(technology, 40))
        .filter((technology): technology is string => Boolean(technology))
    })),
    certifications: (resume.certifications ?? []).slice(0, MAX_PROMPT_CERTIFICATIONS).map(item => ({
      name: trimPromptText(item.name, 80),
      issuer: trimPromptText(item.issuer, 80)
    })),
    languages: (resume.languages ?? []).slice(0, MAX_PROMPT_LANGUAGES).map(item => ({
      language: trimPromptText(item.language, 40),
      level: trimPromptText(item.level, 40)
    }))
  };
};

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
  const compactTailoredResumeProjection =
    compactForPrompt(toTailoredResumeProjection(tailoredResume)) ??
    toTailoredResumeProjection(tailoredResume);

  return `${sharedPrefix}

${MAP_EVIDENCE_INSTRUCTIONS}

Signals:
${JSON.stringify(compactSignals)}

Tailored resume evidence slice:
${JSON.stringify(compactTailoredResumeProjection)}`;
}
