import type { CoverLetterGenerationSettings } from '@int/schema';

type CoverLetterCriticInput = {
  settings: Pick<
    CoverLetterGenerationSettings,
    'language' | 'market' | 'type' | 'tone' | 'lengthPreset' | 'characterLimit'
  >;
  contentMarkdown: string;
  subjectLine: string | null;
};

type CoverLetterRewriteInput = CoverLetterCriticInput & {
  issues: string[];
  targetedFixes: string[];
};

export const createCoverLetterCriticPrompt = (input: CoverLetterCriticInput): string => {
  return `Task: Evaluate quality and human-likeness of a generated job application text.

Return valid JSON only:
{
  "naturalnessScore": number, // 0..100 (higher is better)
  "aiPatternRiskScore": number, // 0..100 (higher means more AI-like)
  "specificityScore": number, // 0..100 (higher means more concrete evidence)
  "localeFitScore": number, // 0..100 (higher means better language/market fit)
  "rewriteRecommended": boolean,
  "issues": string[],
  "targetedFixes": string[]
}

Rules:
- Be strict and practical.
- Focus on natural human phrasing, locale fit, and concrete value.
- Flag generic template language and AI-like artifacts.
- Flag incomplete or cut-off endings.
- Keep issues/fixes short and actionable.
- Do not include markdown or explanations outside JSON.

Context:
- Locale: ${input.settings.language}
- Market: ${input.settings.market}
- Type: ${input.settings.type}
- Tone: ${input.settings.tone}
- Length preset: ${input.settings.lengthPreset}
- Character limit: ${input.settings.characterLimit ?? 'none'}

Subject line:
${input.subjectLine ?? '(none)'}

Content:
${input.contentMarkdown}`;
};

export const createCoverLetterRewritePrompt = (input: CoverLetterRewriteInput): string => {
  const fixesSection =
    input.targetedFixes.length > 0
      ? input.targetedFixes.map((fix, index) => `${index + 1}. ${fix}`).join('\n')
      : '(none)';
  const issuesSection =
    input.issues.length > 0
      ? input.issues.map((fix, index) => `${index + 1}. ${fix}`).join('\n')
      : '(none)';

  return `Task: Rewrite the provided cover-letter content to improve human-likeness and quality while preserving facts.

Return valid JSON only:
{
  "contentMarkdown": "string",
  "subjectLine": "string | null"
}

Hard constraints:
- Keep original meaning and factual claims.
- Do not add new facts, employers, dates, tools, achievements, or contacts.
- Keep output locale as ${input.settings.language} and market style ${input.settings.market}.
- Keep output type as ${input.settings.type}.
- Keep tone as ${input.settings.tone}.
- Keep length preset as ${input.settings.lengthPreset}.
- Respect character limit ${input.settings.characterLimit ?? 'none'} when applicable.
- Do not use em dash (—) or en dash (–).
- Ensure final sentence is complete (no cut-off ending).
- Keep markdown simple (paragraphs/lists/light emphasis only), no code fences.

Quality issues detected:
${issuesSection}

Targeted fixes to apply:
${fixesSection}

Current subject line:
${input.subjectLine ?? '(none)'}

Current content:
${input.contentMarkdown}`;
};
