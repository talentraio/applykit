# Data Model: Foundation MVP

> **Feature**: 001-foundation-mvp
> **Date**: 2026-01-22
> **ORM**: Drizzle
> **Database**: PostgreSQL (SQLite for local dev)

This document defines the database schema and domain types for the Foundation MVP.

---

## Architecture Notes

1. **Schema Location**: `packages/nuxt-layer-schema/` (`@int/schema`)
   - Zod schemas for validation
   - Inferred TypeScript types
   - ORM-independent (domain types)

2. **ORM Location**: `packages/nuxt-layer-api/server/data/`
   - Drizzle schema definitions
   - Repository functions
   - ORM types stay here (not exported)

3. **Type Flow**:
   ```
   Drizzle Schema → Repository → Domain Type (@int/schema) → API Response
   ```

---

## Entity Relationship Diagram

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│    User     │──1:1──│   Profile   │       │  SystemConfig│
└─────────────┘       └─────────────┘       └─────────────┘
       │
       │ 1:N
       ▼
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│   Resume    │       │   Vacancy   │──1:N──│ Generation  │
└─────────────┘       └─────────────┘       └─────────────┘
       │                     │                     │
       │                     │                     │
       └─────────────────────┴─────────────────────┘
                             │
                             ▼
                      ┌─────────────┐
                      │  UsageLog   │
                      └─────────────┘

┌─────────────┐
│   LLMKey    │ (metadata only; actual key in browser)
└─────────────┘
```

---

## Entities

### 1. User

Primary identity for authenticated users.

#### Drizzle Schema

```typescript
// packages/nuxt-layer-api/server/data/schema.ts
import { pgEnum, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core'

export const roleEnum = pgEnum('role', ['super_admin', 'friend', 'public'])

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  googleId: varchar('google_id', { length: 255 }).notNull().unique(),
  role: roleEnum('role').notNull().default('public'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
})
```

#### Zod Schema

```typescript
// packages/nuxt-layer-schema/schemas/user.ts
import { z } from 'zod'

export const RoleSchema = z.enum(['super_admin', 'friend', 'public'])
export type Role = z.infer<typeof RoleSchema>

export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  googleId: z.string(),
  role: RoleSchema,
  createdAt: z.date(),
  updatedAt: z.date()
})

export type User = z.infer<typeof UserSchema>

// For API responses (without sensitive fields)
export const UserPublicSchema = UserSchema.omit({ googleId: true })
export type UserPublic = z.infer<typeof UserPublicSchema>
```

#### Indexes

- `email` (unique)
- `googleId` (unique)

---

### 2. Profile

User profile with contact and job preferences.

#### Drizzle Schema

```typescript
export const workFormatEnum = pgEnum('work_format', ['remote', 'hybrid', 'onsite'])

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
  languages: jsonb('languages').notNull().$type<LanguageEntry[]>(),
  phones: jsonb('phones').$type<PhoneEntry[]>(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
})
```

#### Zod Schema

```typescript
// packages/nuxt-layer-schema/schemas/profile.ts
import { z } from 'zod'

export const WorkFormatSchema = z.enum(['remote', 'hybrid', 'onsite'])
export type WorkFormat = z.infer<typeof WorkFormatSchema>

export const LanguageEntrySchema = z.object({
  language: z.string().min(1),
  level: z.string().min(1) // e.g., "Native", "Fluent", "Intermediate", "Basic"
})
export type LanguageEntry = z.infer<typeof LanguageEntrySchema>

export const PhoneEntrySchema = z.object({
  number: z.string().min(1),
  label: z.string().optional() // e.g., "Mobile", "Work"
})
export type PhoneEntry = z.infer<typeof PhoneEntrySchema>

export const ProfileSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email(),
  country: z.string().length(2), // ISO 3166-1 alpha-2
  searchRegion: z.string().min(1).max(100),
  workFormat: WorkFormatSchema,
  languages: z.array(LanguageEntrySchema).min(1),
  phones: z.array(PhoneEntrySchema).optional(),
  createdAt: z.date(),
  updatedAt: z.date()
})

export type Profile = z.infer<typeof ProfileSchema>

// For create/update (omit auto-generated fields)
export const ProfileInputSchema = ProfileSchema.omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true
})
export type ProfileInput = z.infer<typeof ProfileInputSchema>

// Profile completeness check
export function isProfileComplete(profile: Profile | null): boolean {
  if (!profile) return false
  return (
    profile.firstName.length > 0 &&
    profile.lastName.length > 0 &&
    profile.email.length > 0 &&
    profile.country.length === 2 &&
    profile.searchRegion.length > 0 &&
    profile.languages.length > 0
  )
}
```

#### Indexes

- `userId` (unique, FK)

---

### 3. Resume

Base resume uploaded by user.

#### Drizzle Schema

```typescript
export const sourceFileTypeEnum = pgEnum('source_file_type', ['docx', 'pdf'])

