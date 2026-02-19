import type {
  GenerationScoreDetailPayload,
  LanguageEntry,
  PhoneEntry,
  ResumeContent,
  ResumeFormatSettingsAts,
  ResumeFormatSettingsHuman,
  ScoreBreakdown,
  VacancyListColumnVisibility
} from '@int/schema';
import {
  LLM_MODEL_STATUS_VALUES,
  LLM_PROVIDER_VALUES,
  LLM_REASONING_EFFORT_VALUES,
  LLM_RESPONSE_FORMAT_VALUES,
  LLM_SCENARIO_KEY_VALUES,
  LLM_STRATEGY_KEY_VALUES,
  OPERATION_VALUES,
  PROVIDER_TYPE_VALUES,
  SOURCE_FILE_TYPE_VALUES,
  SUPPRESSION_REASON_VALUES,
  USAGE_CONTEXT_VALUES,
  USER_ROLE_MAP,
  USER_ROLE_VALUES,
  USER_STATUS_VALUES,
  VACANCY_STATUS_VALUES,
  WORK_FORMAT_VALUES
} from '@int/schema';
import {
  boolean,
  decimal,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar
} from 'drizzle-orm/pg-core';

/**
 * Drizzle ORM Schema Definitions
 *
 * This schema matches the data model specification in:
 * /specs/001-foundation-mvp/data-model.md
 */

// ============================================================================
// Enums
// ============================================================================

export const roleEnum = pgEnum('role', USER_ROLE_VALUES);
export const workFormatEnum = pgEnum('work_format', WORK_FORMAT_VALUES);
export const sourceFileTypeEnum = pgEnum('source_file_type', SOURCE_FILE_TYPE_VALUES);
export const llmProviderEnum = pgEnum('llm_provider', LLM_PROVIDER_VALUES);
export const llmModelStatusEnum = pgEnum('llm_model_status', LLM_MODEL_STATUS_VALUES);
export const llmScenarioKeyEnum = pgEnum('llm_scenario_key', LLM_SCENARIO_KEY_VALUES);
export const llmStrategyKeyEnum = pgEnum('llm_strategy_key', LLM_STRATEGY_KEY_VALUES);
export const llmResponseFormatEnum = pgEnum('llm_response_format', LLM_RESPONSE_FORMAT_VALUES);
export const llmReasoningEffortEnum = pgEnum('llm_reasoning_effort', LLM_REASONING_EFFORT_VALUES);
export const operationEnum = pgEnum('operation', OPERATION_VALUES);
export const providerTypeEnum = pgEnum('provider_type', PROVIDER_TYPE_VALUES);
export const userStatusEnum = pgEnum('user_status', USER_STATUS_VALUES);
export const usageContextEnum = pgEnum('usage_context', USAGE_CONTEXT_VALUES);
export const vacancyStatusEnum = pgEnum('vacancy_status', VACANCY_STATUS_VALUES);
export const budgetPeriodEnum = pgEnum('budget_period', ['weekly', 'monthly']);
export const suppressionReasonEnum = pgEnum('suppression_reason', SUPPRESSION_REASON_VALUES);

// ============================================================================
// Tables
// ============================================================================

/**
 * Users table
 * Primary identity for authenticated users
 * Supports multiple auth methods: Google OAuth, LinkedIn OAuth, Email/Password
 */
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),

  // OAuth providers (nullable - user may use email/password instead)
  googleId: varchar('google_id', { length: 255 }).unique(),
  linkedInId: varchar('linkedin_id', { length: 255 }).unique(),

  // Email/password auth
  passwordHash: varchar('password_hash', { length: 255 }),
  emailVerified: boolean('email_verified').notNull().default(false),
  emailVerificationToken: varchar('email_verification_token', { length: 64 }),
  emailVerificationExpires: timestamp('email_verification_expires', { mode: 'date' }),

  // Password reset
  passwordResetToken: varchar('password_reset_token', { length: 64 }),
  passwordResetExpires: timestamp('password_reset_expires', { mode: 'date' }),

  // User settings
  role: roleEnum('role').notNull().default(USER_ROLE_MAP.PUBLIC),
  status: userStatusEnum('status').notNull().default('active'),

  // Default resume (FK added after resumes table definition, set via addForeignKeyConstraint)
  // Defined here for column, actual FK reference deferred to avoid circular dependency
  defaultResumeId: uuid('default_resume_id'),

  // Legal consent
  termsAcceptedAt: timestamp('terms_accepted_at', { mode: 'date' }),
  legalVersion: varchar('legal_version', { length: 20 }),

  // Timestamps
  lastLoginAt: timestamp('last_login_at', { mode: 'date' }),
  deletedAt: timestamp('deleted_at', { mode: 'date' }),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow()
});

