import type { ResumeFormatSettingsAts, ResumeFormatSettingsHuman } from '@int/schema';
import { ResumeFormatSettingsAtsSchema, ResumeFormatSettingsHumanSchema } from '@int/schema';

type RuntimeFormatSettingsDefaults = {
  ats?: unknown;
  human?: unknown;
};

function extractRuntimeDefaults(value: unknown): RuntimeFormatSettingsDefaults | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }

  if (!('defaults' in value)) {
    return null;
  }

  const defaults = value.defaults;
  if (typeof defaults !== 'object' || defaults === null) {
    return null;
  }

  return {
    ats: 'ats' in defaults ? defaults.ats : undefined,
    human: 'human' in defaults ? defaults.human : undefined
  };
}

function getSchemaDefaults(): { ats: ResumeFormatSettingsAts; human: ResumeFormatSettingsHuman } {
  return {
    ats: ResumeFormatSettingsAtsSchema.parse({ spacing: {}, localization: {} }),
    human: ResumeFormatSettingsHumanSchema.parse({ spacing: {}, localization: {} })
  };
}

/**
 * Returns format settings defaults from runtimeConfig.public.
 * Falls back to schema defaults if runtime config is unavailable or invalid.
 */
export function useFormatSettingsDefaults(): {
  ats: ResumeFormatSettingsAts;
  human: ResumeFormatSettingsHuman;
} {
  const runtimeConfig = useRuntimeConfig();
  const runtimeDefaults = extractRuntimeDefaults(runtimeConfig.public?.formatSettings);
  const schemaDefaults = getSchemaDefaults();

  const ats = ResumeFormatSettingsAtsSchema.safeParse(runtimeDefaults?.ats);
  const human = ResumeFormatSettingsHumanSchema.safeParse(runtimeDefaults?.human);

  return {
    ats: ats.success ? ats.data : schemaDefaults.ats,
    human: human.success ? human.data : schemaDefaults.human
  };
}