export const resumes = pgTable('resumes', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  content: jsonb('content').notNull().$type<ResumeContent>(),
  sourceFileName: varchar('source_file_name', { length: 255 }).notNull(),
  sourceFileType: sourceFileTypeEnum('source_file_type').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
})
```

#### Zod Schema (ResumeContent)

```typescript
// packages/nuxt-layer-schema/schemas/resume.ts
import { z } from 'zod'

// Date format: YYYY-MM
const DateMonthSchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, 'Must be YYYY-MM format')

export const PersonalInfoSchema = z.object({
  fullName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  location: z.string().optional(),
  linkedin: z.string().url().optional(),
  website: z.string().url().optional()
})

export const ExperienceLinkSchema = z.object({
  name: z.string().min(1),
  link: z.string().url()
})

export const ExperienceEntrySchema = z.object({
  company: z.string().min(1),
  position: z.string().min(1),
  startDate: DateMonthSchema,
  endDate: DateMonthSchema.nullable().optional(), // null = "present"
  description: z.string(),
  projects: z.array(z.string()).optional(),
  links: z.array(ExperienceLinkSchema).optional()
})

export const EducationEntrySchema = z.object({
  institution: z.string().min(1),
  degree: z.string().min(1),
  field: z.string().optional(),
  startDate: DateMonthSchema,
  endDate: DateMonthSchema.optional()
})

export const CertificationEntrySchema = z.object({
  name: z.string().min(1),
  issuer: z.string().optional(),
  date: DateMonthSchema.optional()
})

export const ResumeLanguageSchema = z.object({
  language: z.string().min(1),
  level: z.string().min(1)
})

export const ResumeContentSchema = z.object({
  personalInfo: PersonalInfoSchema,
  summary: z.string().optional(),
  experience: z.array(ExperienceEntrySchema),
  education: z.array(EducationEntrySchema),
  skills: z.array(z.string()),
  certifications: z.array(CertificationEntrySchema).optional(),
  languages: z.array(ResumeLanguageSchema).optional()
})

export type ResumeContent = z.infer<typeof ResumeContentSchema>

export const SourceFileTypeSchema = z.enum(['docx', 'pdf'])
export type SourceFileType = z.infer<typeof SourceFileTypeSchema>

export const ResumeSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  title: z.string().min(1).max(255),
  content: ResumeContentSchema,
  sourceFileName: z.string().min(1).max(255),
  sourceFileType: SourceFileTypeSchema,
  createdAt: z.date(),
  updatedAt: z.date()
})

export type Resume = z.infer<typeof ResumeSchema>
```

#### Indexes

- `userId` (FK)
- `createdAt` (for sorting)

---

### 4. Vacancy

Job vacancy created by user.

#### Drizzle Schema

```typescript
export const vacancies = pgTable('vacancies', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  company: varchar('company', { length: 255 }).notNull(),
  jobPosition: varchar('job_position', { length: 255 }),
  description: text('description').notNull(),
  url: varchar('url', { length: 2048 }),
  notes: text('notes'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
})
```

#### Zod Schema

```typescript
// packages/nuxt-layer-schema/schemas/vacancy.ts
import { z } from 'zod'

export const VacancySchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  company: z.string().min(1).max(255),
  jobPosition: z.string().max(255).nullable().optional(),
  description: z.string().min(1),
  url: z.string().url().max(2048).nullable().optional(),
  notes: z.string().nullable().optional(),
  createdAt: z.date(),
  updatedAt: z.date()
})

export type Vacancy = z.infer<typeof VacancySchema>

export const VacancyInputSchema = VacancySchema.omit({
  id: true,
  userId: true,
  createdAt: true,
  updatedAt: true
})

export type VacancyInput = z.infer<typeof VacancyInputSchema>

// Display title helper
export function getVacancyTitle(vacancy: Vacancy): string {
  return vacancy.jobPosition ? `${vacancy.company} (${vacancy.jobPosition})` : vacancy.company
}
```

#### Indexes

- `userId` (FK)
- `createdAt` (for sorting)

---

### 5. Generation

Tailored resume version generated for a vacancy.

#### Drizzle Schema

```typescript
export const generations = pgTable('generations', {
  id: uuid('id').primaryKey().defaultRandom(),
  vacancyId: uuid('vacancy_id')
    .notNull()
    .references(() => vacancies.id, { onDelete: 'cascade' }),
  resumeId: uuid('resume_id')
    .notNull()
    .references(() => resumes.id, { onDelete: 'cascade' }),
  content: jsonb('content').notNull().$type<ResumeContent>(),
  matchScoreBefore: integer('match_score_before').notNull(),
  matchScoreAfter: integer('match_score_after').notNull(),
  generatedAt: timestamp('generated_at').notNull().defaultNow(),
  expiresAt: timestamp('expires_at').notNull() // 90 days from generation
})
```

#### Zod Schema

```typescript
// packages/nuxt-layer-schema/schemas/generation.ts
import { z } from 'zod'
import { ResumeContentSchema } from './resume'

