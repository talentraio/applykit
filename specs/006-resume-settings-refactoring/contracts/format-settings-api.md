# API Contract: User Format Settings

Base path: `/api/user/format-settings`
Implementation: `packages/nuxt-layer-api/server/api/user/format-settings.*`

## GET /api/user/format-settings

Fetch the authenticated user's format settings.

### Request

- **Method**: GET
- **Auth**: required (session cookie)
- **Params**: none
- **Body**: none

### Response

**200 OK**

```json
{
  "ats": {
    "spacing": {
      "marginX": 20,
      "marginY": 15,
      "fontSize": 12,
      "lineHeight": 1.2,
      "blockSpacing": 5
    },
    "localization": {
      "language": "en-US",
      "dateFormat": "MMM yyyy",
      "pageFormat": "A4"
    }
  },
  "human": {
    "spacing": {
      "marginX": 20,
      "marginY": 15,
      "fontSize": 12,
      "lineHeight": 1.2,
      "blockSpacing": 5
    },
    "localization": {
      "language": "en-US",
      "dateFormat": "MMM yyyy",
      "pageFormat": "A4"
    }
  }
}
```

**401 Unauthorized** — no session

### Behavior

- If user has no settings row, seed from `runtimeConfig.formatSettings.defaults` and return the seeded values.
- Response excludes `id`, `userId`, `createdAt`, `updatedAt` — client doesn't need them.

---

## PATCH /api/user/format-settings

Partially update the authenticated user's format settings.

### Request

- **Method**: PATCH
- **Auth**: required (session cookie)
- **Content-Type**: application/json
- **Body**: Deep partial of `{ ats, human }`

**Example — update only ATS marginX:**

```json
{
  "ats": {
    "spacing": {
      "marginX": 22
    }
  }
}
```

**Example — update both types' spacing:**

```json
{
  "ats": {
    "spacing": { "fontSize": 11 }
  },
  "human": {
    "spacing": { "fontSize": 10, "lineHeight": 1.3 }
  }
}
```

**Example — update localization (future use):**

```json
{
  "ats": {
    "localization": { "pageFormat": "us_letter" }
  },
  "human": {
    "localization": { "pageFormat": "us_letter" }
  }
}
```

### Body validation

```typescript
PatchFormatSettingsBodySchema = z.object({
  ats: z
    .object({
      spacing: SpacingSettingsSchema.partial().optional(),
      localization: LocalizationSettingsSchema.partial().optional()
    })
    .optional(),
  human: z
    .object({
      spacing: SpacingSettingsSchema.partial().optional(),
      localization: LocalizationSettingsSchema.partial().optional()
    })
    .optional()
});
```

At least one of `ats` or `human` must be present (empty body → 422).

### Response

**200 OK** — full settings after merge (same shape as GET response)

**401 Unauthorized** — no session

**422 Unprocessable Entity** — validation errors

```json
{
  "statusCode": 422,
  "statusMessage": "Validation Error",
  "data": {
    "issues": [
      {
        "path": ["ats", "spacing", "marginX"],
        "message": "Number must be greater than or equal to 10"
      }
    ]
  }
}
```

### Server behavior

1. Read current settings from DB (or seed if missing)
2. Deep-merge: `existing.ats.spacing = { ...existing.ats.spacing, ...body.ats.spacing }`
3. Validate merged result against `ResumeFormatSettingsAtsSchema` / `ResumeFormatSettingsHumanSchema`
4. If valid: save to DB, update `updatedAt`, return full settings
5. If invalid: return 422 with Zod issues

---

## Modified endpoints

### PUT /api/resumes/:id

**Removed from body**: `atsSettings`, `humanSettings`
**Removed from response**: `atsSettings`, `humanSettings`

Body now accepts only:

```typescript
{
  content?: ResumeContent,
  title?: string
}
```

### GET /api/resumes/:id

**Removed from response**: `atsSettings`, `humanSettings`

Response shape:

```typescript
{
  id: string,
  userId: string,
  title: string,
  content: ResumeContent,
  sourceFileName: string,
  sourceFileType: SourceFileType,
  createdAt: string,
  updatedAt: string
}
```
