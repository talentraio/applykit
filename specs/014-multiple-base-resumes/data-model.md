# Data Model: Multiple Base Resumes

## Entity Relationship Overview

```
users 1──────* resumes
  │                │
  │ default_resume_id (FK, nullable, ON DELETE SET NULL)
  │                │
  └────────────────┘
                   │
                   1
                   │
        resume_format_settings (1:1 with resumes)

resumes 1──────* resume_versions  (unchanged)
resumes 1──────* generations      (unchanged)
```

## Modified Entities

### `users` (modified)

| Field | Type | Nullable | Default | Constraint | Notes |
|-------|------|----------|---------|------------|-------|
| ... existing fields ... | | | | | |
| `default_resume_id` | `uuid` | YES | `null` | FK → `resumes.id` ON DELETE SET NULL | NEW. Points to user's default resume. Null if no resumes exist. |

**Drizzle definition addition**:
```ts
defaultResumeId: uuid('default_resume_id').references(() => resumes.id, { onDelete: 'set null' }),
```

**Repository changes** (`user.ts`):
- Add `updateDefaultResumeId(userId: string, resumeId: string | null): Promise<void>`
- Add `getDefaultResumeId(userId: string): Promise<string | null>`
- Update `baseSelectFields` to include `defaultResumeId`
- Update `UserRow` type and `normalizeUserRow` to include `defaultResumeId`

### `resumes` (modified)

| Field | Type | Nullable | Default | Constraint | Notes |
|-------|------|----------|---------|------------|-------|
| ... existing fields ... | | | | | |
| `name` | `varchar(255)` | NO | `''` | — | NEW. User-editable resume name. Default generated: `dd.MM.yyyy` for first, `copy <source>` for duplicates. |

**Drizzle definition addition**:
```ts
name: varchar('name', { length: 255 }).notNull().default(''),
```

**Repository changes** (`resume.ts`):
- Add `updateName(id: string, userId: string, name: string): Promise<Resume | null>`
- Add `duplicate(sourceId: string, userId: string, name: string): Promise<Resume>`
- Add `findListByUserId(userId: string): Promise<ResumeListItem[]>` — lightweight query (id, name, createdAt, updatedAt only)
- Modify `create()` to accept `name` parameter
- Add `countByUserId()` — already exists, no change needed

## New Entities

### `resume_format_settings` (new)

Replaces `user_format_settings`. One-to-one relationship with `resumes`.

| Field | Type | Nullable | Default | Constraint | Notes |
|-------|------|----------|---------|------------|-------|
| `id` | `uuid` | NO | `gen_random_uuid()` | PK | |
| `resume_id` | `uuid` | NO | — | FK → `resumes.id` ON DELETE CASCADE, UNIQUE | One settings row per resume |
| `ats` | `jsonb` | NO | — | — | `ResumeFormatSettingsAts` JSON |
| `human` | `jsonb` | NO | — | — | `ResumeFormatSettingsHuman` JSON |
| `created_at` | `timestamptz` | NO | `now()` | — | |
| `updated_at` | `timestamptz` | NO | `now()` | — | |

**Drizzle definition**:
```ts
export const resumeFormatSettings = pgTable('resume_format_settings', {
  id: uuid('id').primaryKey().defaultRandom(),
  resumeId: uuid('resume_id')
    .notNull()
    .references(() => resumes.id, { onDelete: 'cascade' })
    .unique(),
  ats: jsonb('ats').$type<ResumeFormatSettingsAts>().notNull(),
  human: jsonb('human').$type<ResumeFormatSettingsHuman>().notNull(),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow()
});
```

**Repository** (`resume-format-settings.ts`):
- `findByResumeId(resumeId: string): Promise<ResumeFormatSettingsRow | null>`
- `create(resumeId: string, settings: { ats, human }): Promise<ResumeFormatSettingsRow>`
- `update(resumeId: string, settings: { ats?, human? }): Promise<ResumeFormatSettingsRow | null>`
- `seedDefaults(resumeId: string, defaults: { ats, human }): Promise<ResumeFormatSettingsRow>`
- `duplicateFrom(sourceResumeId: string, targetResumeId: string): Promise<ResumeFormatSettingsRow>`