export const GenerationSchema = z.object({
  id: z.string().uuid(),
  vacancyId: z.string().uuid(),
  resumeId: z.string().uuid(),
  content: ResumeContentSchema,
  matchScoreBefore: z.number().int().min(0).max(100),
  matchScoreAfter: z.number().int().min(0).max(100),
  generatedAt: z.date(),
  expiresAt: z.date()
})

export type Generation = z.infer<typeof GenerationSchema>

// Days until expiration helper
export function getDaysUntilExpiration(generation: Generation): number {
  const now = new Date()
  const diff = generation.expiresAt.getTime() - now.getTime()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}
```

#### Indexes

- `vacancyId` (FK)
- `resumeId` (FK)
- `generatedAt` (for getting latest)
- `expiresAt` (for cleanup task)

---

### 6. LLMKey

Metadata for user's BYOK keys (actual key stored in browser).

#### Drizzle Schema

```typescript
export const llmProviderEnum = pgEnum('llm_provider', ['openai', 'gemini'])

export const llmKeys = pgTable('llm_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  provider: llmProviderEnum('provider').notNull(),
  keyHint: varchar('key_hint', { length: 4 }).notNull(), // last 4 chars
  createdAt: timestamp('created_at').notNull().defaultNow()
})
```

#### Zod Schema

```typescript
// packages/nuxt-layer-schema/schemas/llm-key.ts
import { z } from 'zod'

export const LLMProviderSchema = z.enum(['openai', 'gemini'])
export type LLMProvider = z.infer<typeof LLMProviderSchema>

export const LLMKeySchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  provider: LLMProviderSchema,
  keyHint: z.string().length(4),
  createdAt: z.date()
})

export type LLMKey = z.infer<typeof LLMKeySchema>
```

#### Indexes

- `userId` (FK)
- `(userId, provider)` (unique - one key per provider per user)

---

### 7. UsageLog

Tracks operations for rate limiting and billing.

#### Drizzle Schema

```typescript
export const operationEnum = pgEnum('operation', ['parse', 'generate', 'export'])
export const providerTypeEnum = pgEnum('provider_type', ['platform', 'byok'])

export const usageLogs = pgTable('usage_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  operation: operationEnum('operation').notNull(),
  providerType: providerTypeEnum('provider_type').notNull(),
  tokensUsed: integer('tokens_used'),
  cost: decimal('cost', { precision: 10, scale: 6 }),
  createdAt: timestamp('created_at').notNull().defaultNow()
})
```

#### Zod Schema

```typescript
// packages/nuxt-layer-schema/schemas/usage.ts
import { z } from 'zod'

export const OperationSchema = z.enum(['parse', 'generate', 'export'])
export type Operation = z.infer<typeof OperationSchema>

export const ProviderTypeSchema = z.enum(['platform', 'byok'])
export type ProviderType = z.infer<typeof ProviderTypeSchema>

export const UsageLogSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  operation: OperationSchema,
  providerType: ProviderTypeSchema,
  tokensUsed: z.number().int().nullable().optional(),
  cost: z.number().nullable().optional(),
  createdAt: z.date()
})

