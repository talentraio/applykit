import type {
  CoverLetterGenerationSettings,
  CoverLetterLlmResponse,
  LLMProvider,
  ProviderType,
  ResumeContent,
  Role
} from '@int/schema';
import type { CoverLetterCharacterBufferConfig } from '../vacancy/cover-letter-character-limits';
import type { CoverLetterHumanizerConfig } from '../vacancy/cover-letter-humanizer';
import {
  COVER_LETTER_LENGTH_PRESET_MAP,
  CoverLetterLlmResponseSchema,
  LLM_SCENARIO_KEY_MAP,
  USER_ROLE_MAP
} from '@int/schema';
import { z } from 'zod';
import {
  formatCoverLetterCurrentDate,
  getCoverLetterLetterClosing
} from '../vacancy/cover-letter-locale-presentation';
import { callLLM, LLMError } from './index';
import { COVER_LETTER_SYSTEM_PROMPT, createCoverLetterUserPrompt } from './prompts/cover-letter';
import {
  createCoverLetterCriticPrompt,
  createCoverLetterRewritePrompt
} from './prompts/cover-letter/critic';
import { getCoverLetterLanguagePack } from './prompts/cover-letter/language-packs';

const NON_RECOVERABLE_LLM_ERROR_CODES = new Set([
  'AUTH_ERROR',
  'NO_PLATFORM_KEY',
  'PLATFORM_DISABLED',
  'ROLE_BUDGET_DISABLED',
  'DAILY_BUDGET_EXCEEDED',
  'WEEKLY_BUDGET_EXCEEDED',
  'MONTHLY_BUDGET_EXCEEDED',
  'GLOBAL_BUDGET_EXCEEDED',
  'RATE_LIMIT',
  'QUOTA_EXCEEDED'
]);

const DEFAULT_MAX_RETRIES = 1;

type UsageBreakdown = {
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
};

type UsageAccumulator = {
  cost: number;
  tokensUsed: number;
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
  provider: LLMProvider | null;
  providerType: ProviderType | null;
  model: string | null;
};

const AI_DISCLOSURE_PATTERNS = [/\bas an ai\b/i, /\blanguage model\b/i, /\bchatgpt\b/i] as const;
const LONG_DASH_PATTERN = /[—–]/;
const URL_OR_CONTACT_PATTERN =
  /\bhttps?:\/\/|\bwww\.|@|linkedin\.com|github\.com|\+?\d[\d()\s-]{6,}/i;
const DATE_LABEL_PREFIX_PATTERN = /^(?:date|dato|дата)\s*[:\-]\s*/iu;
const DATE_LINE_CANDIDATE_PATTERN =
  /^(?:\d{1,2}[./-]\d{1,2}[./-]\d{2,4}|\d{4}-\d{2}-\d{2}|\d{1,2}\.?\s+\p{L}+\.?\s+\d{4}(?:\s*р\.?)?|\p{L}+\.?\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4})[,.]?$/iu;

type CoverLetterValidationDetails = {
  issues: string[];
  retryValidationFeedback: string;
};

const CoverLetterQualityEvaluationSchema = z.object({
  naturalnessScore: z.number().min(0).max(100),
  aiPatternRiskScore: z.number().min(0).max(100),
  specificityScore: z.number().min(0).max(100),
  localeFitScore: z.number().min(0).max(100),
  rewriteRecommended: z.boolean(),
  issues: z.array(z.string()).default([]),
  targetedFixes: z.array(z.string()).default([])
});

type CoverLetterQualityEvaluation = z.infer<typeof CoverLetterQualityEvaluationSchema>;

export type CoverLetterUsage = {
  cost: number;
  tokensUsed: number;
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
  provider: LLMProvider;
  providerType: ProviderType;
  model: string;
  attemptsUsed: number;
};

export type GenerateCoverLetterOptions = {
  userId?: string;
  role?: Role;
  provider?: LLMProvider;
  maxRetries?: number;
  characterBufferConfig?: CoverLetterCharacterBufferConfig;
  humanizerConfig?: CoverLetterHumanizerConfig;
};

export type GenerateCoverLetterResult = {
  contentMarkdown: string;
  subjectLine: string | null;
  usage: CoverLetterUsage;
};

export class CoverLetterGenerationError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'INVALID_JSON'
      | 'VALIDATION_FAILED'
      | 'MAX_RETRIES_EXCEEDED'
      | 'LLM_ERROR',
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'CoverLetterGenerationError';
  }
}

type GenerationInput = {
  resumeContent: ResumeContent;
  vacancy: {
    company: string;
    jobPosition?: string | null;
    description: string;
  };
  settings: CoverLetterGenerationSettings;
};

function toRole(role?: Role): Role {
  return role ?? USER_ROLE_MAP.PUBLIC;
}

function extractJSON(content: string): string {
  const codeBlockMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
  if (codeBlockMatch && codeBlockMatch[1]) {
    return codeBlockMatch[1].trim();
  }

  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return jsonMatch[0].trim();
  }

  return content.trim();
}

