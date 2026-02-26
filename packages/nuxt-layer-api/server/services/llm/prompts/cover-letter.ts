import type {
  CoverLetterGenerationSettings,
  CoverLetterLengthPreset,
  ResumeContent
} from '@int/schema';
import type { CoverLetterCharacterBufferConfig } from '../../vacancy/cover-letter-character-limits';
import { COVER_LETTER_LENGTH_PRESET_MAP } from '@int/schema';
import { createSoftCharacterTarget } from '../../vacancy/cover-letter-character-limits';
import { getCoverLetterLanguagePack } from './cover-letter/language-packs';
import { getCoverLetterMarketPack } from './cover-letter/market-packs';

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
  retryValidationFeedback?: string | null;
};

type CoverLetterWordLengthPreset = Exclude<
  CoverLetterLengthPreset,
  typeof COVER_LETTER_LENGTH_PRESET_MAP.MIN_CHARS | typeof COVER_LETTER_LENGTH_PRESET_MAP.MAX_CHARS
>;

const HUMAN_STYLE_RULES = [
  'Write as a real person with natural rhythm and varied sentence length.',
  'Avoid generic AI-style fillers and formulaic buzzword-heavy phrasing.',
  'Do not use em dash (—) or en dash (–); use commas or periods instead.',
  'Do not mention AI, language models, prompts, or generation process.'
] as const;

const isWordLengthPreset = (
  preset: CoverLetterLengthPreset
): preset is CoverLetterWordLengthPreset => {
  return (
    preset === COVER_LETTER_LENGTH_PRESET_MAP.SHORT ||
    preset === COVER_LETTER_LENGTH_PRESET_MAP.STANDARD ||
    preset === COVER_LETTER_LENGTH_PRESET_MAP.LONG
  );
};

function createTypeInstruction(settings: CoverLetterGenerationSettings): string {
  const pack = getCoverLetterLanguagePack(settings.language);
  const marketPack = getCoverLetterMarketPack(settings.market);

  if (settings.type === 'letter') {
    return `Output must generate only the core ${pack.label} letter content:
- greeting line
- bodyIntro
- bodyEvidence
- closingCTA
- do not include sender header, date line, formal sign-off phrase, or signature name (these are injected by system post-processing).`;
  }

  return `Output must follow short ${pack.label} application message structure:
- optional greeting (prefer short form if recipient is known)
- concise role-intent opening
- one concrete proof point (impact, scope, metric, or practical result)
- short CTA
- optional short name sign-off only when natural for this language
- no sender header block
- no formal signature block (no "Best regards"/"Venlig hilsen" style closings)
- compact body suitable for application form/email body
- target market context: ${marketPack.label}`;
}

function createToneInstruction(settings: CoverLetterGenerationSettings): string {
  const pack = getCoverLetterLanguagePack(settings.language);
  const tonePack = pack.prompt.toneMap[settings.tone];

  return [
    `Tone target (${settings.tone}):`,
    `- Lexical style: ${tonePack.lexicalStyle}`,
    `- Sentence length: ${tonePack.sentenceLength}`,
    `- Avoid overuse of: ${tonePack.tooMuchSignals.join('; ')}`
  ].join('\n');
}

function createLanguageInstructions(settings: CoverLetterGenerationSettings): string {
  const languagePack = getCoverLetterLanguagePack(settings.language);
  const marketPack = getCoverLetterMarketPack(settings.market);
  const languageTypePack =
    settings.type === 'letter' ? languagePack.prompt.letter : languagePack.prompt.message;
  const marketTypePack =
    settings.type === 'letter' ? marketPack.prompt.letter : marketPack.prompt.message;

  return [
    `Output language locale: ${languagePack.label} (${languagePack.locale}).`,
    `Target market: ${marketPack.label}.`,
    `Language conventions for ${settings.type}:`,
    ...languageTypePack.guidance.map(item => `- ${item}`),
    `Market conventions for ${settings.type}:`,
    ...marketTypePack.guidance.map(item => `- ${item}`),
    `Preferred greeting forms: ${languageTypePack.greetings.join(' | ')}`,
    `Preferred closing forms: ${languageTypePack.closings.join(' | ')}`,
    'Language-specific naturalness rules:',
    ...languagePack.prompt.naturalnessRules.map(item => `- ${item}`),
    'Market-specific naturalness rules:',
    ...marketPack.prompt.naturalnessRules.map(item => `- ${item}`)
  ].join('\n');
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
  if (
    settings.type === 'message' &&
    settings.lengthPreset === COVER_LETTER_LENGTH_PRESET_MAP.MAX_CHARS
  ) {
    if (!settings.recipientName) {
      return 'For strict character-limited message, skip greeting and start with core value immediately.';
    }

    return `For strict character-limited message, avoid formal greeting. Mention recipient name briefly in body if useful: "${settings.recipientName}".`;
  }

  if (!settings.recipientName) {
    return 'If a greeting is needed, use a neutral role-based greeting in selected language.';
  }

  return `Use recipient name in greeting when appropriate: "${settings.recipientName}".`;
}

