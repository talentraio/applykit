import type { LLMProvider, ResumeContent, Role } from '@int/schema';
import { ResumeContentSchema } from '@int/schema';
import { callLLM, LLMError } from './index';
import { createParseUserPrompt, PARSE_SYSTEM_PROMPT } from './prompts/parse';

/**
 * LLM Parse Service
 *
 * Parses resume text into structured JSON using LLM
 * Includes Zod validation and automatic retry on validation failure
 *
 * Related: T072 (US2)
 */

/**
 * Parse options
 */
export type ParseOptions = {
  /**
   * User ID (required for role-based checks)
   */
  userId?: string;

  /**
   * User role (required for role-based checks)
   */
  role?: Role;

  /**
   * User-provided API key (BYOK)
   */
  userApiKey?: string;

  /**
   * Preferred provider
   */
  provider?: LLMProvider;

  /**
   * Explicit model override
   */
  model?: string;

  /**
   * Maximum retry attempts (default: 2)
   */
  maxRetries?: number;

  /**
   * Temperature for LLM (default: 0.1 for deterministic parsing)
   */
  temperature?: number;
};

/**
 * Parse result
 */
export type ParseLLMResult = {
  content: ResumeContent;
  cost: number;
  tokensUsed: number;
  provider: LLMProvider;
  attemptsUsed: number;
};

/**
 * Parse error class
 */
export class ParseLLMError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'VALIDATION_FAILED'
      | 'MAX_RETRIES_EXCEEDED'
      | 'LLM_ERROR'
      | 'INVALID_JSON',
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'ParseLLMError';
  }
}

/**
 * Extract JSON from LLM response
 *
 * Handles cases where LLM wraps JSON in markdown code blocks
 *
 * @param text - LLM response text
 * @returns Extracted JSON string
 */
function extractJSON(text: string): string {
  // Try to find JSON in markdown code block
  const codeBlockMatch = text.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
  if (codeBlockMatch && codeBlockMatch[1]) {
    return codeBlockMatch[1].trim();
  }

  // Try to find JSON object
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    return jsonMatch[0].trim();
  }

  return text.trim();
}

/**
 * Normalize date to YYYY-MM format
 *
 * @param date - Date string (may be YYYY or YYYY-MM or various other formats)
 * @returns Normalized date in YYYY-MM format, or null for invalid/present
 */
function normalizeDate(date: unknown): string | null {
  if (date === null || date === undefined) {
    return null;
  }

  if (typeof date !== 'string') {
    return null;
  }

  const trimmed = date.trim().toLowerCase();

  // Handle "present" and similar
  if (trimmed === 'present' || trimmed === 'current' || trimmed === 'now' || trimmed === '') {
    return null;
  }

  // Already in correct format YYYY-MM
  if (/^\d{4}-(?:0[1-9]|1[0-2])$/.test(trimmed)) {
    return trimmed;
  }

  // Just year - add -01
  if (/^\d{4}$/.test(trimmed)) {
    return `${trimmed}-01`;
  }

  // Format: MM/YYYY or M/YYYY
  const mmYYYY = trimmed.match(/^(\d{1,2})\/(\d{4})$/);
  if (mmYYYY && mmYYYY[1] && mmYYYY[2]) {
    const month = mmYYYY[1].padStart(2, '0');
    return `${mmYYYY[2]}-${month}`;
  }

  // Format: YYYY/MM
  const yyyyMM = trimmed.match(/^(\d{4})\/(\d{1,2})$/);
  if (yyyyMM && yyyyMM[1] && yyyyMM[2]) {
    const month = yyyyMM[2].padStart(2, '0');
    return `${yyyyMM[1]}-${month}`;
  }

  // Format: Month YYYY (e.g., "January 2023", "Jan 2023")
  const monthNames: Record<string, string> = {
    january: '01',
    jan: '01',
    february: '02',
    feb: '02',
    march: '03',
    mar: '03',
    april: '04',
    apr: '04',
    may: '05',
    june: '06',
    jun: '06',
    july: '07',
    jul: '07',
    august: '08',
    aug: '08',
    september: '09',
    sep: '09',
    sept: '09',
    october: '10',
    oct: '10',
    november: '11',
    nov: '11',
    december: '12',
    dec: '12'
  };

  const monthYearMatch = trimmed.match(/^([a-z]+)\s*(?:,\s*)?(\d{4})$/i);
  if (monthYearMatch && monthYearMatch[1] && monthYearMatch[2]) {
    const monthNum = monthNames[monthYearMatch[1].toLowerCase()];
    if (monthNum) {
      return `${monthYearMatch[2]}-${monthNum}`;
    }
  }

  // Format: YYYY Month (e.g., "2023 January")
  const yearMonthMatch = trimmed.match(/^(\d{4})\s+([a-z]+)$/i);
  if (yearMonthMatch && yearMonthMatch[1] && yearMonthMatch[2]) {
    const monthNum = monthNames[yearMonthMatch[2].toLowerCase()];
    if (monthNum) {
      return `${yearMonthMatch[1]}-${monthNum}`;
    }
  }

  // Try to extract year from any format as last resort
  const yearMatch = trimmed.match(/\d{4}/);
  if (yearMatch) {
    return `${yearMatch[0]}-01`;
  }

  return null;
}

