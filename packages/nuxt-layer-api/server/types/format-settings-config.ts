import type { ResumeFormatSettingsAts, ResumeFormatSettingsHuman } from '@int/schema';

/**
 * Shape of runtimeConfig.public.formatSettings
 * Needed because Nuxt infers nested runtimeConfig objects as unknown.
 */
export type FormatSettingsConfig = {
  defaults: {
    ats: ResumeFormatSettingsAts;
    human: ResumeFormatSettingsHuman;
  };
};
