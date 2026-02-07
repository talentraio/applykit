# Data Model: 006 — Extract Resume Format Settings

## Entities

### SpacingSettings (value object)

Shared spacing/typography values used by both ATS and Human format types.

| Field        | Type   | Constraints        | Default | Description                       |
| ------------ | ------ | ------------------ | ------- | --------------------------------- |
| marginX      | number | min: 10, max: 26   | 20      | Horizontal margins (mm)           |
| marginY      | number | min: 10, max: 26   | 15      | Vertical margins (mm)             |
| fontSize     | number | min: 9, max: 13    | 12      | Base font size (pt)               |
| lineHeight   | number | min: 1.1, max: 1.5 | 1.2     | Line height multiplier            |
| blockSpacing | number | min: 1, max: 9     | 5       | Vertical block spacing multiplier |

**Zod schema**: `SpacingSettingsSchema`
**Inferred type**: `SpacingSettings`

### LocalizationSettings (value object)

Localization preferences per format type. Schema + DB only for now (no UI).

| Field      | Type   | Constraints         | Default    | Description              |
| ---------- | ------ | ------------------- | ---------- | ------------------------ |
| language   | string | ISO language code   | 'en-US'    | Resume language          |
| dateFormat | string | date-fns compatible | 'MMM yyyy' | Date display pattern     |
| pageFormat | enum   | 'A4' \| 'us_letter' | 'A4'       | Page size for PDF export |

**Zod schema**: `LocalizationSettingsSchema`
**Inferred type**: `LocalizationSettings`

### ResumeFormatSettingsAts (value object)

Complete format settings for ATS resume type. Identical to Human today; will diverge.

| Field        | Type                 | Required | Description                 |
| ------------ | -------------------- | -------- | --------------------------- |
| spacing      | SpacingSettings      | yes      | Spacing/typography settings |
| localization | LocalizationSettings | yes      | Localization settings       |

**Zod schema**: `ResumeFormatSettingsAtsSchema`
**Inferred type**: `ResumeFormatSettingsAts`

### ResumeFormatSettingsHuman (value object)

Complete format settings for Human resume type. Identical to ATS today; will diverge.

| Field        | Type                 | Required | Description                 |
| ------------ | -------------------- | -------- | --------------------------- |
| spacing      | SpacingSettings      | yes      | Spacing/typography settings |
| localization | LocalizationSettings | yes      | Localization settings       |

**Zod schema**: `ResumeFormatSettingsHumanSchema`
**Inferred type**: `ResumeFormatSettingsHuman`

### UserFormatSettings (entity — DB table)

Top-level per-user format settings. One row per user.

| Field     | Type      | Constraints                                        | Description                 |
| --------- | --------- | -------------------------------------------------- | --------------------------- |
| id        | UUID      | PK, auto-generated                                 | Record identifier           |
| userId    | UUID      | FK → users.id, UNIQUE, NOT NULL, ON DELETE CASCADE | Owner                       |
| ats       | JSONB     | NOT NULL                                           | `ResumeFormatSettingsAts`   |
| human     | JSONB     | NOT NULL                                           | `ResumeFormatSettingsHuman` |
| createdAt | timestamp | NOT NULL, default: now()                           | Creation time               |
| updatedAt | timestamp | NOT NULL, default: now()                           | Last update time            |

**DB table**: `user_format_settings`
**Zod schema**: `UserFormatSettingsSchema`
**Inferred type**: `UserFormatSettings`

## Relationships

```
users (1) ──── (1) user_format_settings
  │
  └── (1..n) resumes  [ats_settings, human_settings REMOVED]
        │
        └── (0..n) resume_versions  [unchanged]
```

- `user_format_settings.user_id` → `users.id` (1:1, UNIQUE constraint)
- `resumes` table: `ats_settings` and `human_settings` columns dropped

## Modified entities

### Resume (existing — modified)

**Removed fields**:

- `atsSettings` (JSONB, nullable) — moved to `user_format_settings.ats.spacing`
- `humanSettings` (JSONB, nullable) — moved to `user_format_settings.human.spacing`

**Remaining fields** (unchanged):

- id, userId, title, content, sourceFileName, sourceFileType, createdAt, updatedAt

## State transitions

### UserFormatSettings lifecycle

```
[User Created] → seedDefaults() → [Settings Created with defaults]
                                          │
                                    PATCH (partial update)
                                          │
                                    [Settings Updated]
                                          │
                                    PATCH (partial update)
                                          │
                                    [Settings Updated] → ...
                                          │
                                [User Deleted] → CASCADE DELETE
```

No soft-delete; no versioning; no archiving. Simple CRUD with cascade.

## Validation rules

1. **SpacingSettings**: all fields required with min/max bounds; Zod defaults fill missing values
2. **LocalizationSettings**: `language` is a string (no strict ISO validation for MVP); `dateFormat` is a string (validated by date-fns at render time); `pageFormat` is enum-constrained
3. **PATCH merge**: server loads existing settings from DB, deep-merges with patch body, validates merged result against full schema before saving
4. **Seeding**: on user creation, `formatSettingsRepository.seedDefaults()` inserts a row with values from `runtimeConfig.formatSettings.defaults`

## Indexes

| Index                              | Table                | Column(s) | Type   |
| ---------------------------------- | -------------------- | --------- | ------ |
| `idx_user_format_settings_user_id` | user_format_settings | user_id   | UNIQUE |

Note: The `user_id` column already has a UNIQUE constraint, making the explicit unique index functionally redundant but kept for query performance clarity.

## Migration data flow

```
resumes.ats_settings (JSONB)    →  user_format_settings.ats.spacing (JSONB)
resumes.human_settings (JSONB)  →  user_format_settings.human.spacing (JSONB)
(runtimeConfig defaults)        →  user_format_settings.*.localization (JSONB)
```

For users with multiple resumes: take settings from the most recently updated resume.
For users with no resumes or null settings: use runtimeConfig defaults.