const DEFAULT_START_DATE = '2000-01';
const DEFAULT_EMAIL = 'unknown@example.com';

function normalizeText(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized.length > 0 ? normalized : undefined;
}

function normalizeEmail(value: unknown): string {
  const candidate = typeof value === 'string' ? value.replace(/\s+/g, '').trim() : '';
  const normalized = candidate.replace(/^mailto:/i, '');
  const atIndex = normalized.indexOf('@');
  const lastAtIndex = normalized.lastIndexOf('@');
  if (atIndex > 0 && atIndex === lastAtIndex) {
    const local = normalized.slice(0, atIndex);
    const domain = normalized.slice(atIndex + 1);
    const hasDotInDomain = domain.includes('.');
    const hasSpaces = /\s/.test(local) || /\s/.test(domain);
    const startsOrEndsWithDot =
      local.startsWith('.') || local.endsWith('.') || domain.endsWith('.');
    if (
      local.length > 0 &&
      domain.length > 0 &&
      hasDotInDomain &&
      !hasSpaces &&
      !startsOrEndsWithDot
    ) {
      return normalized;
    }
  }

  return DEFAULT_EMAIL;
}

function normalizeUrl(value: unknown): string | undefined {
  const source = normalizeText(value);
  if (!source) {
    return undefined;
  }

  const trimStartChars = new Set(['<', '(', '[']);
  const trimEndChars = new Set(['>', ')', ',', '.', ';', ']']);
  let startIndex = 0;
  let endIndex = source.length;

  while (startIndex < endIndex && trimStartChars.has(source[startIndex] || '')) {
    startIndex++;
  }

  while (endIndex > startIndex && trimEndChars.has(source[endIndex - 1] || '')) {
    endIndex--;
  }

  const trimmed = source.slice(startIndex, endIndex);
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  if (/^www\./i.test(trimmed)) {
    return `https://${trimmed}`;
  }

  if (/^[a-z0-9.-]+\.[a-z]{2,}(?:\/\S*)?$/i.test(trimmed)) {
    return `https://${trimmed}`;
  }

  return undefined;
}

type NormalizedCustomSectionItem = {
  title?: string;
  description: string;
};

type NormalizedCustomSection = {
  sectionTitle: string;
  items: NormalizedCustomSectionItem[];
};

const FALLBACK_EXPERIENCE_SECTION_TITLES = new Set([
  'featured projects',
  'projects',
  'project experience',
  'selected projects'
]);