export type UsageLog = z.infer<typeof UsageLogSchema>
```

#### Indexes

- `userId` (FK)
- `createdAt` (for daily aggregation)
- `(userId, operation, createdAt)` (for limit checking)

---

### 8. SystemConfig

Key-value store for system-wide configuration.

#### Drizzle Schema

```typescript
export const systemConfigs = pgTable('system_configs', {
  key: varchar('key', { length: 100 }).primaryKey(),
  value: jsonb('value').notNull(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
})
```

#### Zod Schema

```typescript
// packages/nuxt-layer-schema/schemas/system.ts
import { z } from 'zod'

export const SystemConfigKeySchema = z.enum([
  'platform_llm_enabled',
  'byok_enabled',
  'platform_provider',
  'global_budget_cap',
  'global_budget_used'
])

export type SystemConfigKey = z.infer<typeof SystemConfigKeySchema>

export const PlatformProviderSchema = z.enum(['openai', 'gemini_flash'])
export type PlatformProvider = z.infer<typeof PlatformProviderSchema>

// Type-safe config values
export const SystemConfigValues = {
  platform_llm_enabled: z.boolean(),
  byok_enabled: z.boolean(),
  platform_provider: PlatformProviderSchema,
  global_budget_cap: z.number().positive(),
  global_budget_used: z.number().min(0)
} as const

// Default values
export const SystemConfigDefaults: Record<SystemConfigKey, unknown> = {
  platform_llm_enabled: true,
  byok_enabled: true,
  platform_provider: 'openai',
  global_budget_cap: 100, // $100/month
  global_budget_used: 0
}
```

#### Notes

- Key-value store for flexibility
- Typed access via helper functions
- Cached in memory, invalidated on update

---

## Migrations

### Initial Migration (001_init.sql)

```sql
-- Enums
CREATE TYPE role AS ENUM ('super_admin', 'friend', 'public');
CREATE TYPE work_format AS ENUM ('remote', 'hybrid', 'onsite');
CREATE TYPE source_file_type AS ENUM ('docx', 'pdf');
CREATE TYPE llm_provider AS ENUM ('openai', 'gemini');
CREATE TYPE operation AS ENUM ('parse', 'generate', 'export');
CREATE TYPE provider_type AS ENUM ('platform', 'byok');

-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL UNIQUE,
  google_id VARCHAR(255) NOT NULL UNIQUE,
  role role NOT NULL DEFAULT 'public',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Profiles
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  country VARCHAR(2) NOT NULL,
  search_region VARCHAR(100) NOT NULL,
  work_format work_format NOT NULL,
  languages JSONB NOT NULL,
  phones JSONB,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Resumes
CREATE TABLE resumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content JSONB NOT NULL,
  source_file_name VARCHAR(255) NOT NULL,
  source_file_type source_file_type NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_resumes_user_id ON resumes(user_id);
CREATE INDEX idx_resumes_created_at ON resumes(created_at);

-- Vacancies
CREATE TABLE vacancies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  company VARCHAR(255) NOT NULL,
  job_position VARCHAR(255),
  description TEXT NOT NULL,
  url VARCHAR(2048),
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_vacancies_user_id ON vacancies(user_id);
CREATE INDEX idx_vacancies_created_at ON vacancies(created_at);

-- Generations
CREATE TABLE generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vacancy_id UUID NOT NULL REFERENCES vacancies(id) ON DELETE CASCADE,
  resume_id UUID NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  content JSONB NOT NULL,
  match_score_before INTEGER NOT NULL,
  match_score_after INTEGER NOT NULL,
  generated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL
);
CREATE INDEX idx_generations_vacancy_id ON generations(vacancy_id);
CREATE INDEX idx_generations_resume_id ON generations(resume_id);
CREATE INDEX idx_generations_generated_at ON generations(generated_at);
CREATE INDEX idx_generations_expires_at ON generations(expires_at);

-- LLM Keys
CREATE TABLE llm_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider llm_provider NOT NULL,
  key_hint VARCHAR(4) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, provider)
);
CREATE INDEX idx_llm_keys_user_id ON llm_keys(user_id);

-- Usage Logs
CREATE TABLE usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  operation operation NOT NULL,
  provider_type provider_type NOT NULL,
  tokens_used INTEGER,
  cost DECIMAL(10, 6),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_usage_logs_user_id ON usage_logs(user_id);
CREATE INDEX idx_usage_logs_created_at ON usage_logs(created_at);
CREATE INDEX idx_usage_logs_user_operation_date ON usage_logs(user_id, operation, created_at);

-- System Config
CREATE TABLE system_configs (
  key VARCHAR(100) PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Initial system config
INSERT INTO system_configs (key, value) VALUES
  ('platform_llm_enabled', 'true'),
  ('byok_enabled', 'true'),
  ('platform_provider', '"openai"'),
  ('global_budget_cap', '100'),
  ('global_budget_used', '0');
```

---

## Repository Interface

Example repository pattern for User entity:

```typescript
import type { User, UserPublic } from '@int/schema'
// packages/nuxt-layer-api/server/data/repositories/user.ts
import { eq } from 'drizzle-orm'
import { db } from '../db'
import { users } from '../schema'

export const userRepository = {
  async findById(id: string): Promise<User | null> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1)
    return result[0] ?? null
  },

  async findByEmail(email: string): Promise<User | null> {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1)
    return result[0] ?? null
  },

  async findByGoogleId(googleId: string): Promise<User | null> {
    const result = await db.select().from(users).where(eq(users.googleId, googleId)).limit(1)
    return result[0] ?? null
  },

  async create(data: { email: string; googleId: string }): Promise<User> {
    const result = await db.insert(users).values(data).returning()
    return result[0]
  },

  async updateRole(id: string, role: Role): Promise<User | null> {
    const result = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning()
    return result[0] ?? null
  }
}
```

This pattern is applied to all entities. Repositories return domain types from `@int/schema`, keeping ORM details internal.
