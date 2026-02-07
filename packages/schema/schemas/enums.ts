import { z } from 'zod';
import {
  EXPORT_FORMAT_MAP,
  LLM_PROVIDER_MAP,
  OPERATION_MAP,
  PLATFORM_PROVIDER_MAP,
  PROVIDER_TYPE_MAP,
  SOURCE_FILE_TYPE_MAP,
  USAGE_CONTEXT_MAP,
  USER_ROLE_MAP,
  USER_STATUS_MAP,
  VACANCY_STATUS_MAP,
  WORK_FORMAT_MAP
} from '../constants/enums';

// User roles
export const RoleSchema = z.nativeEnum(USER_ROLE_MAP);
export type Role = z.infer<typeof RoleSchema>;

// User status
export const UserStatusSchema = z.nativeEnum(USER_STATUS_MAP);
export type UserStatus = z.infer<typeof UserStatusSchema>;

// Work format preferences
export const WorkFormatSchema = z.nativeEnum(WORK_FORMAT_MAP);
export type WorkFormat = z.infer<typeof WorkFormatSchema>;

// Source file types for resume upload
export const SourceFileTypeSchema = z.nativeEnum(SOURCE_FILE_TYPE_MAP);
export type SourceFileType = z.infer<typeof SourceFileTypeSchema>;

// LLM providers
export const LLMProviderSchema = z.nativeEnum(LLM_PROVIDER_MAP);
export type LLMProvider = z.infer<typeof LLMProviderSchema>;

// Operations for usage tracking
export const OperationSchema = z.nativeEnum(OPERATION_MAP);
export type Operation = z.infer<typeof OperationSchema>;

// Usage context for tracking operations
export const UsageContextSchema = z.nativeEnum(USAGE_CONTEXT_MAP);
export type UsageContext = z.infer<typeof UsageContextSchema>;

// Provider types for usage tracking
export const ProviderTypeSchema = z.nativeEnum(PROVIDER_TYPE_MAP);
export type ProviderType = z.infer<typeof ProviderTypeSchema>;

// Platform providers (specific LLM models for platform use)
export const PlatformProviderSchema = z.nativeEnum(PLATFORM_PROVIDER_MAP);
export type PlatformProvider = z.infer<typeof PlatformProviderSchema>;

// Export format types
export const ExportFormatSchema = z.nativeEnum(EXPORT_FORMAT_MAP);
export type ExportFormat = z.infer<typeof ExportFormatSchema>;

// Vacancy application status
export const VacancyStatusSchema = z.nativeEnum(VACANCY_STATUS_MAP);
export type VacancyStatus = z.infer<typeof VacancyStatusSchema>;