function createUkrainianGenderInstruction(settings: CoverLetterGenerationSettings): string {
  const pack = getCoverLetterLanguagePack(settings.language);
  if (!pack.requiresGrammaticalGender) {
    return 'Use language-appropriate grammar and agreement.';
  }

  if (settings.language !== 'uk-UA') {
    return `Use ${settings.grammaticalGender} grammatical forms in ${pack.label} where gendered forms are required.`;
  }

  if (settings.grammaticalGender === 'masculine') {
    return 'For Ukrainian output, use masculine grammatical forms where gendered forms are required.';
  }

  if (settings.grammaticalGender === 'feminine') {
    return 'For Ukrainian output, use feminine grammatical forms where gendered forms are required.';
  }

  return 'For Ukrainian output, avoid gender-marked wording when possible; prefer neutral constructions without masculine/feminine markers.';
}

function createWordLengthInstruction(settings: CoverLetterGenerationSettings): string {
  if (!isWordLengthPreset(settings.lengthPreset)) {
    return '';
  }

  const pack = getCoverLetterLanguagePack(settings.language);

  if (settings.type === 'letter') {
    const lengthGuidelines = pack.prompt.lengthGuidelines.letter[settings.lengthPreset];
    return `Length target (${settings.lengthPreset}) for ${pack.label} letter: ${lengthGuidelines.minWords}-${lengthGuidelines.maxWords} words.`;
  }

  const lengthGuidelines = pack.prompt.lengthGuidelines.message[settings.lengthPreset];
  return `Length target (${settings.lengthPreset}) for ${pack.label} message: ${lengthGuidelines.minChars}-${lengthGuidelines.maxChars} characters (plain text, excluding markdown symbols).`;
}

function createCharacterLengthInstruction(
  settings: CoverLetterGenerationSettings,
  options: CoverLetterPromptOptions
): string {
  const softTarget = createSoftCharacterTarget(settings, options.characterBufferConfig);

  if (settings.lengthPreset === COVER_LETTER_LENGTH_PRESET_MAP.MIN_CHARS) {
    return `For message output, target at least the provided minimum character count (plain text, excluding markdown symbols). Minimum characters (hard limit): ${settings.characterLimit ?? 'not provided'}. Soft target for generation: ${softTarget ?? 'not provided'}.`;
  }

  if (settings.lengthPreset === COVER_LETTER_LENGTH_PRESET_MAP.MAX_CHARS) {
    const pack = getCoverLetterLanguagePack(settings.language);
    const compressionOrder = pack.prompt.lengthGuidelines.atsFieldStrategy.compressionOrder;
    return `For message output, do not exceed the provided maximum character count (plain text, excluding markdown symbols). Maximum characters (hard limit): ${settings.characterLimit ?? 'not provided'}. Soft target for generation: ${softTarget ?? 'not provided'}. This is strict: stay at or below hard limit on first draft, prioritize concise plain sentences, no header, no greeting, no sign-off. If needed, compress using this priority: ${compressionOrder.join(' -> ')}.`;
  }

  return createWordLengthInstruction(settings);
}

function createLengthInstruction(
  settings: CoverLetterGenerationSettings,
  options: CoverLetterPromptOptions
): string {
  if (isWordLengthPreset(settings.lengthPreset)) {
    return createWordLengthInstruction(settings);
  }

  return createCharacterLengthInstruction(settings, options);
}

export const COVER_LETTER_SYSTEM_PROMPT = `You are an expert career writing assistant.
Write realistic cover letters and job application messages.
Do not invent facts, employers, dates, achievements, or skills.
Use only information provided in the input context.
When output is requested as JSON, return valid JSON only.`;

export function createCoverLetterUserPrompt(
  input: CoverLetterPromptInput,
  options: CoverLetterPromptOptions = {}
): string {
  const { resumeContent, vacancy, settings } = input;
  const instructions = settings.instructions?.trim() ?? '';
  const retryValidationFeedback = options.retryValidationFeedback?.trim() ?? '';
  const shouldIncludeRetryFeedback = retryValidationFeedback.length > 0;

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
- ${createToneInstruction(settings)}
- ${createLengthInstruction(settings, options)}
- ${createTypeInstruction(settings)}
- ${createRecipientInstruction(settings)}
- ${createSubjectLineInstruction(settings)}
- ${createUkrainianGenderInstruction(settings)}
- ${HUMAN_STYLE_RULES.join('\n- ')}

${createLanguageInstructions(settings)}

${shouldIncludeRetryFeedback ? `Validation feedback from previous attempt:\n${retryValidationFeedback}\n` : ''}

User extra instructions:
${instructions.length > 0 ? instructions : '(none)'}

Vacancy context:
${JSON.stringify(vacancy, null, 2)}

Resume context:
${JSON.stringify(resumeContent, null, 2)}`;
}
