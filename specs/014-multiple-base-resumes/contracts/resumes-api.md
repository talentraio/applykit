# API Contracts: Resumes (Multi-Resume)

All endpoints require authenticated session. All resume endpoints enforce `userId` ownership.

---

## GET /api/resumes

List all base resumes for the authenticated user (lightweight).

**Response** `200`:

```ts
{
  items: Array<{
    id: string; // uuid
    name: string; // user-editable name
    isDefault: boolean; // computed: id === user.defaultResumeId
    createdAt: string; // ISO 8601
    updatedAt: string; // ISO 8601
  }>;
}
```

**Sort order**: default resume first, then `createdAt DESC`.

**Errors**: `401` (not authenticated)

---

## GET /api/resumes/:id

Get full resume by ID with ownership check.

**Params**: `id` — resume UUID

**Response** `200`:

```ts
{
  id: string;
  userId: string;
  name: string;
  title: string;
  content: ResumeContent; // full JSON
  sourceFileName: string;
  sourceFileType: 'docx' | 'pdf';
  isDefault: boolean; // computed
  createdAt: string;
  updatedAt: string;
}
```

**Errors**:

- `401` — not authenticated
- `404` — resume not found or not owned by user

---

## POST /api/resumes/:id/duplicate

Create a copy of an existing resume with cloned content and format settings.

**Params**: `id` — source resume UUID

**Response** `201`:

```ts
{
  id: string; // new resume UUID
  userId: string;
  name: string; // "copy <source.name>"
  title: string; // copied from source
  content: ResumeContent;
  sourceFileName: string;
  sourceFileType: 'docx' | 'pdf';
  isDefault: boolean; // false (new resume is not default)
  createdAt: string;
  updatedAt: string;
}
```

**Behavior**:

- Deep clones `content`, `title`, `sourceFileName`, `sourceFileType`
- Sets `name` = `copy <source.name>`
- Clones format settings from source resume into new `resume_format_settings` row
- Does NOT set as default

**Errors**:

- `401` — not authenticated
- `404` — source resume not found or not owned by user
- `409` — user already has 10 resumes (limit reached)

---

## DELETE /api/resumes/:id

Delete a non-default resume.

**Params**: `id` — resume UUID

**Response** `204`: No Content

**Behavior**:

- Cascades: deletes `resume_format_settings` (FK cascade)
- Does NOT cascade to `generations` (historical reference preserved)
- Does NOT cascade to `resume_versions` (FK cascade handles this)

**Errors**:

- `401` — not authenticated
- `404` — resume not found or not owned by user
- `409` — cannot delete default resume

---

## PUT /api/resumes/:id/name

Update resume name.

**Params**: `id` — resume UUID

**Request body**:

```ts
{
  name: string; // 1-255 chars
}
```

**Response** `200`:

```ts
{
  id: string;
  name: string;
  updatedAt: string;
}
```

**Errors**:

- `401` — not authenticated
- `404` — resume not found or not owned by user
- `422` — validation error (empty name, too long)

---

## PUT /api/user/default-resume

Set which resume is the user's default.

**Request body**:

```ts
{
  resumeId: string; // uuid of resume to make default
}
```

**Response** `200`:

```ts
{
  success: true;
}
```

**Behavior**:

- Validates resume exists and belongs to user
- Updates `users.default_resume_id`

**Errors**:

- `401` — not authenticated
- `404` — resume not found or not owned by user

---

## GET /api/resumes/:id/format-settings

Get per-resume format settings.

**Params**: `id` — resume UUID

**Response** `200`:

```ts
{
  ats: ResumeFormatSettingsAts;
  human: ResumeFormatSettingsHuman;
}
```

**Behavior**:

- Auto-seeds defaults if no settings exist for this resume
- Same response shape as former `GET /api/user/format-settings`

**Errors**:

- `401` — not authenticated
- `404` — resume not found or not owned by user

---

## PATCH /api/resumes/:id/format-settings

Patch per-resume format settings (deep partial merge).

**Params**: `id` — resume UUID

**Request body** (deep partial):

```ts
{
  ats?: {
    spacing?: Partial<AtsSpacingSettings>;
    localization?: Partial<AtsLocalizationSettings>;
  };
  human?: {
    spacing?: Partial<HumanSpacingSettings>;
    localization?: Partial<HumanLocalizationSettings>;
  };
}
```

**Response** `200`:

```ts
{
  ats: ResumeFormatSettingsAts;
  human: ResumeFormatSettingsHuman;
}
```

**Behavior**:

- Same deep-partial merge logic as former `PATCH /api/user/format-settings`
- Requires at least one of `ats` or `human`
- Validates merged result with schemas

**Errors**:

- `401` — not authenticated
- `404` — resume not found or not owned by user
- `422` — validation error

---

## Modified: POST /api/resumes

**Changes from current behavior**:

- No longer performs upsert (`replaceBaseData`). Always creates a new resume.
- If it's the user's first resume: auto-sets as default, generates name from `dd.MM.yyyy`
- If user already has resume(s) and uploads via this endpoint: creates additional resume
- Enforces 10-resume limit (409 if exceeded)
- Response now includes `name` and `isDefault` fields

---

## Modified: PUT /api/resumes/:id

**Changes from current behavior**:

- Explicitly updates the resume identified by route param `:id` (with ownership check)
- Supports partial update with `content` and/or `title`
- Creates a new version snapshot when `content` is updated

---

## Removed: GET/PATCH/PUT /api/user/format-settings

Replaced by `GET/PATCH /api/resumes/:id/format-settings`. No deprecation period (clean cut).
