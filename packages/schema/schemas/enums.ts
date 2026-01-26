import { z } from 'zod';
import {
  EXPORT_FORMAT_VALUES,
  LLM_PROVIDER_VALUES,
  OPERATION_VALUES,
  PLATFORM_PROVIDER_VALUES,
  PROVIDER_TYPE_VALUES,
  ROLE_VALUES,
  SOURCE_FILE_TYPE_VALUES,
  WORK_FORMAT_VALUES
} from '../constants/enums';

// User roles
export const RoleSchema = z.enum(ROLE_VALUES);
export type Role = z.infer<typeof RoleSchema>;

// Work format preferences
export const WorkFormatSchema = z.enum(WORK_FORMAT_VALUES);
export type WorkFormat = z.infer<typeof WorkFormatSchema>;

// Source file types for resume upload
export const SourceFileTypeSchema = z.enum(SOURCE_FILE_TYPE_VALUES);
export type SourceFileType = z.infer<typeof SourceFileTypeSchema>;

// LLM providers
export const LLMProviderSchema = z.enum(LLM_PROVIDER_VALUES);
export type LLMProvider = z.infer<typeof LLMProviderSchema>;

// Operations for usage tracking
export const OperationSchema = z.enum(OPERATION_VALUES);
export type Operation = z.infer<typeof OperationSchema>;

// Provider types for usage tracking
export const ProviderTypeSchema = z.enum(PROVIDER_TYPE_VALUES);
export type ProviderType = z.infer<typeof ProviderTypeSchema>;

// Platform providers (specific LLM models for platform use)
export const PlatformProviderSchema = z.enum(PLATFORM_PROVIDER_VALUES);
export type PlatformProvider = z.infer<typeof PlatformProviderSchema>;

// Export format types
export const ExportFormatSchema = z.enum(EXPORT_FORMAT_VALUES);
export type ExportFormat = z.infer<typeof ExportFormatSchema>;
