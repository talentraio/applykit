import type { FormatSettingsConfig } from '@layer/api/server/types/format-settings-config';
import {
  PatchFormatSettingsBodySchema,
  ResumeFormatSettingsAtsSchema,
  ResumeFormatSettingsHumanSchema
} from '@int/schema';
import {
  generationRepository,
  resumeFormatSettingsRepository,
  vacancyRepository
} from '@layer/api/server/data/repositories';

/**
 * PATCH /api/vacancies/:id/generations/:generationId/format-settings
 *
 * Patch generation editor format settings.
 * Settings are persisted per resume (generation.resumeId).
 */
export default defineEventHandler(async event => {
  const session = await requireUserSession(event);
  const userId = (session.user as { id: string }).id;

  const vacancyId = getRouterParam(event, 'id');
  if (!vacancyId) {
    throw createError({
      statusCode: 400,
      message: 'Vacancy ID is required'
    });
  }

  const generationId = getRouterParam(event, 'generationId');
  if (!generationId) {
    throw createError({
      statusCode: 400,
      message: 'Generation ID is required'
    });
  }

  const vacancy = await vacancyRepository.findById(vacancyId);
  if (!vacancy) {
    throw createError({
      statusCode: 404,
      message: 'Vacancy not found'
    });
  }

  if (vacancy.userId !== userId) {
    throw createError({
      statusCode: 403,
      message: 'Access denied'
    });
  }

  const generation = await generationRepository.findById(generationId);
  if (!generation || generation.vacancyId !== vacancyId) {
    throw createError({
      statusCode: 404,
      message: 'Generation not found'
    });
  }

  const body = await readBody(event);
  const parsed = PatchFormatSettingsBodySchema.safeParse(body);
  if (!parsed.success) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Validation Error',
      data: { issues: parsed.error.issues }
    });
  }

  const patch = parsed.data;
  if (!patch.ats && !patch.human) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Validation Error',
      data: { issues: [{ path: [], message: 'At least one of ats or human must be provided' }] }
    });
  }

  const config = useRuntimeConfig(event);
  const defaults = (config.public.formatSettings as FormatSettingsConfig).defaults;
  const existing =
    (await resumeFormatSettingsRepository.findByResumeId(generation.resumeId)) ??
    (await resumeFormatSettingsRepository.seedDefaults(generation.resumeId, defaults));

  const mergedAts = patch.ats
    ? {
        spacing: { ...existing.ats.spacing, ...patch.ats.spacing },
        localization: { ...existing.ats.localization, ...patch.ats.localization }
      }
    : existing.ats;

  const mergedHuman = patch.human
    ? {
        spacing: { ...existing.human.spacing, ...patch.human.spacing },
        localization: { ...existing.human.localization, ...patch.human.localization }
      }
    : existing.human;

  const atsValidation = ResumeFormatSettingsAtsSchema.safeParse(mergedAts);
  if (!atsValidation.success) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Validation Error',
      data: { issues: atsValidation.error.issues }
    });
  }

  const humanValidation = ResumeFormatSettingsHumanSchema.safeParse(mergedHuman);
  if (!humanValidation.success) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Validation Error',
      data: { issues: humanValidation.error.issues }
    });
  }

  const updated = await resumeFormatSettingsRepository.update(generation.resumeId, {
    ats: atsValidation.data,
    human: humanValidation.data
  });

  if (!updated) {
    throw createError({
      statusCode: 500,
      message: 'Failed to update resume format settings'
    });
  }

  return {
    ats: updated.ats,
    human: updated.human
  };
});