/**
 * Role Settings table
 * LLM settings per role
 */
export const roleSettings = pgTable('role_settings', {
  role: roleEnum('role').primaryKey(),
  platformLlmEnabled: boolean('platform_llm_enabled').notNull().default(false),
  dailyBudgetCap: decimal('daily_budget_cap', { precision: 10, scale: 2 }).notNull().default('0'),
  weeklyBudgetCap: decimal('weekly_budget_cap', { precision: 10, scale: 2 }).notNull().default('0'),
  monthlyBudgetCap: decimal('monthly_budget_cap', { precision: 10, scale: 2 })
    .notNull()
    .default('0'),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow()
});

/**
 * Role Budget Windows table
 * Tracks per-user weekly/monthly budget reset windows
 */
export const roleBudgetWindows = pgTable(
  'role_budget_windows',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    role: roleEnum('role').notNull(),
    period: budgetPeriodEnum('period').notNull(),
    windowStartAt: timestamp('window_start_at', { mode: 'date' }).notNull(),
    nextResetAt: timestamp('next_reset_at', { mode: 'date' }).notNull(),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow()
  },
  table => ({
    userIdIdx: index('idx_role_budget_windows_user_id').on(table.userId),
    nextResetAtIdx: index('idx_role_budget_windows_next_reset_at').on(table.nextResetAt),
    uniqueUserRolePeriod: unique('unique_role_budget_windows_user_role_period').on(
      table.userId,
      table.role,
      table.period
    )
  })
);

/**
 * Profiles table
 * User profile with contact info and job preferences
 * One-to-one with users
 */
export const profiles = pgTable('profiles', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' })
    .unique(),
  firstName: varchar('first_name', { length: 100 }).notNull(),
  lastName: varchar('last_name', { length: 100 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  country: varchar('country', { length: 2 }).notNull(), // ISO 3166-1 alpha-2
  searchRegion: varchar('search_region', { length: 100 }).notNull(),
  workFormat: workFormatEnum('work_format').notNull(),
  languages: jsonb('languages').$type<LanguageEntry[]>().notNull(),
  phones: jsonb('phones').$type<PhoneEntry[]>(),
  photoUrl: varchar('photo_url', { length: 2048 }), // Profile photo for human resume
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow()
});

/**
 * User Format Settings table
 * @deprecated Will be removed after data migration to resume_format_settings (feature 014).
 * Kept temporarily so existing code compiles during incremental migration.
 */
export const userFormatSettings = pgTable('user_format_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' })
    .unique(),
  ats: jsonb('ats').$type<ResumeFormatSettingsAts>().notNull(),
  human: jsonb('human').$type<ResumeFormatSettingsHuman>().notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow()
});

/**
 * User Vacancy List Preferences table
 * Per-user vacancy list UI preferences (column visibility)
 * One-to-one with users
 */
export const userVacancyListPreferences = pgTable('user_vacancy_list_preferences', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' })
    .unique(),
  columnVisibility: jsonb('column_visibility')
    .$type<VacancyListColumnVisibility>()
    .notNull()
    .default({}),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow()
});

/**
 * Resumes table
 * Base resume uploaded by user (DOCX/PDF parsed to JSON)
 */
export const resumes = pgTable(
  'resumes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull().default(''),
    title: varchar('title', { length: 255 }).notNull(),
    content: jsonb('content').$type<ResumeContent>().notNull(),
    sourceFileName: varchar('source_file_name', { length: 255 }).notNull(),
    sourceFileType: sourceFileTypeEnum('source_file_type').notNull(),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow()
  },
  table => ({
    userIdIdx: index('idx_resumes_user_id').on(table.userId),
    createdAtIdx: index('idx_resumes_created_at').on(table.createdAt)
  })
);

/**
 * Resume Format Settings table
 * Per-resume formatting preferences (spacing, localization)
 * One-to-one with resumes (replaces user_format_settings)
 */
export const resumeFormatSettings = pgTable(
  'resume_format_settings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    resumeId: uuid('resume_id')
      .notNull()
      .references(() => resumes.id, { onDelete: 'cascade' })
      .unique(),
    ats: jsonb('ats').$type<ResumeFormatSettingsAts>().notNull(),
    human: jsonb('human').$type<ResumeFormatSettingsHuman>().notNull(),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow()
  },
  table => ({
    resumeIdIdx: index('idx_resume_format_settings_resume_id').on(table.resumeId)
  })
);

/**
 * Resume Versions table
 * Version history for a resume
 * Stores snapshots of resume content at different points in time
 */
