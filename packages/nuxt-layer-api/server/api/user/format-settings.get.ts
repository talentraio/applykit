import type { FormatSettingsConfig } from '../../types/format-settings-config';
import { formatSettingsRepository } from '../../data/repositories/format-settings';

/**
 * GET /api/user/format-settings
 *
 * Fetch the authenticated user's format settings.
 * If no settings row exists, auto-seeds from runtimeConfig defaults.
 *
 * Response: { ats: ResumeFormatSettingsAts, human: ResumeFormatSettingsHuman }
 */
export default defineEventHandler(async event => {
  const session = await requireUserSession(event);
  const userId = (session.user as { id: string }).id;

  let settings = await formatSettingsRepository.findByUserId(userId);

  if (!settings) {
    const config = useRuntimeConfig(event);
    const defaults = (config.public.formatSettings as FormatSettingsConfig).defaults;
    settings = await formatSettingsRepository.seedDefaults(userId, defaults);
  }

  return {
    ats: settings.ats,
    human: settings.human
  };
});