## Removed Entities

### `user_format_settings` (dropped)

- Table dropped after data migration
- Data copied to `resume_format_settings` per-resume
- Repository `format-settings.ts` removed
- All `/api/user/format-settings` endpoints removed

## Zod Schemas (in `@int/schema`)

### Extended schemas

```ts
// Resume entity — add name and isDefault
export const resumeSchema = existingResumeSchema.extend({
  name: z.string().min(1).max(255),
  isDefault: z.boolean(),
});

// Resume list item (lightweight, for selectors/dropdowns)
export const resumeListItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  isDefault: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});
export type ResumeListItem = z.infer<typeof resumeListItemSchema>;
```

### New request schemas

```ts
// Set default resume
export const setDefaultResumeRequestSchema = z.object({
  resumeId: z.string().uuid(),
});

// Update resume name
export const updateResumeNameSchema = z.object({
  name: z.string().min(1).max(255),
});
```

### Computed field: `isDefault`

Not stored in DB. Computed at API layer:
```ts
const isDefault = resume.id === user.defaultResumeId;
// If user.defaultResumeId is null, fallback: most recent resume is default
```

## Migration Plan

### Migration SQL (single migration file)

```sql
-- Step 1: Add name column to resumes
ALTER TABLE resumes ADD COLUMN name varchar(255) NOT NULL DEFAULT '';

-- Step 2: Backfill name from created_at
UPDATE resumes SET name = TO_CHAR(created_at, 'DD.MM.YYYY');

-- Step 3: Add default_resume_id to users
ALTER TABLE users ADD COLUMN default_resume_id uuid REFERENCES resumes(id) ON DELETE SET NULL;

-- Step 4: Set default_resume_id to most recent resume for each user
UPDATE users u SET default_resume_id = (
  SELECT r.id FROM resumes r
  WHERE r.user_id = u.id
  ORDER BY r.created_at DESC
  LIMIT 1
);

-- Step 5: Create resume_format_settings table
CREATE TABLE resume_format_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resume_id uuid NOT NULL REFERENCES resumes(id) ON DELETE CASCADE UNIQUE,
  ats jsonb NOT NULL,
  human jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_resume_format_settings_resume_id ON resume_format_settings(resume_id);

-- Step 6: Copy user_format_settings to resume_format_settings (one per resume)
INSERT INTO resume_format_settings (resume_id, ats, human)
SELECT r.id, ufs.ats, ufs.human
FROM resumes r
JOIN user_format_settings ufs ON ufs.user_id = r.user_id;

-- Step 7: Seed defaults for resumes without user_format_settings
-- (users who never visited settings get defaults)
-- This is handled at application level via seedDefaults()

-- Step 8: Drop user_format_settings table
DROP TABLE user_format_settings;
```

### Rollback considerations

- `user_format_settings` data is preserved in `resume_format_settings` — no data loss
- If rollback needed: recreate `user_format_settings` from `resume_format_settings` (aggregate per user from their default resume's settings)
- `name` column can be dropped without data loss
- `default_resume_id` column can be dropped; system falls back to most-recent logic

## Validation Rules

| Entity | Field | Rule |
|--------|-------|------|
| `resumes` | `name` | 1-255 chars, non-empty |
| `users` | `default_resume_id` | Must reference existing resume owned by user (or null) |
| resume count | per user | Max 10, server-enforced on create/duplicate |
| `resume_format_settings` | `ats` | Must conform to `ResumeFormatSettingsAts` schema |
| `resume_format_settings` | `human` | Must conform to `ResumeFormatSettingsHuman` schema |

## State Transitions

### Resume lifecycle

```
[no resumes] --(upload/create)--> [1 resume, is default]
                                       |
                              (duplicate)   (clear & create new)
                                       |         |
                                  [N resumes] [same resume, new content]
                                       |
                              (delete non-default)
                                       |
                                  [N-1 resumes]
```

### Default resume transitions

```
[null] --(first resume created)--> [resume_1]
[resume_1] --(make default resume_2)--> [resume_2]
[resume_2] --(resume_2 deleted via DB)--> [null] --(fallback)--> [most recent]
```