export const resumeVersions = pgTable(
  'resume_versions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    resumeId: uuid('resume_id')
      .notNull()
      .references(() => resumes.id, { onDelete: 'cascade' }),
    content: jsonb('content').$type<ResumeContent>().notNull(),
    versionNumber: integer('version_number').notNull(),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow()
  },
  table => ({
    resumeIdIdx: index('idx_resume_versions_resume_id').on(table.resumeId),
    versionIdx: unique('unique_resume_version').on(table.resumeId, table.versionNumber)
  })
);

/**
 * Vacancies table
 * Job vacancies created by user for tailoring resumes
 */
export const vacancies = pgTable(
  'vacancies',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    company: varchar('company', { length: 255 }).notNull(),
    jobPosition: varchar('job_position', { length: 255 }),
    description: text('description').notNull(),
    url: varchar('url', { length: 2048 }),
    notes: text('notes'),
    canGenerateResume: boolean('can_generate_resume').notNull().default(true),
    status: vacancyStatusEnum('status').notNull().default('created'),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow()
  },
  table => ({
    userIdIdx: index('idx_vacancies_user_id').on(table.userId),
    createdAtIdx: index('idx_vacancies_created_at').on(table.createdAt)
  })
);

/**
 * Generations table
 * Tailored resume versions generated for specific vacancies
 * Expires after 90 days
 */
export const generations = pgTable(
  'generations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    vacancyId: uuid('vacancy_id')
      .notNull()
      .references(() => vacancies.id, { onDelete: 'cascade' }),
    resumeId: uuid('resume_id')
      .notNull()
      .references(() => resumes.id, { onDelete: 'cascade' }),
    content: jsonb('content').$type<ResumeContent>().notNull(),
    matchScoreBefore: integer('match_score_before').notNull(),
    matchScoreAfter: integer('match_score_after').notNull(),
    scoreBreakdown: jsonb('score_breakdown').$type<ScoreBreakdown>().notNull(),
    generatedAt: timestamp('generated_at', { mode: 'date' }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { mode: 'date' }).notNull(),
    scoreAlertDismissedAt: timestamp('score_alert_dismissed_at', { mode: 'date' })
  },
  table => ({
    vacancyIdIdx: index('idx_generations_vacancy_id').on(table.vacancyId),
    resumeIdIdx: index('idx_generations_resume_id').on(table.resumeId),
    generatedAtIdx: index('idx_generations_generated_at').on(table.generatedAt),
    expiresAtIdx: index('idx_generations_expires_at').on(table.expiresAt),
    scoreAlertDismissedAtIdx: index('idx_generations_score_alert_dismissed_at').on(
      table.scoreAlertDismissedAt
    )
  })
);

/**
 * Generation Score Details table
 * Stores on-demand detailed scoring payloads linked to a concrete generation.
 */
export const generationScoreDetails = pgTable(
  'generation_score_details',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    generationId: uuid('generation_id')
      .notNull()
      .references(() => generations.id, { onDelete: 'cascade' })
      .unique(),
    vacancyId: uuid('vacancy_id')
      .notNull()
      .references(() => vacancies.id, { onDelete: 'cascade' }),
    vacancyVersionMarker: varchar('vacancy_version_marker', { length: 128 }).notNull(),
    details: jsonb('details').$type<GenerationScoreDetailPayload>().notNull(),
    provider: llmProviderEnum('provider').notNull(),
    model: varchar('model', { length: 255 }).notNull(),
    strategyKey: llmStrategyKeyEnum('strategy_key'),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow()
  },
  table => ({
    vacancyIdIdx: index('idx_generation_score_details_vacancy_id').on(table.vacancyId),
    updatedAtIdx: index('idx_generation_score_details_updated_at').on(table.updatedAt)
  })
);

/**
 * LLM Models table
 * Source of truth for provider models, capabilities, and pricing metadata.
 */
export const llmModels = pgTable(
  'llm_models',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    provider: llmProviderEnum('provider').notNull(),
    modelKey: varchar('model_key', { length: 255 }).notNull(),
    displayName: varchar('display_name', { length: 255 }).notNull(),
    status: llmModelStatusEnum('status').notNull().default('active'),
    inputPricePer1mUsd: decimal('input_price_per_1m_usd', { precision: 10, scale: 6 }).notNull(),
    outputPricePer1mUsd: decimal('output_price_per_1m_usd', { precision: 10, scale: 6 }).notNull(),
    cachedInputPricePer1mUsd: decimal('cached_input_price_per_1m_usd', {
      precision: 10,
      scale: 6
    }),
    maxContextTokens: integer('max_context_tokens'),
    maxOutputTokens: integer('max_output_tokens'),
    supportsJson: boolean('supports_json').notNull().default(false),
    supportsTools: boolean('supports_tools').notNull().default(false),
    supportsStreaming: boolean('supports_streaming').notNull().default(false),
    notes: text('notes'),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow()
  },
  table => ({
    providerModelKeyUnique: unique('llm_models_provider_model_key_unique').on(
      table.provider,
      table.modelKey
    ),
    statusIdx: index('idx_llm_models_status').on(table.status),
    providerStatusIdx: index('idx_llm_models_provider_status').on(table.provider, table.status)
  })
);

