import type { FormatSettingsConfig } from '../../types/format-settings-config';
import {
  PatchFormatSettingsBodySchema,
  ResumeFormatSettingsAtsSchema,
  ResumeFormatSettingsHumanSchema
} from '@int/schema';
import { formatSettingsRepository } from '../../data/repositories/format-settings';

/**
 * PATCH /api/user/format-settings
 *
 * Partially update the authenticated user's format settings.
 * Deep-merges patch with existing settings, validates merged result.
 *
 * Body: Deep partial of { ats, human }
 * Response: Full settings after merge (same shape as GET)
 */
export default defineEventHandler(async event => {
  const session = await requireUserSession(event);
  const userId = (session.user as { id: string }).id;

  const body = await readBody(event);

  // Validate patch body
  const parsed = PatchFormatSettingsBodySchema.safeParse(body);
  if (!parsed.success) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Validation Error',
      data: { issues: parsed.error.issues }
    });
  }

  const patch = parsed.data;

  // At least one of ats or human must be present
  if (!patch.ats && !patch.human) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Validation Error',
      data: { issues: [{ path: [], message: 'At least one of ats or human must be provided' }] }
    });
  }

  // Load existing settings (or seed defaults)
  let existing = await formatSettingsRepository.findByUserId(userId);
  if (!existing) {
    const config = useRuntimeConfig(event);
    const defaults = (config.public.formatSettings as FormatSettingsConfig).defaults;
    existing = await formatSettingsRepository.seedDefaults(userId, defaults);
  }

  // Deep-merge: existing + patch
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

  // Validate merged results
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

  // Save merged settings
  const updated = await formatSettingsRepository.update(userId, {
    ats: atsValidation.data,
    human: humanValidation.data
  });

  if (!updated) {
    throw createError({
      statusCode: 500,
      message: 'Failed to update format settings'
    });
  }

  return {
    ats: updated.ats,
    human: updated.human
  };
});
