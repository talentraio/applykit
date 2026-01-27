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
