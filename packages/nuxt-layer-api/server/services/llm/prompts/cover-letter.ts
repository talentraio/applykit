import type {
  CoverLetterGenerationSettings,
  CoverLetterLanguage,
  CoverLetterLengthPreset,
  CoverLetterTone,
  CoverLetterType,
  ResumeContent
} from '@int/schema';
import type { CoverLetterCharacterBufferConfig } from '../../vacancy/cover-letter-character-limits';
import { createSoftCharacterTarget } from '../../vacancy/cover-letter-character-limits';

type CoverLetterPromptInput = {
  resumeContent: ResumeContent;
  vacancy: {
    company: string;
    jobPosition?: string | null;
    description: string;
  };
  settings: CoverLetterGenerationSettings;
};

type CoverLetterPromptOptions = {
  characterBufferConfig?: CoverLetterCharacterBufferConfig;
};

type LanguagePack = {
  label: string;
  guidance: string[];
};

const LANGUAGE_PACKS: Record<CoverLetterLanguage, LanguagePack> = {
  en: {
    label: 'English',
    guidance: [
      'Use natural, professional language and avoid generic AI-style phrases.',
      'Keep claims factual and grounded in the provided resume data.',
      'Prefer concise, direct wording over inflated corporate language.'
    ]
  },
  'da-DK': {
    label: 'Danish',
    guidance: [
      'Use natural modern Danish that sounds human and specific.',
      'Prefer a concise and personal tone focused on motivation and fit.',
      'Avoid overly formal openings and avoid stiff literal phrasing.'
    ]
  }
};

const TONE_RULES: Record<CoverLetterTone, string> = {
  professional: 'Keep a clear business tone, confident and concrete.',
  friendly: 'Keep a warm, approachable tone while staying professional.',
  enthusiastic: 'Show energy and motivation, but do not sound exaggerated.',
  direct: 'Use short, focused sentences and get to value quickly.'
};

const LENGTH_RULES: Record<CoverLetterLengthPreset, string> = {
  short: 'Aim for a concise output: 2-3 paragraphs, approximately 110-170 words.',
  standard: 'Aim for a balanced output: 3-4 paragraphs, approximately 170-260 words.',
  long: 'Aim for a detailed output: 4-5 paragraphs, approximately 260-360 words.',
  min_chars:
    'For message output, target at least the provided minimum character count (plain text, excluding markdown symbols).',
  max_chars:
    'For message output, do not exceed the provided maximum character count (plain text, excluding markdown symbols).'
};

const TYPE_RULES: Record<CoverLetterType, string> = {
  letter: `Output must follow letter structure:
- greeting line
- body paragraphs
- closing line with candidate name signature`,
  message: `Output must follow message structure:
- no formal letter header
- compact message body suitable for application form/email body
- optional short sign-off is acceptable`
};

export const COVER_LETTER_SYSTEM_PROMPT = `You are an expert career writing assistant.
Write realistic cover letters and job application messages.
Do not invent facts, employers, dates, achievements, or skills.
Use only information provided in the input context.
When output is requested as JSON, return valid JSON only.`;

function getLanguageInstructions(language: CoverLetterLanguage): string {
  const pack = LANGUAGE_PACKS[language];

  return [`Output language: ${pack.label}.`, ...pack.guidance.map(item => `- ${item}`)].join('\n');
}

function createSubjectLineInstruction(settings: CoverLetterGenerationSettings): string {
  if (settings.type !== 'message') {
    return 'Set "subjectLine" to null.';
  }

  if (!settings.includeSubjectLine) {
    return 'Set "subjectLine" to null.';
  }

  return 'Provide a short and natural "subjectLine" (max 90 characters).';
}

function createRecipientInstruction(settings: CoverLetterGenerationSettings): string {
  if (!settings.recipientName) {
    return 'If a greeting is needed, use a neutral role-based greeting in selected language.';
  }

  return `Use recipient name in greeting when appropriate: "${settings.recipientName}".`;
}

function createLengthInstruction(
  settings: CoverLetterGenerationSettings,
  options: CoverLetterPromptOptions
): string {
  const baseRule = LENGTH_RULES[settings.lengthPreset];

  if (settings.lengthPreset === 'min_chars') {
    const softTarget = createSoftCharacterTarget(settings, options.characterBufferConfig);
    return `${baseRule} Minimum characters (hard limit): ${settings.characterLimit ?? 'not provided'}. Soft target for generation: ${softTarget ?? 'not provided'}.`;
  }

  if (settings.lengthPreset === 'max_chars') {
    const softTarget = createSoftCharacterTarget(settings, options.characterBufferConfig);
    return `${baseRule} Maximum characters (hard limit): ${settings.characterLimit ?? 'not provided'}. Soft target for generation: ${softTarget ?? 'not provided'}.`;
  }

  return baseRule;
}

export function createCoverLetterUserPrompt(
  input: CoverLetterPromptInput,
  options: CoverLetterPromptOptions = {}
): string {
  const { resumeContent, vacancy, settings } = input;
  const instructions = settings.instructions?.trim() ?? '';

  return `Task: Generate a tailored ${settings.type} for a job application.

Output JSON schema:
{
  "contentMarkdown": "string",
  "subjectLine": "string | null"
}

Rules:
- Return valid JSON only.
- Keep markdown simple: paragraphs, bullet points, light emphasis only.
- Never include markdown code fences.
- Never add commentary outside JSON.
- ${TONE_RULES[settings.tone]}
- ${createLengthInstruction(settings, options)}
- ${TYPE_RULES[settings.type]}
- ${createRecipientInstruction(settings)}
- ${createSubjectLineInstruction(settings)}

${getLanguageInstructions(settings.language)}

User extra instructions:
${instructions.length > 0 ? instructions : '(none)'}

Vacancy context:
${JSON.stringify(vacancy, null, 2)}

Resume context:
${JSON.stringify(resumeContent, null, 2)}`;
}