function parseCoverLetterResponse(content: string): CoverLetterLlmResponse {
  const jsonString = extractJSON(content);

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch (error) {
    throw new CoverLetterGenerationError(
      `Failed to parse cover letter JSON: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'INVALID_JSON',
      { content }
    );
  }

  const validation = CoverLetterLlmResponseSchema.safeParse(parsed);
  if (!validation.success) {
    throw new CoverLetterGenerationError(
      `Cover letter response validation failed: ${validation.error.message}`,
      'VALIDATION_FAILED',
      validation.error.issues
    );
  }

  return {
    contentMarkdown: validation.data.contentMarkdown,
    subjectLine: validation.data.subjectLine ?? null
  };
}

function parseCoverLetterQualityResponse(content: string): CoverLetterQualityEvaluation {
  const jsonString = extractJSON(content);

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch (error) {
    throw new CoverLetterGenerationError(
      `Failed to parse cover-letter quality JSON: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'INVALID_JSON',
      { content }
    );
  }

  const validation = CoverLetterQualityEvaluationSchema.safeParse(parsed);
  if (!validation.success) {
    throw new CoverLetterGenerationError(
      `Cover-letter quality response validation failed: ${validation.error.message}`,
      'VALIDATION_FAILED',
      validation.error.issues
    );
  }

  return validation.data;
}

function logHumanizer(
  config: CoverLetterHumanizerConfig | undefined,
  message: string,
  payload?: Record<string, unknown>
): void {
  if (!config?.debugLogs) {
    return;
  }

  if (payload) {
    console.warn(`[cover-letter-humanizer] ${message}`, payload);
    return;
  }

  console.warn(`[cover-letter-humanizer] ${message}`);
}

function markdownToPlainText(markdown: string): string {
  const withoutCodeBlocks = markdown.replace(/```[\s\S]*?```/g, ' ');
  const withoutInlineCode = withoutCodeBlocks.replace(/`([^`]+)`/g, '$1');
  const withoutLinks = withoutInlineCode.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1');
  const withoutEmphasis = withoutLinks.replace(/[*_~>#]/g, ' ');
  return withoutEmphasis.replace(/\s+/g, ' ').trim();
}

function getCharacterCount(contentMarkdown: string): number {
  return markdownToPlainText(contentMarkdown).length;
}

function shouldRunSemanticCompression(
  settings: CoverLetterGenerationSettings,
  contentMarkdown: string
): boolean {
  if (
    settings.type !== 'message' ||
    settings.lengthPreset !== COVER_LETTER_LENGTH_PRESET_MAP.MAX_CHARS ||
    settings.characterLimit === null
  ) {
    return false;
  }

  return getCharacterCount(contentMarkdown) > settings.characterLimit;
}

function createCompressionPrompt(input: GenerationInput, contentMarkdown: string): string {
  const characterLimit = input.settings.characterLimit;
  const hardLimit = characterLimit ?? 0;
  const currentLength = getCharacterCount(contentMarkdown);

  return `Task: Rewrite the provided application message so it stays within a strict character limit.

Output JSON schema:
{
  "contentMarkdown": "string",
  "subjectLine": "string | null"
}

Rules:
- Language must stay ${input.settings.language}.
- Keep core meaning and factual claims from original message.
- Do not add new facts, companies, dates, tools, or achievements.
- Keep natural human wording, concise and specific.
- Do not use em dash (—) or en dash (–).
- Keep message format (no sender header, no formal sign-off).
- Hard character limit (plain text): ${hardLimit}.
- Current character count (plain text): ${currentLength}.
- Ensure the final sentence is complete (no cut-off ending).
- Set "subjectLine" to null.
- Return valid JSON only.

