import { z } from 'zod';

// User roles
export const RoleSchema = z.enum(['super_admin', 'friend', 'public']);
export type Role = z.infer<typeof RoleSchema>;

// Work format preferences
export const WorkFormatSchema = z.enum(['remote', 'hybrid', 'onsite']);
export type WorkFormat = z.infer<typeof WorkFormatSchema>;

// Source file types for resume upload
export const SourceFileTypeSchema = z.enum(['docx', 'pdf']);
export type SourceFileType = z.infer<typeof SourceFileTypeSchema>;

// LLM providers
export const LLMProviderSchema = z.enum(['openai', 'gemini']);
export type LLMProvider = z.infer<typeof LLMProviderSchema>;

// Operations for usage tracking
export const OperationSchema = z.enum(['parse', 'generate', 'export']);
export type Operation = z.infer<typeof OperationSchema>;

// Provider types for usage tracking
export const ProviderTypeSchema = z.enum(['platform', 'byok']);
export type ProviderType = z.infer<typeof ProviderTypeSchema>;

// Platform providers (specific LLM models for platform use)
export const PlatformProviderSchema = z.enum(['openai', 'gemini_flash']);
export type PlatformProvider = z.infer<typeof PlatformProviderSchema>;