/**
 * LLM Scenarios table
 * Fixed list of supported runtime scenarios.
 */
export const llmScenarios = pgTable('llm_scenarios', {
  key: llmScenarioKeyEnum('key').primaryKey(),
  label: varchar('label', { length: 255 }).notNull(),
  description: text('description'),
  enabled: boolean('enabled').notNull().default(true),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow()
});

/**
 * LLM Scenario Models table
 * Default model assignment per scenario.
 */
export const llmScenarioModels = pgTable(
  'llm_scenario_models',
  {
    scenarioKey: llmScenarioKeyEnum('scenario_key')
      .primaryKey()
      .references(() => llmScenarios.key, { onDelete: 'cascade' }),
    modelId: uuid('model_id')
      .notNull()
      .references(() => llmModels.id),
    retryModelId: uuid('retry_model_id').references(() => llmModels.id),
    temperature: decimal('temperature', { precision: 3, scale: 2 }),
    maxTokens: integer('max_tokens'),
    responseFormat: llmResponseFormatEnum('response_format'),
    reasoningEffort: llmReasoningEffortEnum('reasoning_effort'),
    strategyKey: llmStrategyKeyEnum('strategy_key'),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow()
  },
  table => ({
    modelIdx: index('idx_llm_scenario_models_model_id').on(table.modelId),
    retryModelIdx: index('idx_llm_scenario_models_retry_model_id').on(table.retryModelId)
  })
);

/**
 * LLM Role Scenario Overrides table
 * Optional role-level override per scenario.
 */
export const llmRoleScenarioOverrides = pgTable(
  'llm_role_scenario_overrides',
  {
    role: roleEnum('role').notNull(),
    scenarioKey: llmScenarioKeyEnum('scenario_key')
      .notNull()
      .references(() => llmScenarios.key, { onDelete: 'cascade' }),
    modelId: uuid('model_id')
      .notNull()
      .references(() => llmModels.id),
    retryModelId: uuid('retry_model_id').references(() => llmModels.id),
    temperature: decimal('temperature', { precision: 3, scale: 2 }),
    maxTokens: integer('max_tokens'),
    responseFormat: llmResponseFormatEnum('response_format'),
    reasoningEffort: llmReasoningEffortEnum('reasoning_effort'),
    strategyKey: llmStrategyKeyEnum('strategy_key'),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow()
  },
  table => ({
    roleScenarioUnique: unique('llm_role_scenario_overrides_role_scenario_unique').on(
      table.role,
      table.scenarioKey
    ),
    scenarioIdx: index('idx_llm_role_scenario_overrides_scenario_key').on(table.scenarioKey),
    modelIdx: index('idx_llm_role_scenario_overrides_model_id').on(table.modelId),
    retryModelIdx: index('idx_llm_role_scenario_overrides_retry_model_id').on(table.retryModelId)
  })
);

/**
 * LLM Role Scenario Enabled Overrides table
 * Optional role-level enabled flag override per scenario.
 */
export const llmRoleScenarioEnabledOverrides = pgTable(
  'llm_role_scenario_enabled_overrides',
  {
    role: roleEnum('role').notNull(),
    scenarioKey: llmScenarioKeyEnum('scenario_key')
      .notNull()
      .references(() => llmScenarios.key, { onDelete: 'cascade' }),
    enabled: boolean('enabled').notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow()
  },
  table => ({
    roleScenarioUnique: unique('llm_role_scenario_enabled_overrides_role_scenario_unique').on(
      table.role,
      table.scenarioKey
    ),
    scenarioIdx: index('idx_llm_role_scenario_enabled_overrides_scenario_key').on(table.scenarioKey)
  })
);

/**
 * Usage Logs table
 * Tracks all operations for rate limiting, billing, and analytics
 */