Original message:
${contentMarkdown}`;
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

const TRAILING_CONNECTOR_WORDS = new Set([
  // English
  'and',
  'or',
  'to',
  'with',
  'for',
  'of',
  'in',
  'on',
  'at',
  'the',
  'a',
  'an',
  // Danish
  'og',
  'eller',
  'med',
  'for',
  'af',
  'i',
  'på',
  'til',
  'hos',
  'at',
  'en',
  'et'
]);

function trimTrailingConnectorWords(value: string): string {
  const words = normalizeWhitespace(value).split(' ');
  while (words.length > 1) {
    const lastWord = words[words.length - 1];
    if (!lastWord) {
      words.pop();
      continue;
    }

    const normalizedLastWord = lastWord.toLowerCase().replace(/[.,!?;:]+$/g, '');
    if (!TRAILING_CONNECTOR_WORDS.has(normalizedLastWord)) {
      break;
    }

    words.pop();
  }

  return words.join(' ').trim();
}

function ensureSentenceEnding(value: string, limit: number): string {
  const normalized = normalizeWhitespace(value);
  if (normalized.length === 0) {
    return normalized;
  }

  if (/[.!?]$/.test(normalized)) {
    return normalized;
  }

  if (normalized.length < limit) {
    return `${normalized}.`;
  }

  if (limit <= 1) {
    return '.';
  }

  return `${normalized.slice(0, limit - 1).trim()}.`;
}

function splitIntoSentences(value: string): string[] {
  return (
    value
      .match(/[^.!?]+[.!?]+|[^.!?]+$/g)
      ?.map(sentence => normalizeWhitespace(sentence))
      .filter(sentence => sentence.length > 0) ?? []
  );
}

function compressPlainTextToCharacterLimit(value: string, limit: number): string {
  const normalized = normalizeWhitespace(value);
  if (normalized.length <= limit) {
    return normalized;
  }

  const sentences = splitIntoSentences(normalized);
  let sentenceBasedResult = '';

  for (const sentence of sentences) {
    const next = sentenceBasedResult.length > 0 ? `${sentenceBasedResult} ${sentence}` : sentence;
    if (next.length > limit) {
      break;
    }

    sentenceBasedResult = next;
  }

  if (sentenceBasedResult.length > 0) {
    const trimmed = trimTrailingConnectorWords(sentenceBasedResult);
    return ensureSentenceEnding(trimmed, limit);
  }

  const words = normalized.split(' ');
  let wordBasedResult = '';

  for (const word of words) {
    const next = wordBasedResult.length > 0 ? `${wordBasedResult} ${word}` : word;
    if (next.length > limit) {
      break;
    }

    wordBasedResult = next;
  }

  const safeWordBased = trimTrailingConnectorWords(wordBasedResult);
  if (safeWordBased.length > 0) {
    return ensureSentenceEnding(safeWordBased, limit);
  }

  const hardTrimmed = normalized.slice(0, limit).trim();
  return ensureSentenceEnding(hardTrimmed, limit);
}

function applyMaxCharacterLimitFallback(
  settings: CoverLetterGenerationSettings,
  parsed: CoverLetterLlmResponse
): CoverLetterLlmResponse {
  if (
    settings.type !== 'message' ||
    settings.lengthPreset !== COVER_LETTER_LENGTH_PRESET_MAP.MAX_CHARS ||
    settings.characterLimit === null
  ) {
    return parsed;
  }

  const limit = settings.characterLimit;
  if (getCharacterCount(parsed.contentMarkdown) <= limit) {
    return parsed;
  }

  const plainText = markdownToPlainText(parsed.contentMarkdown);
  const truncatedPlainText = compressPlainTextToCharacterLimit(plainText, limit);

  return {
    contentMarkdown: truncatedPlainText,
    subjectLine: parsed.subjectLine
  };
}

function normalizeLine(line: string): string {
  return line
    .replace(/^\s*[-*+]\s+/, '')
    .replace(/^\s*\d+\.\s+/, '')
    .replace(/[*_`>#]/g, '')
    .trim();
}

function toNonEmptyLines(contentMarkdown: string): string[] {
  return contentMarkdown
    .split(/\r?\n/g)
    .map(normalizeLine)
    .filter(line => line.length > 0);
}

function toNonEmptyRawLines(contentMarkdown: string): string[] {
  return contentMarkdown
    .split(/\r?\n/g)
    .map(line => line.trim())
    .filter(line => line.length > 0);
}

function formatValidationFeedback(issues: string[]): string {
  return issues.map((issue, index) => `${index + 1}. ${issue}`).join('\n');
}

function collectCharacterLimitIssues(
  settings: CoverLetterGenerationSettings,
  contentMarkdown: string
): string[] {
  const issues: string[] = [];

  if (settings.type !== 'message') {
    return issues;
  }

  const characterLimit = settings.characterLimit;
  if (characterLimit === null) {
    return issues;
  }

  const characterCount = getCharacterCount(contentMarkdown);
  if (
    settings.lengthPreset === COVER_LETTER_LENGTH_PRESET_MAP.MIN_CHARS &&
    characterCount < characterLimit
  ) {
    issues.push(
      `Generated message is shorter than minimum character limit (${characterCount}/${characterLimit}).`
    );
  }

  if (
    settings.lengthPreset === COVER_LETTER_LENGTH_PRESET_MAP.MAX_CHARS &&
    characterCount > characterLimit
  ) {
    issues.push(
      `Generated message exceeds maximum character limit (${characterCount}/${characterLimit}).`
    );
  }

  return issues;
}

function includesNameFragment(lines: string[], fullName: string): boolean {
  const normalizedFullName = fullName.toLowerCase().trim();
  if (normalizedFullName.length === 0) {
    return false;
  }

  return lines.some(line => line.toLowerCase().includes(normalizedFullName));
}

function hasFormalClosing(
  lines: string[],
  language: CoverLetterGenerationSettings['language']
): boolean {
  const pack = getCoverLetterLanguagePack(language);
  return lines.some(line =>
    pack.validation.formalClosingPatterns.some(pattern => pattern.test(line))
  );
}

function hasGreeting(
  lines: string[],
  language: CoverLetterGenerationSettings['language']
): boolean {
  const pack = getCoverLetterLanguagePack(language);
  return lines.some(line => pack.validation.greetingPatterns.some(pattern => pattern.test(line)));
}

function hasSenderContactSignal(lines: string[]): boolean {
  return lines.some(line => URL_OR_CONTACT_PATTERN.test(line));
}

function hasTemplatePlaceholder(value: string): boolean {
  return /\{[^}]+\}/.test(value);
}

function splitRecipientName(value: string | null): { firstName: string; lastName: string } {
  if (!value) {
    return { firstName: '', lastName: '' };
  }

  const tokens = value.trim().split(/\s+/).filter(Boolean);

  if (tokens.length === 0) {
    return { firstName: '', lastName: '' };
  }

  return {
    firstName: tokens[0] ?? '',
    lastName: tokens[tokens.length - 1] ?? ''
  };
}

