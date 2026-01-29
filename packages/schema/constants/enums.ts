export const USER_ROLE_MAP = {
  SUPER_ADMIN: 'super_admin',
  FRIEND: 'friend',
  PUBLIC: 'public'
} as const;

export const USER_ROLE_VALUES = [
  USER_ROLE_MAP.SUPER_ADMIN,
  USER_ROLE_MAP.FRIEND,
  USER_ROLE_MAP.PUBLIC
] as const;

export const USER_STATUS_MAP = {
  INVITED: 'invited',
  ACTIVE: 'active',
  BLOCKED: 'blocked',
  DELETED: 'deleted'
} as const;

export const USER_STATUS_VALUES = [
  USER_STATUS_MAP.INVITED,
  USER_STATUS_MAP.ACTIVE,
  USER_STATUS_MAP.BLOCKED,
  USER_STATUS_MAP.DELETED
] as const;

export const WORK_FORMAT_MAP = {
  REMOTE: 'remote',
  HYBRID: 'hybrid',
  ONSITE: 'onsite'
} as const;

export const WORK_FORMAT_VALUES = [
  WORK_FORMAT_MAP.REMOTE,
  WORK_FORMAT_MAP.HYBRID,
  WORK_FORMAT_MAP.ONSITE
] as const;

export const SOURCE_FILE_TYPE_MAP = {
  DOCX: 'docx',
  PDF: 'pdf'
} as const;

export const SOURCE_FILE_TYPE_VALUES = [
  SOURCE_FILE_TYPE_MAP.DOCX,
  SOURCE_FILE_TYPE_MAP.PDF
] as const;

export const LLM_PROVIDER_MAP = {
  OPENAI: 'openai',
  GEMINI: 'gemini'
} as const;

export const LLM_PROVIDER_VALUES = [LLM_PROVIDER_MAP.OPENAI, LLM_PROVIDER_MAP.GEMINI] as const;

export const OPERATION_MAP = {
  PARSE: 'parse',
  GENERATE: 'generate',
  EXPORT: 'export'
} as const;

export const OPERATION_VALUES = [
  OPERATION_MAP.PARSE,
  OPERATION_MAP.GENERATE,
  OPERATION_MAP.EXPORT
] as const;

export const USAGE_CONTEXT_MAP = {
  RESUME_BASE: 'resume_base',
  RESUME_ADAPTATION: 'resume_adaptation',
  EXPORT: 'export'
} as const;

export const USAGE_CONTEXT_VALUES = [
  USAGE_CONTEXT_MAP.RESUME_BASE,
  USAGE_CONTEXT_MAP.RESUME_ADAPTATION,
  USAGE_CONTEXT_MAP.EXPORT
] as const;

export const PROVIDER_TYPE_MAP = {
  PLATFORM: 'platform',
  BYOK: 'byok'
} as const;

export const PROVIDER_TYPE_VALUES = [PROVIDER_TYPE_MAP.PLATFORM, PROVIDER_TYPE_MAP.BYOK] as const;

export const PLATFORM_PROVIDER_MAP = {
  OPENAI: 'openai',
  GEMINI_FLASH: 'gemini_flash'
} as const;

export const PLATFORM_PROVIDER_VALUES = [
  PLATFORM_PROVIDER_MAP.OPENAI,
  PLATFORM_PROVIDER_MAP.GEMINI_FLASH
] as const;

export const EXPORT_FORMAT_MAP = {
  ATS: 'ats',
  HUMAN: 'human'
} as const;

export const EXPORT_FORMAT_VALUES = [EXPORT_FORMAT_MAP.ATS, EXPORT_FORMAT_MAP.HUMAN] as const;

export const LANGUAGE_LEVEL_MAP = {
  NATIVE: 'Native',
  FLUENT: 'Fluent',
  ADVANCED: 'Advanced',
  INTERMEDIATE: 'Intermediate',
  BEGINNER: 'Beginner'
} as const;

export const LANGUAGE_LEVEL_VALUES = [
  LANGUAGE_LEVEL_MAP.NATIVE,
  LANGUAGE_LEVEL_MAP.FLUENT,
  LANGUAGE_LEVEL_MAP.ADVANCED,
  LANGUAGE_LEVEL_MAP.INTERMEDIATE,
  LANGUAGE_LEVEL_MAP.BEGINNER
] as const;

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

export const DEGREE_TYPE_VALUES = [
  DEGREE_TYPE_MAP.HIGH_SCHOOL,
  DEGREE_TYPE_MAP.ASSOCIATE,
  DEGREE_TYPE_MAP.BACHELOR,
  DEGREE_TYPE_MAP.MASTER,
  DEGREE_TYPE_MAP.PHD,
  DEGREE_TYPE_MAP.MBA,
  DEGREE_TYPE_MAP.MD,
  DEGREE_TYPE_MAP.JD,
  DEGREE_TYPE_MAP.CERTIFICATE,
  DEGREE_TYPE_MAP.DIPLOMA,
  DEGREE_TYPE_MAP.OTHER
] as const;