export const usageLogs = pgTable(
  'usage_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    operation: operationEnum('operation').notNull(),
    providerType: providerTypeEnum('provider_type').notNull(),
    usageContext: usageContextEnum('usage_context'),
    tokensUsed: integer('tokens_used'),
    cost: decimal('cost', { precision: 10, scale: 6 }),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow()
  },
  table => ({
    userIdIdx: index('idx_usage_logs_user_id').on(table.userId),
    createdAtIdx: index('idx_usage_logs_created_at').on(table.createdAt),
    userOperationDateIdx: index('idx_usage_logs_user_operation_date').on(
      table.userId,
      table.operation,
      table.createdAt
    )
  })
);

/**
 * System Config table
 * Key-value store for system-wide configuration
 * Values stored as JSONB for type flexibility
 */
export const systemConfigs = pgTable('system_configs', {
  key: varchar('key', { length: 100 }).primaryKey(),
  value: jsonb('value').notNull(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow()
});

/**
 * User Suppression table
 * Anti-abuse: stores HMAC fingerprints of emails from deleted/banned accounts.
 * Prevents re-signup with the same email within the TTL window.
 */
export const userSuppression = pgTable(
  'user_suppression',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    emailHmac: varchar('email_hmac', { length: 128 }).notNull().unique(),
    reason: suppressionReasonEnum('reason').notNull().default('account_deleted'),
    sourceUserId: uuid('source_user_id'), // Audit link, no FK (user is tombstoned)
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    expiresAt: timestamp('expires_at', { mode: 'date' }).notNull()
  },
  table => ({
    emailHmacIdx: index('idx_user_suppression_email_hmac').on(table.emailHmac),
    expiresAtIdx: index('idx_user_suppression_expires_at').on(table.expiresAt)
  })
);

// ============================================================================
// Type exports for use in repositories
// ============================================================================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type RoleSettings = typeof roleSettings.$inferSelect;
export type NewRoleSettings = typeof roleSettings.$inferInsert;

export type RoleBudgetWindow = typeof roleBudgetWindows.$inferSelect;
export type NewRoleBudgetWindow = typeof roleBudgetWindows.$inferInsert;

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;

/** @deprecated Use ResumeFormatSettingsRow instead (feature 014) */
export type UserFormatSettingsRow = typeof userFormatSettings.$inferSelect;
/** @deprecated Use NewResumeFormatSettingsRow instead (feature 014) */
export type NewUserFormatSettingsRow = typeof userFormatSettings.$inferInsert;

export type ResumeFormatSettingsRow = typeof resumeFormatSettings.$inferSelect;
export type NewResumeFormatSettingsRow = typeof resumeFormatSettings.$inferInsert;

export type UserVacancyListPreferencesRow = typeof userVacancyListPreferences.$inferSelect;
export type NewUserVacancyListPreferencesRow = typeof userVacancyListPreferences.$inferInsert;

export type Resume = typeof resumes.$inferSelect;
export type NewResume = typeof resumes.$inferInsert;

export type ResumeVersion = typeof resumeVersions.$inferSelect;
export type NewResumeVersion = typeof resumeVersions.$inferInsert;

export type Vacancy = typeof vacancies.$inferSelect;
export type NewVacancy = typeof vacancies.$inferInsert;

export type Generation = typeof generations.$inferSelect;
export type NewGeneration = typeof generations.$inferInsert;

export type GenerationScoreDetail = typeof generationScoreDetails.$inferSelect;
export type NewGenerationScoreDetail = typeof generationScoreDetails.$inferInsert;

export type LlmModel = typeof llmModels.$inferSelect;
export type NewLlmModel = typeof llmModels.$inferInsert;

export type LlmScenario = typeof llmScenarios.$inferSelect;
export type NewLlmScenario = typeof llmScenarios.$inferInsert;

export type LlmScenarioModel = typeof llmScenarioModels.$inferSelect;
export type NewLlmScenarioModel = typeof llmScenarioModels.$inferInsert;

export type LlmRoleScenarioOverride = typeof llmRoleScenarioOverrides.$inferSelect;
export type NewLlmRoleScenarioOverride = typeof llmRoleScenarioOverrides.$inferInsert;

export type LlmRoleScenarioEnabledOverride = typeof llmRoleScenarioEnabledOverrides.$inferSelect;
export type NewLlmRoleScenarioEnabledOverride = typeof llmRoleScenarioEnabledOverrides.$inferInsert;

export type UsageLog = typeof usageLogs.$inferSelect;
export type NewUsageLog = typeof usageLogs.$inferInsert;

export type SystemConfig = typeof systemConfigs.$inferSelect;
export type NewSystemConfig = typeof systemConfigs.$inferInsert;

export type UserSuppressionRow = typeof userSuppression.$inferSelect;
export type NewUserSuppressionRow = typeof userSuppression.$inferInsert;
