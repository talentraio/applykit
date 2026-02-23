type EnumValueMap = Record<string, string>;

const enumValues = <TMap extends EnumValueMap>(
  valueMap: TMap
): readonly [TMap[keyof TMap], ...TMap[keyof TMap][]] => {
  return Object.values(valueMap) as unknown as readonly [TMap[keyof TMap], ...TMap[keyof TMap][]];
};

export const USER_ROLE_MAP = {
  SUPER_ADMIN: 'super_admin',
  FRIEND: 'friend',
  PROMO: 'promo',
  PUBLIC: 'public'
} as const;

export const USER_ROLE_VALUES = enumValues(USER_ROLE_MAP);

export const USER_STATUS_MAP = {
  INVITED: 'invited',
  ACTIVE: 'active',
  BLOCKED: 'blocked',
  DELETED: 'deleted'
} as const;

export const USER_STATUS_VALUES = enumValues(USER_STATUS_MAP);

export const WORK_FORMAT_MAP = {
  REMOTE: 'remote',
  HYBRID: 'hybrid',
  ONSITE: 'onsite'
} as const;

export const WORK_FORMAT_VALUES = enumValues(WORK_FORMAT_MAP);

export const SOURCE_FILE_TYPE_MAP = {
  DOCX: 'docx',
  PDF: 'pdf'
} as const;

export const SOURCE_FILE_TYPE_VALUES = enumValues(SOURCE_FILE_TYPE_MAP);

export const LLM_PROVIDER_MAP = {
  OPENAI: 'openai',
  GEMINI: 'gemini'
} as const;

export const LLM_PROVIDER_VALUES = enumValues(LLM_PROVIDER_MAP);

export const LLM_MODEL_STATUS_MAP = {
  ACTIVE: 'active',
  DISABLED: 'disabled',
  ARCHIVED: 'archived'
} as const;

export const LLM_MODEL_STATUS_VALUES = enumValues(LLM_MODEL_STATUS_MAP);

export const LLM_SCENARIO_KEY_MAP = {
  RESUME_PARSE: 'resume_parse',
  RESUME_ADAPTATION: 'resume_adaptation',
  RESUME_ADAPTATION_SCORING: 'resume_adaptation_scoring',
  RESUME_ADAPTATION_SCORING_DETAIL: 'resume_adaptation_scoring_detail',
  COVER_LETTER_GENERATION: 'cover_letter_generation'
} as const;

export const LLM_SCENARIO_KEY_VALUES = enumValues(LLM_SCENARIO_KEY_MAP);

export const LLM_RESPONSE_FORMAT_MAP = {
  TEXT: 'text',
  JSON: 'json'
} as const;

export const LLM_RESPONSE_FORMAT_VALUES = enumValues(LLM_RESPONSE_FORMAT_MAP);

export const LLM_REASONING_EFFORT_MAP = {
  AUTO: 'auto',
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high'
} as const;

export const LLM_REASONING_EFFORT_VALUES = enumValues(LLM_REASONING_EFFORT_MAP);

export const LLM_STRATEGY_KEY_MAP = {
  ECONOMY: 'economy',
  QUALITY: 'quality'
} as const;

export const LLM_STRATEGY_KEY_VALUES = enumValues(LLM_STRATEGY_KEY_MAP);

export const OPERATION_MAP = {
  PARSE: 'parse',
  GENERATE: 'generate',
  EXPORT: 'export'
} as const;

export const OPERATION_VALUES = enumValues(OPERATION_MAP);

export const USAGE_CONTEXT_MAP = {
  RESUME_BASE: 'resume_base',
  RESUME_ADAPTATION: 'resume_adaptation',
  RESUME_ADAPTATION_SCORING: 'resume_adaptation_scoring',
  RESUME_ADAPTATION_SCORING_DETAIL: 'resume_adaptation_scoring_detail',
  EXPORT: 'export'
} as const;

export const USAGE_CONTEXT_VALUES = enumValues(USAGE_CONTEXT_MAP);