function stripDateLabelPrefix(value: string): string {
  return value.replace(DATE_LABEL_PREFIX_PATTERN, '').trim();
}

function normalizeDateLineForComparison(value: string): string {
  return stripDateLabelPrefix(value)
    .replace(/\\\./g, '.')
    .replace(/\s+/g, ' ')
    .replace(/[,.]$/, '')
    .trim()
    .toLowerCase();
}

function isDateLineCandidate(value: string): boolean {
  const normalized = stripDateLabelPrefix(value.trim()).replace(/\\\./g, '.');
  if (normalized.length === 0) {
    return false;
  }

  return DATE_LINE_CANDIDATE_PATTERN.test(normalized);
}

function escapeOrderedListLikeDateLine(value: string): string {
  const trimmed = value.trim();
  return /^\d+\.\s+\S/.test(trimmed) ? trimmed.replace(/^(\d+)\./, '$1\\.') : trimmed;
}

function hasExpectedClosing(lines: string[], expectedClosing: string): boolean {
  const normalizedExpected = expectedClosing.trim().toLowerCase();
  if (normalizedExpected.length === 0) {
    return false;
  }

  return lines.some(line => line.trim().toLowerCase() === normalizedExpected);
}

function hasCurrentLocaleDateLine(
  lines: string[],
  settings: Pick<CoverLetterGenerationSettings, 'language' | 'market'>
): boolean {
  const expectedDateLine = normalizeDateLineForComparison(
    formatCoverLetterCurrentDate(settings.language, settings.market)
  );
  return lines.some(line => normalizeDateLineForComparison(line) === expectedDateLine);
}

function resolvePreferredLetterGreeting(input: GenerationInput): string {
  const pack = getCoverLetterLanguagePack(input.settings.language);
  const recipientName = input.settings.recipientName?.trim() ?? '';
  const { firstName, lastName } = splitRecipientName(recipientName);

  if (recipientName.length > 0) {
    const templateWithPlaceholder = pack.prompt.letter.greetings.find(item =>
      hasTemplatePlaceholder(item)
    );
    if (templateWithPlaceholder) {
      return templateWithPlaceholder
        .replace(/\{HiringManagerName\}/g, recipientName)
        .replace(/\{FirstName\}/g, firstName || recipientName)
        .replace(/\{LastName\}/g, lastName || recipientName)
        .trim();
    }
  }

  const placeholderFreeGreeting = pack.prompt.letter.greetings.find(
    item => !hasTemplatePlaceholder(item)
  );
  if (placeholderFreeGreeting) {
    return placeholderFreeGreeting.trim();
  }

  switch (input.settings.language) {
    case 'da-DK':
      return 'Hej';
    case 'uk-UA':
      return 'Добрий день!';
    case 'en':
    default:
      return 'Dear Hiring Manager,';
  }
}

function buildSenderHeaderLines(resumeContent: ResumeContent): string[] {
  const personalInfo = resumeContent.personalInfo;
  const headerLines: string[] = [];

  if (personalInfo.fullName.trim().length > 0) {
    headerLines.push(personalInfo.fullName.trim());
  }

  if (personalInfo.location?.trim()) {
    headerLines.push(personalInfo.location.trim());
  }

  const contactLines = [
    personalInfo.email,
    personalInfo.phone,
    personalInfo.linkedin,
    personalInfo.website,
    personalInfo.github
  ]
    .map(value => value?.trim())
    .filter((value): value is string => Boolean(value && value.length > 0));

  headerLines.push(...contactLines);
  return headerLines;
}

function trimEdgeBlankLines(lines: string[]): string[] {
  const result = [...lines];

  while (result.length > 0 && result[0]?.trim().length === 0) {
    result.shift();
  }

  while (result.length > 0 && result[result.length - 1]?.trim().length === 0) {
    result.pop();
  }

  return result;
}

function stripLeadingLetterMetaLines(lines: string[], input: GenerationInput): string[] {
  const fullName = input.resumeContent.personalInfo.fullName.trim().toLowerCase();
  const location = input.resumeContent.personalInfo.location?.trim().toLowerCase() ?? '';
  let index = 0;

  while (index < lines.length) {
    const line = lines[index]?.trim() ?? '';
    if (line.length === 0) {
      if (index === 0) {
        index += 1;
        continue;
      }

      break;
    }

    const normalized = line.toLowerCase();
    const isNameLine = fullName.length > 0 && normalized === fullName;
    const isLocationLine = location.length > 0 && normalized === location;
    const isContactLine = hasSenderContactSignal([line]);
    const isDateLine = isDateLineCandidate(line);

    if (isNameLine || isLocationLine || isContactLine || isDateLine) {
      index += 1;
      continue;
    }

    break;
  }

  return lines.slice(index);
}

function stripTrailingLetterMetaLines(lines: string[], input: GenerationInput): string[] {
  const fullName = input.resumeContent.personalInfo.fullName.trim().toLowerCase();
  const result = [...lines];

  while (result.length > 0 && result[result.length - 1]?.trim().length === 0) {
    result.pop();
  }

  const closingIndex = result.findLastIndex(line =>
    hasFormalClosing([line.trim()], input.settings.language)
  );

  if (closingIndex >= 0) {
    result.splice(closingIndex);
  } else if (result.length > 0) {
    const lastLine = result[result.length - 1]?.trim() ?? '';
    if (fullName.length > 0 && lastLine.toLowerCase() === fullName) {
      result.pop();
    }
  }

  while (result.length > 0 && result[result.length - 1]?.trim().length === 0) {
    result.pop();
  }

  return result;
}

