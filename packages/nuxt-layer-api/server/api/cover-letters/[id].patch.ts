import {
  CoverLetterGenerationSettingsSchema,
  CoverLetterPatchBodySchema,
  normalizeNullableText,
  SpacingSettingsSchema
} from '@int/schema';
import { coverLetterRepository } from '../../data/repositories';
import {
  getCharacterLimitValidationMessage,
  resolveCoverLetterCharacterLimits,
  toCharacterLimitIssue
} from '../../services/vacancy/cover-letter-character-limits';

const hasOwn = <T extends object>(value: T, key: keyof T): boolean =>
  Object.prototype.hasOwnProperty.call(value, key);

/**
 * PATCH /api/cover-letters/:id
 *
 * Incremental updates for content/settings and metadata.
 */
export default defineEventHandler(async event => {
  const session = await requireUserSession(event);
  const userId = session.user.id;

  const coverLetterId = getRouterParam(event, 'id');
  if (!coverLetterId) {
    throw createError({
      statusCode: 400,
      message: 'Cover letter ID is required'
    });
  }

  const body = await readBody(event).catch(() => ({}));
  const validation = CoverLetterPatchBodySchema.safeParse(body);
  if (!validation.success) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Validation Error',
      data: { issues: validation.error.issues }
    });
  }

  const patch = validation.data;

  const existing = await coverLetterRepository.findByIdAndUserId(coverLetterId, userId);
  if (!existing) {
    throw createError({
      statusCode: 404,
      message: 'Cover letter not found'
    });
  }

  const nextType = patch.type ?? existing.type;
  const nextIncludeSubjectLine =
    nextType === 'message' ? (patch.includeSubjectLine ?? existing.includeSubjectLine) : false;
  const nextLengthPreset = patch.lengthPreset ?? existing.lengthPreset;
  const nextCharacterLimit = hasOwn(patch, 'characterLimit')
    ? (patch.characterLimit ?? null)
    : existing.characterLimit;

  let nextSubjectLine = existing.subjectLine;
  if (hasOwn(patch, 'subjectLine')) {
    nextSubjectLine = normalizeNullableText(patch.subjectLine);
  }

  if (nextType !== 'message' || !nextIncludeSubjectLine) {
    nextSubjectLine = null;
  }

  const mergedFormatSettings = patch.formatSettings
    ? {
        ...existing.formatSettings,
        ...patch.formatSettings
      }
    : existing.formatSettings;

  const formatValidation = SpacingSettingsSchema.safeParse(mergedFormatSettings);
  if (!formatValidation.success) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Validation Error',
      data: { issues: formatValidation.error.issues }
    });
  }

  const nextSettingsValidation = CoverLetterGenerationSettingsSchema.safeParse({
    language: patch.language ?? existing.language,
    type: nextType,
    tone: patch.tone ?? existing.tone,
    lengthPreset: nextLengthPreset,
    characterLimit: nextCharacterLimit,
    recipientName: hasOwn(patch, 'recipientName') ? patch.recipientName : existing.recipientName,
    includeSubjectLine: nextIncludeSubjectLine,
    instructions: hasOwn(patch, 'instructions') ? patch.instructions : existing.instructions
  });

  if (!nextSettingsValidation.success) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Validation Error',
      data: { issues: nextSettingsValidation.error.issues }
    });
  }

  const nextSettings = nextSettingsValidation.data;
  const characterLimits = resolveCoverLetterCharacterLimits(useRuntimeConfig(event));
  const characterLimitValidationMessage = getCharacterLimitValidationMessage(
    nextSettings,
    characterLimits
  );

  if (characterLimitValidationMessage) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Validation Error',
      data: { issues: [toCharacterLimitIssue(characterLimitValidationMessage)] }
    });
  }

  const updated = await coverLetterRepository.updateById(coverLetterId, {
    language: nextSettings.language,
    type: nextSettings.type,
    tone: nextSettings.tone,
    lengthPreset: nextSettings.lengthPreset,
    characterLimit: nextSettings.characterLimit,
    recipientName: normalizeNullableText(nextSettings.recipientName),
    includeSubjectLine: nextSettings.includeSubjectLine,
    instructions: normalizeNullableText(nextSettings.instructions),
    subjectLine: nextSubjectLine,
    contentMarkdown: patch.contentMarkdown ?? existing.contentMarkdown,
    formatSettings: formatValidation.data
  });

  if (!updated) {
    throw createError({
      statusCode: 500,
      message: 'Failed to update cover letter'
    });
  }

  return updated;
});
