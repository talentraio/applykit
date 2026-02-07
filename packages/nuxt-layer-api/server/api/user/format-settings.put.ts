import type { FormatSettingsConfig } from '../../types/format-settings-config';
import { PutFormatSettingsBodySchema } from '@int/schema';
import { formatSettingsRepository } from '../../data/repositories/format-settings';

/**
 * PUT /api/user/format-settings
 *
 * Fully replace the authenticated user's format settings.
 *
 * Body: { ats, human }
 * Response: Full settings after replacement (same shape as GET)
 */
export default defineEventHandler(async event => {
  const session = await requireUserSession(event);
  const userId = (session.user as { id: string }).id;

  const body = await readBody(event);
  const parsed = PutFormatSettingsBodySchema.safeParse(body);

  if (!parsed.success) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Validation Error',
      data: { issues: parsed.error.issues }
    });
  }

  let existing = await formatSettingsRepository.findByUserId(userId);
  if (!existing) {
    const config = useRuntimeConfig(event);
    const defaults = (config.public.formatSettings as FormatSettingsConfig).defaults;
    existing = await formatSettingsRepository.seedDefaults(userId, defaults);
  }

  const updated = await formatSettingsRepository.update(userId, {
    ats: parsed.data.ats,
    human: parsed.data.human
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