function applyLetterStructureFallback(
  input: GenerationInput,
  parsed: CoverLetterLlmResponse
): CoverLetterLlmResponse {
  const rawLines = parsed.contentMarkdown.split(/\r?\n/g);
  if (toNonEmptyLines(parsed.contentMarkdown).length === 0) {
    return parsed;
  }

  const withoutLeadingMeta = stripLeadingLetterMetaLines(rawLines, input);
  const withoutTrailingMeta = stripTrailingLetterMetaLines(withoutLeadingMeta, input);
  const trimmedCoreLines = trimEdgeBlankLines(withoutTrailingMeta);

  let coreContent = trimmedCoreLines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (coreContent.length === 0) {
    coreContent = parsed.contentMarkdown.trim();
  }

  if (!hasGreeting(toNonEmptyLines(coreContent).slice(0, 6), input.settings.language)) {
    coreContent = `${resolvePreferredLetterGreeting(input)}\n\n${coreContent}`;
  }

  const headerLines = buildSenderHeaderLines(input.resumeContent);
  const dateLine = escapeOrderedListLikeDateLine(
    formatCoverLetterCurrentDate(input.settings.language, input.settings.market)
  );
  const preferredClosing = getCoverLetterLetterClosing(
    input.settings.language,
    input.settings.tone
  );
  const signatureName = input.resumeContent.personalInfo.fullName.trim();

  const letterBlocks: string[] = [];
  if (headerLines.length > 0) {
    letterBlocks.push(headerLines.join('\n'));
  }
  letterBlocks.push(dateLine, coreContent);

  const footerLines = [preferredClosing, signatureName].filter(line => line.length > 0);
  if (footerLines.length > 0) {
    letterBlocks.push(footerLines.join('\n'));
  }

  const contentMarkdown = letterBlocks
    .join('\n\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return {
    contentMarkdown,
    subjectLine: parsed.subjectLine
  };
}

function applyMessageStructureFallback(
  input: GenerationInput,
  parsed: CoverLetterLlmResponse
): CoverLetterLlmResponse {
  let lines = parsed.contentMarkdown.split(/\r?\n/g);

  const getNonEmptyLineMeta = (source: string[]): { rawIndex: number; line: string }[] => {
    return source
      .map((line, rawIndex) => ({ rawIndex, line: line.trim() }))
      .filter(item => item.line.length > 0);
  };

  let nonEmpty = getNonEmptyLineMeta(lines);
  if (nonEmpty.length === 0) {
    return parsed;
  }

  // In message mode, if the model still adds a formal sign-off block at the tail, strip it.
  const tailStart = Math.max(0, nonEmpty.length - 6);
  const closingCandidate = nonEmpty
    .slice(tailStart)
    .findLast(item => hasFormalClosing([item.line], input.settings.language));

  if (closingCandidate) {
    lines = lines.slice(0, closingCandidate.rawIndex);
    nonEmpty = getNonEmptyLineMeta(lines);
  }

  if (nonEmpty.length > 0) {
    const lastItem = nonEmpty[nonEmpty.length - 1];
    if (!lastItem) {
      return parsed;
    }

    const lastLine = lastItem.line;
    if (includesNameFragment([lastLine], input.resumeContent.personalInfo.fullName)) {
      lines = lines.slice(0, lastItem.rawIndex);
    }
  }

  const contentMarkdown = lines
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  if (contentMarkdown.length === 0) {
    return parsed;
  }

  return {
    contentMarkdown,
    subjectLine: parsed.subjectLine
  };
}

function normalizeLongDashes(value: string): string {
  return value.replace(/[—–]/g, '-');
}

function applyHumanStyleFallback(parsed: CoverLetterLlmResponse): CoverLetterLlmResponse {
  return {
    contentMarkdown: normalizeLongDashes(parsed.contentMarkdown),
    subjectLine: parsed.subjectLine ? normalizeLongDashes(parsed.subjectLine) : parsed.subjectLine
  };
}

