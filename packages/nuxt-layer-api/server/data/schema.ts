import { pgTable, uuid, varchar, timestamp, pgEnum, text, integer, jsonb, decimal, unique, index } from 'drizzle-orm/pg-core'
import type { ResumeContent, LanguageEntry, PhoneEntry } from '@int/schema'

/**
 * Drizzle ORM Schema Definitions
 *
 * This schema matches the data model specification in:
 * /specs/001-foundation-mvp/data-model.md
 */

// ============================================================================
// Enums
// ============================================================================

export const roleEnum = pgEnum('role', ['super_admin', 'friend', 'public'])
export const workFormatEnum = pgEnum('work_format', ['remote', 'hybrid', 'onsite'])
export const sourceFileTypeEnum = pgEnum('source_file_type', ['docx', 'pdf'])
export const llmProviderEnum = pgEnum('llm_provider', ['openai', 'gemini'])
export const operationEnum = pgEnum('operation', ['parse', 'generate', 'export'])
export const providerTypeEnum = pgEnum('provider_type', ['platform', 'byok'])

// ============================================================================
// Tables
// ============================================================================

/**
 * Users table
 * Primary identity for authenticated users via Google OAuth
 */
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  googleId: varchar('google_id', { length: 255 }).notNull().unique(),
  role: roleEnum('role').notNull().default('public'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

/**
 * Profiles table
 * User profile with contact info and job preferences
 * One-to-one with users
 */
export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }).unique(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  country: varchar('country', { length: 2 }).notNull(), // ISO 3166-1 alpha-2
  searchRegion: varchar('search_region', { length: 100 }).notNull(),
  workFormat: workFormatEnum('work_format').notNull(),
  languages: jsonb('languages').$type<LanguageEntry[]>().notNull(),
  phones: jsonb('phones').$type<PhoneEntry[]>(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

/**
 * Resumes table
 * Base resume uploaded by user (DOCX/PDF parsed to JSON)
 */
export const resumes = pgTable('resumes', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  content: jsonb('content').$type<ResumeContent>().notNull(),
  sourceFileName: varchar('source_file_name', { length: 255 }).notNull(),
  sourceFileType: sourceFileTypeEnum('source_file_type').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('idx_resumes_user_id').on(table.userId),
  createdAtIdx: index('idx_resumes_created_at').on(table.createdAt),
}))

/**
 * Vacancies table
 * Job vacancies created by user for tailoring resumes
 */
export const vacancies = pgTable('vacancies', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  company: varchar('company', { length: 255 }).notNull(),
  jobPosition: varchar('job_position', { length: 255 }),
  description: text('description').notNull(),
  url: varchar('url', { length: 2048 }),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('idx_vacancies_user_id').on(table.userId),
  createdAtIdx: index('idx_vacancies_created_at').on(table.createdAt),
}))

/**
 * Generations table
 * Tailored resume versions generated for specific vacancies
 * Expires after 90 days
 */
export const generations = pgTable('generations', {
  id: uuid('id').primaryKey().defaultRandom(),
  vacancyId: uuid('vacancy_id').notNull().references(() => vacancies.id, { onDelete: 'cascade' }),
  resumeId: uuid('resume_id').notNull().references(() => resumes.id, { onDelete: 'cascade' }),
  content: jsonb('content').$type<ResumeContent>().notNull(),
  matchScoreBefore: integer('match_score_before').notNull(),
  matchScoreAfter: integer('match_score_after').notNull(),
  generatedAt: timestamp('generated_at').notNull().defaultNow(),
  expiresAt: timestamp('expires_at').notNull(),
}, (table) => ({
  vacancyIdIdx: index('idx_generations_vacancy_id').on(table.vacancyId),
  resumeIdIdx: index('idx_generations_resume_id').on(table.resumeId),
  generatedAtIdx: index('idx_generations_generated_at').on(table.generatedAt),
  expiresAtIdx: index('idx_generations_expires_at').on(table.expiresAt),
}))

/**
 * LLM Keys table
 * Metadata for user's BYOK (Bring Your Own Key) API keys
 * CRITICAL: Only stores last 4 characters as hint
 * Full keys stored in browser localStorage only
 */
export const llmKeys = pgTable('llm_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  provider: llmProviderEnum('provider').notNull(),
  keyHint: varchar('key_hint', { length: 4 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('idx_llm_keys_user_id').on(table.userId),
  userProviderUnique: unique('llm_keys_user_provider_unique').on(table.userId, table.provider),
}))

/**
 * Usage Logs table
 * Tracks all operations for rate limiting, billing, and analytics
 */
export const usageLogs = pgTable('usage_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  operation: operationEnum('operation').notNull(),
  providerType: providerTypeEnum('provider_type').notNull(),
  tokensUsed: integer('tokens_used'),
  cost: decimal('cost', { precision: 10, scale: 6 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index('idx_usage_logs_user_id').on(table.userId),
  createdAtIdx: index('idx_usage_logs_created_at').on(table.createdAt),
  userOperationDateIdx: index('idx_usage_logs_user_operation_date').on(table.userId, table.operation, table.createdAt),
}))

/**
 * System Config table
 * Key-value store for system-wide configuration
 * Values stored as JSONB for type flexibility
 */
export const systemConfigs = pgTable('system_configs', {
  key: varchar('key', { length: 100 }).primaryKey(),
  value: jsonb('value').notNull(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

// ============================================================================
// Type exports for use in repositories
// ============================================================================

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert

export type Profile = typeof profiles.$inferSelect
export type NewProfile = typeof profiles.$inferInsert

export type Resume = typeof resumes.$inferSelect
export type NewResume = typeof resumes.$inferInsert

export type Vacancy = typeof vacancies.$inferSelect
export type NewVacancy = typeof vacancies.$inferInsert

export type Generation = typeof generations.$inferSelect
export type NewGeneration = typeof generations.$inferInsert

export type LLMKey = typeof llmKeys.$inferSelect
export type NewLLMKey = typeof llmKeys.$inferInsert

export type UsageLog = typeof usageLogs.$inferSelect
export type NewUsageLog = typeof usageLogs.$inferInsert

export type SystemConfig = typeof systemConfigs.$inferSelect
export type NewSystemConfig = typeof systemConfigs.$inferInsert