function normalizeSectionTitleForFallback(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function isFallbackExperienceSectionTitle(value: string): boolean {
  return FALLBACK_EXPERIENCE_SECTION_TITLES.has(normalizeSectionTitleForFallback(value));
}

function findFirstIndex(
  haystack: string,
  needles: string[]
): { index: number; value: string } | null {
  let bestIndex = -1;
  let bestNeedle = '';

  for (const needle of needles) {
    const index = haystack.indexOf(needle);
    if (index >= 0 && (bestIndex === -1 || index < bestIndex)) {
      bestIndex = index;
      bestNeedle = needle;
    }
  }

  if (bestIndex === -1) {
    return null;
  }

  return { index: bestIndex, value: bestNeedle };
}

function extractLabelSegment(
  value: string,
  labels: string[],
  stopLabels: string[]
): string | undefined {
  const lower = value.toLowerCase();
  const labelMatch = findFirstIndex(
    lower,
    labels.map(label => label.toLowerCase())
  );
  if (!labelMatch) {
    return undefined;
  }

  let startIndex = labelMatch.index + labelMatch.value.length;
  while (startIndex < value.length) {
    const current = value[startIndex];
    if (!current || !/[\s:-]/.test(current)) {
      break;
    }
    startIndex++;
  }

  let segment = value.slice(startIndex).trim();
  if (!segment) {
    return undefined;
  }

  if (stopLabels.length > 0) {
    const stopMatch = findFirstIndex(
      segment.toLowerCase(),
      stopLabels.map(label => label.toLowerCase())
    );
    if (stopMatch) {
      segment = segment.slice(0, stopMatch.index).trim();
    }
  }

  return segment || undefined;
}

function extractDateRangeFromPeriod(value: string): { startDate: string; endDate?: string } | null {
  const periodText =
    extractLabelSegment(
      value,
      ['period'],
      ['project roles', 'project role', 'roles', 'role', 'responsibilities', 'environment']
    ) || value;
  const dateTokens =
    periodText.match(
      /(?:january|jan|february|feb|march|mar|april|apr|may|june|jun|july|jul|august|aug|september|sept|sep|october|oct|november|nov|december|dec)\s+\d{4}|\d{4}-\d{2}|\d{1,2}\/\d{4}|\d{4}/gi
    ) || [];

  const normalizedDates = Array.from(
    new Set(
      dateTokens
        .map(token => normalizeDate(token))
        .filter((token): token is string => Boolean(token))
    )
  );

  if (normalizedDates.length === 0) {
    return null;
  }

  const startDate = normalizedDates[0];
  if (!startDate) {
    return null;
  }

  if (/\b(?:present|current|now)\b/i.test(periodText)) {
    return { startDate };
  }

  const endDate = normalizedDates[1];
  if (!endDate || endDate === startDate) {
    return { startDate };
  }

  return { startDate, endDate };
}

function extractRoleFromDescription(value: string): string | undefined {
  const roleText = extractLabelSegment(
    value,
    ['project roles', 'project role', 'roles', 'role'],
    ['responsibilities', 'environment']
  );
  return normalizeText(roleText);
}

function extractBulletsFromResponsibilities(value: string): string[] | undefined {
  const responsibilitiesText = extractLabelSegment(
    value,
    ['responsibilities & achievements', 'responsibilities and achievements', 'responsibilities'],
    ['environment']
  );
  if (!responsibilitiesText) {
    return undefined;
  }

  const normalizedFromBullets = responsibilitiesText
    .split(/[●•▪]/)
    .map(item => normalizeText(item?.replace(/^[\s,;:-]+/, '')))
    .filter((item): item is string => Boolean(item));

  const normalizedFromSeparators =
    normalizedFromBullets.length > 1
      ? normalizedFromBullets
      : responsibilitiesText
          .split(/;+/)
          .map(item => normalizeText(item?.replace(/^[\s,;:-]+/, '')))
          .filter((item): item is string => Boolean(item));

  if (normalizedFromSeparators.length === 0) {
    return undefined;
  }

  return Array.from(new Set(normalizedFromSeparators));
}

function extractTechnologiesFromDescription(value: string): string[] | undefined {
  const environmentText = extractLabelSegment(value, ['environment'], []);
  if (!environmentText) {
    return undefined;
  }

  const technologies = environmentText
    .replace(/[●•▪]/g, ',')
    .split(',')
    .map(item => normalizeText(item?.replace(/^[\s,;:-]+/, '')))
    .filter((item): item is string => Boolean(item));

  if (technologies.length === 0) {
    return undefined;
  }

  return Array.from(new Set(technologies));
}

function extractFallbackExperienceFromCustomSections(
  customSections: NormalizedCustomSection[]
): Array<Record<string, unknown>> {
  return customSections.flatMap(section => {
    const sectionAllowsFallback = isFallbackExperienceSectionTitle(section.sectionTitle);
    if (!sectionAllowsFallback) {
      return [];
    }

    return section.items
      .map(item => {
        const dateRange = extractDateRangeFromPeriod(item.description);
        const itemLooksLikeExperience =
          /\brole\b|\broles\b|\bresponsibilities\b|\benvironment\b/i.test(item.description);

        if (!itemLooksLikeExperience) {
          return null;
        }

        const description =
          normalizeText(item.title) || normalizeText(item.description) || 'Project experience';
        const company = 'Various Projects';
        const position = extractRoleFromDescription(item.description) || 'Unknown Position';
        const bullets = extractBulletsFromResponsibilities(item.description);
        const technologies = extractTechnologiesFromDescription(item.description);

        const fallbackExperienceEntry: Record<string, unknown> = {
          company,
          position,
          startDate: dateRange?.startDate || DEFAULT_START_DATE,
          description
        };

        if (dateRange?.endDate) {
          fallbackExperienceEntry.endDate = dateRange.endDate;
        }

        if (bullets && bullets.length > 0) {
          fallbackExperienceEntry.bullets = bullets;
        }

        if (technologies && technologies.length > 0) {
          fallbackExperienceEntry.technologies = technologies;
        }

        return fallbackExperienceEntry;
      })
      .filter((entry): entry is Record<string, unknown> => entry !== null);
  });
}

/**
 * Normalize skills from various LLM output formats
 *
 * LLM sometimes returns skills as:
 * - Array of strings: ["JavaScript", "TypeScript"]
 * - Array of objects with wrong structure
 *
 * This normalizes to the expected format:
 * [{ type: "Category", skills: ["skill1", "skill2"] }]
 */
function normalizeSkills(skills: unknown): Array<{ type: string; skills: string[] }> {
  if (!Array.isArray(skills)) {
    return [{ type: 'Technical Skills', skills: ['General'] }];
  }

  // Check if already in correct format
  if (
    skills.length > 0 &&
    typeof skills[0] === 'object' &&
    skills[0] !== null &&
    'type' in skills[0] &&
    'skills' in skills[0]
  ) {
    const normalizedGroups = skills
      .map(group => {
        const groupData = group as { type?: unknown; skills?: unknown };
        const groupType = normalizeText(groupData.type) || 'Other';
        const normalizedSkills = Array.isArray(groupData.skills)
          ? Array.from(
              new Set(
                groupData.skills
                  .map(item => normalizeText(item))
                  .filter((item): item is string => Boolean(item))
              )
            )
          : [];

        if (normalizedSkills.length === 0) {
          return null;
        }

        return {
          type: groupType,
          skills: normalizedSkills
        };
      })
      .filter((group): group is { type: string; skills: string[] } => group !== null);

    if (normalizedGroups.length > 0) {
      return normalizedGroups;
    }
  }

  // Array of strings - group into a single "Technical Skills" category
  if (skills.length > 0 && typeof skills[0] === 'string') {
    const normalizedSkills = Array.from(
      new Set(
        skills.map(item => normalizeText(item)).filter((item): item is string => Boolean(item))
      )
    );

    if (normalizedSkills.length > 0) {
      return [
        {
          type: 'Technical Skills',
          skills: normalizedSkills
        }
      ];
    }
  }

  return [{ type: 'Technical Skills', skills: ['General'] }];
}

/**
 * Normalize LLM response data before validation
 *
 * Fixes common LLM output issues:
 * - Date formats (YYYY -> YYYY-01)
 * - Skills structure (string[] -> SkillGroup[])
 * - URL/email normalization
 * - Missing required fields defaults
 */
function normalizeParsedData(data: unknown): unknown {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  const obj = data as Record<string, unknown>;
  const result: Record<string, unknown> = {};

  // Normalize personal info
  const rawPersonalInfo =
    typeof obj.personalInfo === 'object' && obj.personalInfo !== null
      ? (obj.personalInfo as Record<string, unknown>)
      : {};
  const personalInfo: Record<string, unknown> = {
    fullName: normalizeText(rawPersonalInfo.fullName) || 'Unknown',
    email: normalizeEmail(rawPersonalInfo.email)
  };

  const normalizedTitle = normalizeText(rawPersonalInfo.title);
  if (normalizedTitle) {
    personalInfo.title = normalizedTitle;
  }

  const normalizedPhone = normalizeText(rawPersonalInfo.phone);
  if (normalizedPhone) {
    personalInfo.phone = normalizedPhone;
  }

  const normalizedLocation = normalizeText(rawPersonalInfo.location);
  if (normalizedLocation) {
    personalInfo.location = normalizedLocation;
  }

  const normalizedLinkedin = normalizeUrl(rawPersonalInfo.linkedin);
  if (normalizedLinkedin) {
    personalInfo.linkedin = normalizedLinkedin;
  }

  const normalizedWebsite = normalizeUrl(rawPersonalInfo.website);
  if (normalizedWebsite) {
    personalInfo.website = normalizedWebsite;
  }

  const normalizedGithub = normalizeUrl(rawPersonalInfo.github);
  if (normalizedGithub) {
    personalInfo.github = normalizedGithub;
  }

  result.personalInfo = personalInfo;

  const summary = normalizeText(obj.summary);
  if (summary) {
    result.summary = summary;
  }

  // Normalize experience entries
  if (Array.isArray(obj.experience)) {
    result.experience = obj.experience
      .map(exp => {
        if (typeof exp !== 'object' || exp === null) {
          return null;
        }

        const entry = exp as Record<string, unknown>;
        const normalizedStartDate =
          normalizeDate(entry.startDate) || normalizeDate(entry.endDate) || DEFAULT_START_DATE;
        const normalizedEndDate =
          entry.endDate === null || entry.endDate === undefined
            ? undefined
            : normalizeDate(entry.endDate);

        const normalizedLinks = Array.isArray(entry.links)
          ? entry.links
              .map(link => {
                if (typeof link !== 'object' || link === null) {
                  return null;
                }

                const linkEntry = link as Record<string, unknown>;
                const normalizedLinkUrl = normalizeUrl(linkEntry.link);
                if (!normalizedLinkUrl) {
                  return null;
                }

                return {
                  name: normalizeText(linkEntry.name) || 'Link',
                  link: normalizedLinkUrl
                };
              })
              .filter((link): link is { name: string; link: string } => link !== null)
          : undefined;

        const normalizedBullets = Array.isArray(entry.bullets)
          ? entry.bullets
              .map(item => normalizeText(item))
              .filter((item): item is string => Boolean(item))
          : undefined;

        const normalizedTechnologies = Array.isArray(entry.technologies)
          ? entry.technologies
              .map(item => normalizeText(item))
              .filter((item): item is string => Boolean(item))
          : undefined;

        const normalizedEntry: Record<string, unknown> = {
          company: normalizeText(entry.company) || 'Unknown Company',
          position: normalizeText(entry.position) || 'Unknown Position',
          startDate: normalizedStartDate,
          description: normalizeText(entry.description) || ''
        };

        const location = normalizeText(entry.location);
        if (location) {
          normalizedEntry.location = location;
        }

        if (normalizedEndDate) {
          normalizedEntry.endDate = normalizedEndDate;
        }

        if (normalizedBullets && normalizedBullets.length > 0) {
          normalizedEntry.bullets = normalizedBullets;
        }

        if (normalizedTechnologies && normalizedTechnologies.length > 0) {
          normalizedEntry.technologies = normalizedTechnologies;
        }

        if (normalizedLinks && normalizedLinks.length > 0) {
          normalizedEntry.links = normalizedLinks;
        }

        return normalizedEntry;
      })
      .filter((entry): entry is Record<string, unknown> => entry !== null);
  } else {
    result.experience = [];
  }

  // Normalize education entries
  if (Array.isArray(obj.education)) {
    result.education = obj.education
      .map(edu => {
        if (typeof edu !== 'object' || edu === null) {
          return null;
        }

        const entry = edu as Record<string, unknown>;
        const normalizedStartDate =
          normalizeDate(entry.startDate) || normalizeDate(entry.endDate) || DEFAULT_START_DATE;
        const normalizedEndDate =
          entry.endDate === null || entry.endDate === undefined
            ? undefined
            : normalizeDate(entry.endDate);

        const normalizedEntry: Record<string, unknown> = {
          institution: normalizeText(entry.institution) || 'Unknown Institution',
          degree: normalizeText(entry.degree) || 'Other',
          startDate: normalizedStartDate
        };

        const field = normalizeText(entry.field);
        if (field) {
          normalizedEntry.field = field;
        }

        if (normalizedEndDate) {
          normalizedEntry.endDate = normalizedEndDate;
        }

        return normalizedEntry;
      })
      .filter((entry): entry is Record<string, unknown> => entry !== null);
  } else {
    result.education = [];
  }

  // Normalize certifications dates
  if (Array.isArray(obj.certifications)) {
    const certifications = obj.certifications
      .map(cert => {
        if (typeof cert !== 'object' || cert === null) {
          return null;
        }

        const entry = cert as Record<string, unknown>;
        const name = normalizeText(entry.name);
        if (!name) {
          return null;
        }

        const normalizedDate = entry.date ? normalizeDate(entry.date) : undefined;
        const normalizedEntry: Record<string, unknown> = {
          name
        };

        const issuer = normalizeText(entry.issuer);
        if (issuer) {
          normalizedEntry.issuer = issuer;
        }

        if (normalizedDate) {
          normalizedEntry.date = normalizedDate;
        }

        return normalizedEntry;
      })
      .filter((entry): entry is Record<string, unknown> => entry !== null);

    if (certifications.length > 0) {
      result.certifications = certifications;
    }
  }

  if (Array.isArray(obj.languages)) {
    const languages = obj.languages
      .map(languageEntry => {
        if (typeof languageEntry !== 'object' || languageEntry === null) {
          return null;
        }

        const entry = languageEntry as Record<string, unknown>;
        const language = normalizeText(entry.language);
        if (!language) {
          return null;
        }

        return {
          language,
          level: normalizeText(entry.level) || 'Intermediate'
        };
      })
      .filter((entry): entry is { language: string; level: string } => entry !== null);

    if (languages.length > 0) {
      result.languages = languages;
    }
  }

  let normalizedCustomSections: NormalizedCustomSection[] = [];

  if (Array.isArray(obj.customSections)) {
    normalizedCustomSections = obj.customSections
      .map(section => {
        if (typeof section !== 'object' || section === null) {
          return null;
        }

        const sectionData = section as Record<string, unknown>;
        const items = Array.isArray(sectionData.items)
          ? sectionData.items
              .map(item => {
                if (typeof item !== 'object' || item === null) {
                  return null;
                }

                const itemData = item as Record<string, unknown>;
                const itemTitle = normalizeText(itemData.title);
                const itemDescription = normalizeText(itemData.description) || itemTitle;

                if (!itemDescription) {
                  return null;
                }

                return {
                  ...(itemTitle ? { title: itemTitle } : {}),
                  description: itemDescription
                };
              })
              .filter((item): item is { title?: string; description: string } => item !== null)
          : [];

        if (items.length === 0) {
          return null;
        }

        return {
          sectionTitle: normalizeText(sectionData.sectionTitle) || 'Additional',
          items
        };
      })
      .filter((section): section is NormalizedCustomSection => section !== null);

    if (normalizedCustomSections.length > 0) {
      result.customSections = normalizedCustomSections;
    }
  }

  if (
    Array.isArray(result.experience) &&
    result.experience.length === 0 &&
    normalizedCustomSections.length > 0
  ) {
    const fallbackExperience =
      extractFallbackExperienceFromCustomSections(normalizedCustomSections);
    if (fallbackExperience.length > 0) {
      result.experience = fallbackExperience;
    }
  }

  // Normalize skills structure
  result.skills = normalizeSkills(obj.skills);

  return result;
}

function createRetryPrompt(
  resumeText: string,
  reason: string,
  previousOutput: string | null
): string {
  const clippedReason = reason.slice(0, 2000);
  const clippedOutput = previousOutput ? previousOutput.slice(0, 8000) : '';

  return `${createParseUserPrompt(resumeText)}

Your previous output was invalid.
Reason:
${clippedReason}

Previous output:
${clippedOutput}

Return corrected JSON only.`;
}

/**
 * Parse resume text into structured content using LLM
 *
 * @param text - Plain text extracted from resume document
 * @param options - Parse options
 * @returns Parsed resume content with metadata
 * @throws ParseLLMError if parsing fails after retries
 */
export async function parseResumeWithLLM(
  text: string,
  options: ParseOptions = {}
): Promise<ParseLLMResult> {
  const { userId, role, userApiKey, provider, model, maxRetries = 3, temperature = 0.1 } = options;

  let attempts = 0;
  let totalCost = 0;
  let totalTokens = 0;
  let lastError: Error | null = null;
  let actualProvider: LLMProvider | undefined;
  let retryReason: string | null = null;
  let previousOutput: string | null = null;

  while (attempts < maxRetries) {
    attempts++;

    try {
      const prompt = retryReason
        ? createRetryPrompt(text, retryReason, previousOutput)
        : createParseUserPrompt(text);

      // Call LLM
      const response = await callLLM(
        {
          systemMessage: PARSE_SYSTEM_PROMPT,
          prompt,
          model,
          temperature,
          maxTokens: 6000,
          responseFormat: 'json'
        },
        {
          userId,
          role,
          userApiKey,
          provider
        }
      );

      actualProvider = response.provider;
      totalCost += response.cost;
      totalTokens += response.tokensUsed;

      // Extract JSON from response
      const jsonString = extractJSON(response.content);
      previousOutput = response.content;

      // Parse JSON
      let parsedJSON: unknown;
      try {
        parsedJSON = JSON.parse(jsonString);
      } catch (jsonError) {
        throw new ParseLLMError(
          `Failed to parse JSON: ${jsonError instanceof Error ? jsonError.message : 'Unknown error'}`,
          'INVALID_JSON',
          { response: response.content }
        );
      }

      // Normalize data before validation (fixes common LLM output issues)
      const normalizedData = normalizeParsedData(parsedJSON);

      // Validate with Zod
      const validationResult = ResumeContentSchema.safeParse(normalizedData);

      if (validationResult.success) {
        // Success!
        return {
          content: validationResult.data,
          cost: totalCost,
          tokensUsed: totalTokens,
          provider: actualProvider,
          attemptsUsed: attempts
        };
      }

      // Validation failed
      const validationIssues = validationResult.error.errors
        .map(issue => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ');

      lastError = new ParseLLMError(
        `Validation failed: ${JSON.stringify(validationResult.error.errors)}`,
        'VALIDATION_FAILED',
        validationResult.error.errors
      );
      retryReason = validationIssues;

      console.warn(
        `Parse validation failed (attempt ${attempts}/${maxRetries}):`,
        validationResult.error.errors
      );

      // If this is the last attempt, throw error
      if (attempts >= maxRetries) {
        throw lastError;
      }

      // Otherwise, retry with more specific instructions
      // (Could enhance this to include validation errors in the prompt)
    } catch (error) {
      if (error instanceof ParseLLMError) {
        lastError = error;
        retryReason = error.message;

        if (
          typeof error.details === 'object' &&
          error.details !== null &&
          typeof Reflect.get(error.details, 'response') === 'string'
        ) {
          previousOutput = String(Reflect.get(error.details, 'response'));
        }
      } else if (error instanceof LLMError) {
        throw new ParseLLMError(`LLM error: ${error.message}`, 'LLM_ERROR', error);
      } else {
        lastError = new ParseLLMError(
          `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'LLM_ERROR',
          error
        );
      }

      // If this is the last attempt, throw error
      if (attempts >= maxRetries) {
        throw lastError;
      }

      console.warn(`Parse attempt ${attempts}/${maxRetries} failed:`, lastError.message);
    }
  }

  // Should not reach here, but just in case
  throw new ParseLLMError(
    `Failed to parse resume after ${attempts} attempts: ${lastError?.message || 'Unknown error'}`,
    'MAX_RETRIES_EXCEEDED',
    lastError
  );
}