function isPotentialSignatureLine(line: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length < 3 || trimmed.length > 80) {
    return false;
  }

  if (URL_OR_CONTACT_PATTERN.test(trimmed)) {
    return false;
  }

  const lower = trimmed.toLowerCase();
  const blockedTokens = ['regards', 'sincerely', 'hilsen', 'hilsner', 'thanks', 'дякую', 'повагою'];

  if (blockedTokens.some(token => lower.includes(token))) {
    return false;
  }

  const words = trimmed.split(/\s+/).filter(Boolean);
  if (words.length < 1 || words.length > 4) {
    return false;
  }

  const letterCount = trimmed.replace(/[^\p{L}\p{M}'’\-]/gu, '').length;
  if (letterCount < 3) {
    return false;
  }

  return true;
}

function hasSignatureAfterClosing(
  lines: string[],
  language: CoverLetterGenerationSettings['language']
): boolean {
  const pack = getCoverLetterLanguagePack(language);
  const closingIndex = lines.findLastIndex(line =>
    pack.validation.formalClosingPatterns.some(pattern => pattern.test(line))
  );

  if (closingIndex === -1) {
    return false;
  }

  const signatureCandidates = lines.slice(closingIndex + 1);
  return signatureCandidates.some(isPotentialSignatureLine);
}

function collectHumanStyleIssues(contentMarkdown: string): string[] {
  const issues: string[] = [];

  if (LONG_DASH_PATTERN.test(contentMarkdown)) {
    issues.push('Do not use long dash characters (— or –).');
  }

  if (AI_DISCLOSURE_PATTERNS.some(pattern => pattern.test(contentMarkdown))) {
    issues.push('Do not mention AI, ChatGPT, or language-model wording.');
  }

  return issues;
}

function collectLanguagePackRuleIssues(
  settings: CoverLetterGenerationSettings,
  contentMarkdown: string
): string[] {
  const pack = getCoverLetterLanguagePack(settings.language);
  const issues: string[] = [];

  for (const rule of pack.validation.rules) {
    if (rule.pattern.test(contentMarkdown)) {
      issues.push(rule.description);
    }
  }

  return issues;
}

function collectLetterStructureIssues(
  input: GenerationInput,
  parsed: CoverLetterLlmResponse
): string[] {
  const issues: string[] = [];
  const lines = toNonEmptyRawLines(parsed.contentMarkdown);
  if (lines.length === 0) {
    return ['Generated content is empty.'];
  }

  const topLines = lines.slice(0, 10);
  const tailLines = lines.slice(-8);
  const fullName = input.resumeContent.personalInfo.fullName;
  const hasContactInResume = Boolean(
    input.resumeContent.personalInfo.email ||
    input.resumeContent.personalInfo.phone ||
    input.resumeContent.personalInfo.linkedin ||
    input.resumeContent.personalInfo.website ||
    input.resumeContent.personalInfo.github
  );

  const hasSenderIdentitySignal =
    includesNameFragment(topLines, fullName) || hasSenderContactSignal(topLines);

  if (!hasSenderIdentitySignal) {
    issues.push('Letter must start with sender header containing candidate identity.');
  }

  if (hasContactInResume && !hasSenderContactSignal(topLines)) {
    issues.push('Letter sender header must include at least one available contact detail.');
  }

  if (!hasGreeting(topLines, input.settings.language)) {
    issues.push('Letter must include a greeting line near the top.');
  }

  if (!hasCurrentLocaleDateLine(topLines, input.settings)) {
    issues.push('Letter header must include the current date in selected locale format.');
  }

  const expectedClosing = getCoverLetterLetterClosing(input.settings.language, input.settings.tone);
  const hasClosing =
    hasFormalClosing(tailLines, input.settings.language) ||
    hasExpectedClosing(tailLines, expectedClosing);

  if (!hasClosing) {
    issues.push('Letter must include a formal closing phrase before signature.');
  }

  const hasSignature =
    includesNameFragment(tailLines, fullName) ||
    hasSignatureAfterClosing(tailLines, input.settings.language);

  if (!hasSignature) {
    issues.push('Letter must end with candidate name signature.');
  }

  return issues;
}

function collectMessageStructureIssues(
  input: GenerationInput,
  parsed: CoverLetterLlmResponse
): string[] {
  const issues: string[] = [];
  const lines = toNonEmptyLines(parsed.contentMarkdown);
  if (lines.length === 0) {
    return ['Generated content is empty.'];
  }

  const topLines = lines.slice(0, 8);
  const tailLines = lines.slice(-6);
  const fullName = input.resumeContent.personalInfo.fullName;

  if (hasSenderContactSignal(topLines)) {
    issues.push('Message must not include sender header/contact block at the top.');
  }

  if (hasFormalClosing(tailLines, input.settings.language)) {
    issues.push('Message must not include formal letter-style closing/sign-off.');
  }

  if (includesNameFragment(tailLines, fullName)) {
    issues.push('Message must not end with candidate name signature line.');
  }

  return issues;
}

function validateGeneratedCoverLetter(
  input: GenerationInput,
  parsed: CoverLetterLlmResponse
): void {
  const issues: string[] = [
    ...collectCharacterLimitIssues(input.settings, parsed.contentMarkdown),
    ...collectHumanStyleIssues(parsed.contentMarkdown),
    ...collectLanguagePackRuleIssues(input.settings, parsed.contentMarkdown),
    ...(input.settings.type === 'letter'
      ? collectLetterStructureIssues(input, parsed)
      : collectMessageStructureIssues(input, parsed))
  ];

  if (issues.length === 0) {
    return;
  }

  const details: CoverLetterValidationDetails = {
    issues,
    retryValidationFeedback: formatValidationFeedback(issues)
  };

  throw new CoverLetterGenerationError(
    `Cover letter output validation failed: ${issues[0]}`,
    'VALIDATION_FAILED',
    details
  );
}

function normalizeCandidateForOutput(
  input: GenerationInput,
  candidate: CoverLetterLlmResponse
): CoverLetterLlmResponse {
  const constrainedParsed = applyMaxCharacterLimitFallback(input.settings, candidate);
  const normalizedParsedByType =
    input.settings.type === 'letter'
      ? applyLetterStructureFallback(input, constrainedParsed)
      : applyMessageStructureFallback(input, constrainedParsed);
  const normalizedParsed = applyHumanStyleFallback(normalizedParsedByType);
  validateGeneratedCoverLetter(input, normalizedParsed);
  return normalizedParsed;
}

function shouldRewriteByQuality(
  config: CoverLetterHumanizerConfig,
  quality: CoverLetterQualityEvaluation
): boolean {
  if (config.mode !== 'rewrite' || config.maxRewritePasses < 1) {
    return false;
  }

  return (
    quality.rewriteRecommended ||
    quality.naturalnessScore < config.minNaturalnessScore ||
    quality.aiPatternRiskScore > config.maxAiRiskScore
  );
}

function isCoverLetterValidationDetails(value: unknown): value is CoverLetterValidationDetails {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const issues = Reflect.get(value, 'issues');
  const retryValidationFeedback = Reflect.get(value, 'retryValidationFeedback');

  return (
    Array.isArray(issues) &&
    issues.every(issue => typeof issue === 'string') &&
    typeof retryValidationFeedback === 'string'
  );
}

function getRetryValidationFeedback(error: unknown): string | null {
  if (!(error instanceof CoverLetterGenerationError)) {
    return null;
  }

  if (error.code !== 'VALIDATION_FAILED' || !error.details) {
    return null;
  }

  if (!isCoverLetterValidationDetails(error.details)) {
    return null;
  }

  return error.details.retryValidationFeedback;
}

function toUsageBreakdown(
  usage:
    | {
        inputTokens: number;
        outputTokens: number;
        cachedInputTokens?: number;
      }
    | undefined
): UsageBreakdown {
  return {
    inputTokens: usage?.inputTokens ?? 0,
    outputTokens: usage?.outputTokens ?? 0,
    cachedInputTokens: usage?.cachedInputTokens ?? 0
  };
}

function createUsageAccumulator(): UsageAccumulator {
  return {
    cost: 0,
    tokensUsed: 0,
    inputTokens: 0,
    outputTokens: 0,
    cachedInputTokens: 0,
    provider: null,
    providerType: null,
    model: null
  };
}

function appendUsage(
  accumulator: UsageAccumulator,
  llmResponse: Awaited<ReturnType<typeof callLLM>>
): void {
  const usage = toUsageBreakdown(llmResponse.usage);
  accumulator.cost += llmResponse.cost;
  accumulator.tokensUsed += llmResponse.tokensUsed;
  accumulator.inputTokens += usage.inputTokens;
  accumulator.outputTokens += usage.outputTokens;
  accumulator.cachedInputTokens += usage.cachedInputTokens;
  accumulator.provider = llmResponse.provider;
  accumulator.providerType = llmResponse.providerType;
  accumulator.model = llmResponse.model;
}

function toCoverLetterUsage(accumulator: UsageAccumulator, attemptsUsed: number): CoverLetterUsage {
  if (!accumulator.provider || !accumulator.providerType || !accumulator.model) {
    throw new CoverLetterGenerationError('Missing usage metadata from LLM response', 'LLM_ERROR');
  }

  return {
    cost: accumulator.cost,
    tokensUsed: accumulator.tokensUsed,
    inputTokens: accumulator.inputTokens,
    outputTokens: accumulator.outputTokens,
    cachedInputTokens: accumulator.cachedInputTokens,
    provider: accumulator.provider,
    providerType: accumulator.providerType,
    model: accumulator.model,
    attemptsUsed
  };
}

function isRetryableError(error: unknown): boolean {
  if (error instanceof CoverLetterGenerationError) {
    return error.code === 'INVALID_JSON' || error.code === 'VALIDATION_FAILED';
  }

  if (error instanceof LLMError) {
    if (!error.code) {
      return true;
    }

    return !NON_RECOVERABLE_LLM_ERROR_CODES.has(error.code);
  }

  return true;
}

export async function generateCoverLetterWithLLM(
  input: GenerationInput,
  options: GenerateCoverLetterOptions = {}
): Promise<GenerateCoverLetterResult> {
  const maxRetries = Math.max(0, options.maxRetries ?? DEFAULT_MAX_RETRIES);
  const userRole = toRole(options.role);

  let lastError: unknown = null;
  let retryValidationFeedback: string | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const scenarioPhase = attempt === 0 ? 'primary' : 'retry';
    const usageAccumulator = createUsageAccumulator();

    try {
      const llmResponse = await callLLM(
        {
          systemMessage: COVER_LETTER_SYSTEM_PROMPT,
          prompt: createCoverLetterUserPrompt(
            {
              resumeContent: input.resumeContent,
              vacancy: input.vacancy,
              settings: input.settings
            },
            {
              characterBufferConfig: options.characterBufferConfig,
              retryValidationFeedback
            }
          ),
          responseFormat: 'json'
        },
        {
          userId: options.userId,
          role: userRole,
          provider: options.provider,
          scenario: LLM_SCENARIO_KEY_MAP.COVER_LETTER_GENERATION,
          scenarioPhase
        }
      );
      appendUsage(usageAccumulator, llmResponse);

      const parsed = parseCoverLetterResponse(llmResponse.content);
      let candidate = parsed;

      if (shouldRunSemanticCompression(input.settings, candidate.contentMarkdown)) {
        const compressedResponse = await callLLM(
          {
            systemMessage: COVER_LETTER_SYSTEM_PROMPT,
            prompt: createCompressionPrompt(input, candidate.contentMarkdown),
            responseFormat: 'json'
          },
          {
            userId: options.userId,
            role: userRole,
            provider: options.provider,
            scenario: LLM_SCENARIO_KEY_MAP.COVER_LETTER_GENERATION,
            scenarioPhase
          }
        );

        appendUsage(usageAccumulator, compressedResponse);

        const compressedParsed = parseCoverLetterResponse(compressedResponse.content);
        candidate = {
          contentMarkdown: compressedParsed.contentMarkdown,
          subjectLine: candidate.subjectLine
        };
      }

      let normalizedParsed = normalizeCandidateForOutput(input, candidate);
      const humanizerConfig = options.humanizerConfig;

      if (humanizerConfig && humanizerConfig.mode !== 'off') {
        try {
          const criticResponse = await callLLM(
            {
              systemMessage: COVER_LETTER_SYSTEM_PROMPT,
              prompt: createCoverLetterCriticPrompt({
                settings: input.settings,
                contentMarkdown: normalizedParsed.contentMarkdown,
                subjectLine: normalizedParsed.subjectLine
              }),
              responseFormat: 'json',
              model: humanizerConfig.criticModel,
              temperature: 0.1,
              maxTokens: 600,
              reasoningEffort: 'low'
            },
            {
              userId: options.userId,
              role: userRole,
              provider: humanizerConfig.criticProvider,
              respectRequestMaxTokens: true,
              respectRequestReasoningEffort: true
            }
          );
          appendUsage(usageAccumulator, criticResponse);

          const quality = parseCoverLetterQualityResponse(criticResponse.content);
          const belowNaturalnessThreshold =
            quality.naturalnessScore < humanizerConfig.minNaturalnessScore;
          const aboveAiRiskThreshold = quality.aiPatternRiskScore > humanizerConfig.maxAiRiskScore;
          const shouldRewrite = shouldRewriteByQuality(humanizerConfig, quality);

          logHumanizer(humanizerConfig, 'quality evaluated', {
            mode: humanizerConfig.mode,
            naturalnessScore: quality.naturalnessScore,
            aiPatternRiskScore: quality.aiPatternRiskScore,
            specificityScore: quality.specificityScore,
            localeFitScore: quality.localeFitScore,
            rewriteRecommended: quality.rewriteRecommended,
            belowNaturalnessThreshold,
            aboveAiRiskThreshold,
            shouldRewrite
          });

          if (shouldRewrite) {
            let rewriteApplied = false;
            let rewriteFailureMessage: string | null = null;

            for (
              let rewritePass = 0;
              rewritePass < humanizerConfig.maxRewritePasses;
              rewritePass++
            ) {
              try {
                const rewriteResponse = await callLLM(
                  {
                    systemMessage: COVER_LETTER_SYSTEM_PROMPT,
                    prompt: createCoverLetterRewritePrompt({
                      settings: input.settings,
                      contentMarkdown: normalizedParsed.contentMarkdown,
                      subjectLine: normalizedParsed.subjectLine,
                      issues: quality.issues,
                      targetedFixes: quality.targetedFixes
                    }),
                    responseFormat: 'json'
                  },
                  {
                    userId: options.userId,
                    role: userRole,
                    provider: options.provider,
                    scenario: LLM_SCENARIO_KEY_MAP.COVER_LETTER_GENERATION,
                    scenarioPhase: 'retry'
                  }
                );
                appendUsage(usageAccumulator, rewriteResponse);

                const rewrittenCandidate = parseCoverLetterResponse(rewriteResponse.content);
                normalizedParsed = normalizeCandidateForOutput(input, rewrittenCandidate);
                rewriteApplied = true;
                break;
              } catch (error) {
                rewriteFailureMessage =
                  error instanceof Error ? error.message : 'Unknown rewrite error';
              }
            }

            logHumanizer(humanizerConfig, 'rewrite pass result', {
              rewriteApplied,
              maxRewritePasses: humanizerConfig.maxRewritePasses,
              failureMessage: rewriteFailureMessage
            });
          } else {
            logHumanizer(humanizerConfig, 'rewrite pass skipped', {
              mode: humanizerConfig.mode
            });
          }
        } catch (error) {
          logHumanizer(humanizerConfig, 'critic pass failed, using base output', {
            message: error instanceof Error ? error.message : 'Unknown critic error'
          });
        }
      }

      return {
        contentMarkdown: normalizedParsed.contentMarkdown,
        subjectLine: normalizedParsed.subjectLine ?? null,
        usage: toCoverLetterUsage(usageAccumulator, attempt + 1)
      };
    } catch (error) {
      lastError = error;
      retryValidationFeedback = getRetryValidationFeedback(error);

      if (!isRetryableError(error) || attempt >= maxRetries) {
        break;
      }
    }
  }

  if (lastError instanceof CoverLetterGenerationError) {
    throw lastError;
  }

  if (lastError instanceof Error) {
    throw new CoverLetterGenerationError(lastError.message, 'LLM_ERROR', lastError);
  }

  throw new CoverLetterGenerationError(
    'Cover letter generation failed after all retries',
    'MAX_RETRIES_EXCEEDED',
    lastError
  );
}