export const PROVIDER_TYPE_MAP = {
  PLATFORM: 'platform'
} as const;

export const PROVIDER_TYPE_VALUES = enumValues(PROVIDER_TYPE_MAP);

export const EXPORT_FORMAT_MAP = {
  ATS: 'ats',
  HUMAN: 'human'
} as const;

export const EXPORT_FORMAT_VALUES = enumValues(EXPORT_FORMAT_MAP);

export const VACANCY_STATUS_MAP = {
  CREATED: 'created',
  GENERATED: 'generated',
  SCREENING: 'screening',
  REJECTED: 'rejected',
  INTERVIEW: 'interview',
  OFFER: 'offer'
} as const;

export const VACANCY_STATUS_VALUES = enumValues(VACANCY_STATUS_MAP);

export const COVER_LETTER_LOCALE_MAP = {
  EN: 'en',
  DA_DK: 'da-DK'
} as const;

export const COVER_LETTER_LOCALE_VALUES = enumValues(COVER_LETTER_LOCALE_MAP);

export const COVER_LETTER_TYPE_MAP = {
  LETTER: 'letter',
  MESSAGE: 'message'
} as const;

export const COVER_LETTER_TYPE_VALUES = enumValues(COVER_LETTER_TYPE_MAP);

export const COVER_LETTER_TONE_MAP = {
  PROFESSIONAL: 'professional',
  FRIENDLY: 'friendly',
  ENTHUSIASTIC: 'enthusiastic',
  DIRECT: 'direct'
} as const;

export const COVER_LETTER_TONE_VALUES = enumValues(COVER_LETTER_TONE_MAP);

export const COVER_LETTER_LENGTH_PRESET_MAP = {
  SHORT: 'short',
  STANDARD: 'standard',
  LONG: 'long',
  MIN_CHARS: 'min_chars',
  MAX_CHARS: 'max_chars'
} as const;

export const COVER_LETTER_LENGTH_PRESET_VALUES = enumValues(COVER_LETTER_LENGTH_PRESET_MAP);

export const COVER_LETTER_CHARACTER_LIMIT_DEFAULTS = {
  MIN: 100,
  MAX: 3500
} as const;

export const COVER_LETTER_CHARACTER_BUFFER_DEFAULTS = {
  TARGET_BUFFER_RATIO: 0.05,
  TARGET_BUFFER_SMALL_LIMIT_THRESHOLD: 120,
  TARGET_BUFFER_SMALL_MIN: 5,
  TARGET_BUFFER_SMALL_MAX: 8,
  TARGET_BUFFER_MIN: 10,
  TARGET_BUFFER_MAX: 30
} as const;

export const LANGUAGE_LEVEL_MAP = {
  NATIVE: 'Native',
  FLUENT: 'Fluent',
  ADVANCED: 'Advanced',
  INTERMEDIATE: 'Intermediate',
  BEGINNER: 'Beginner'
} as const;

export const LANGUAGE_LEVEL_VALUES = enumValues(LANGUAGE_LEVEL_MAP);

export const SUPPRESSION_REASON_MAP = {
  ACCOUNT_DELETED: 'account_deleted',
  ABUSE: 'abuse',
  CHARGEBACK: 'chargeback'
} as const;

export const SUPPRESSION_REASON_VALUES = enumValues(SUPPRESSION_REASON_MAP);

export const DEGREE_TYPE_MAP = {
  HIGH_SCHOOL: 'High School',
  ASSOCIATE: "Associate's Degree",
  BACHELOR: "Bachelor's Degree",
  MASTER: "Master's Degree",
  PHD: 'Ph.D.',
  MBA: 'MBA',
  MD: 'M.D.',
  JD: 'J.D.',
  CERTIFICATE: 'Certificate',
  DIPLOMA: 'Diploma',
  OTHER: 'Other'
} as const;

export const DEGREE_TYPE_VALUES = enumValues(DEGREE_TYPE_MAP);
