# Foundation MVP Specification

> **Epic:** 001-foundation-mvp
> **Status:** Draft
> **Last updated:** 2026-01-22

---

## Overview

ApplyKit is a resume tailoring tool that helps job seekers optimize their resumes for specific job vacancies. The Foundation MVP delivers an end-to-end happy path: users upload a resume (DOCX/PDF), the system parses it into a strict JSON schema via LLM, users create vacancies, generate tailored resume versions, and export ATS-friendly or human-readable PDFs.

---

## Goals

- **End-to-end flow:** Upload resume -> Parse -> Create vacancy -> Generate tailored version -> Export PDF
- **Type-safe, strict schemas:** All resume data follows a Zod-validated JSON schema (`@int/schema`)
- **LLM-powered parsing and generation:** Use OpenAI (quality) or Gemini Flash (cheap default) with BYOK support
- **Role-based access:** `super_admin`, `friend`, `public` with per-role daily limits
- **i18n from day 1:** No hardcoded UI strings; all user-facing text goes through i18n
- **SSR-friendly views:** ATS and Human resume pages use server-side islands rendering
- **Consistent date handling:** Use `date-fns` for formatting/parsing and date arithmetic in app code

---

## Non-goals (MVP)

- Social login beyond Google (Apple, GitHub, etc.)
- Resume templates/themes selection (post-MVP)
- Team/organization features
- Job board integrations (scraping vacancy descriptions)
- AI chat assistant for resume editing
- Multi-brand/white-label support
- Mobile app
- Analytics dashboard beyond basic usage counts

---

## Scope

### In scope

1. Google sign-in authentication
2. Role-based authorization (super_admin / friend / public)
3. User profile with minimal required fields
4. Resume upload (DOCX primary, PDF supported) and LLM parsing
5. JSON editor for reviewing/editing parsed resume (MVP)
6. Vacancy CRUD (company, jobPosition, description, url, notes)
7. Tailored resume generation per vacancy with match scoring
8. ATS and Human-friendly views (server-rendered)
9. PDF export with caching
10. BYOK (Bring Your Own Key) for LLM providers
11. Per-user daily limits and global budget cap
12. Admin kill switch for platform LLM usage
13. Admin app for role management

### Out of scope

- Advanced resume editor (drag-and-drop, WYSIWYG)
- Cover letter generation
- Interview preparation features
- Job application tracking
- Email notifications
- Billing/subscription management

---

## Roles & Limits

| Role          | Description        | Daily parse | Daily generate | Daily export | Notes                               |
| ------------- | ------------------ | ----------- | -------------- | ------------ | ----------------------------------- |
| `super_admin` | Platform operators | Unlimited   | Unlimited      | Unlimited    | Full access, can bypass kill switch |
| `friend`      | Trusted beta users | 10          | 50             | 100          | BYOK allowed                        |
| `public`      | Standard users     | 3           | 10             | 20           | BYOK allowed                        |

### BYOK Policy

- Users with `friend` or `public` roles can provide their own API keys
- Keys stored in browser only (localStorage), sent via `x-api-key` header
- Even with BYOK, enforce minimum rate limits (e.g., 1 req/sec per operation)
- Admin can disable BYOK platform-wide via separate kill switch (decision needed)
- UI shows only key hint (last 4 chars), never full key

### Global Budget Cap

- Platform-provided LLM usage has a global monthly budget
- When budget is exhausted, only BYOK requests are processed
- Admin can set budget amount and receive alerts at thresholds (75%, 90%, 100%)

---

## User Flows

### 1. Authentication

```
User lands on site
  -> Click "Sign in with Google"
  -> Google OAuth flow
  -> Redirect back to app
  -> Session created (cookie-based)
  -> Role assigned: "public" by default
```

### 2. Resume Upload & Parse (no profile required)

```
User is signed in
  -> Navigate to "Resumes" section
  -> Click "Upload Resume"
  -> Select DOCX or PDF file
  -> Server sends file to LLM parsing service
  -> Service returns strict JSON (Zod-validated)
  -> User sees JSON in editor
  -> User can edit JSON and save
  -> Resume becomes "base resume"
```

### 3. Profile Completion (before first generation)

```
User tries to generate tailored resume
  -> System checks profile completeness
  -> If incomplete, redirect to profile form
  -> Required fields: firstName, lastName, email, country, searchRegion, workFormat, languages[]
  -> Optional: phones[]
  -> After save, redirect back to generation
```

### 4. Vacancy Creation

```
User navigates to "Vacancies"
  -> Click "New Vacancy"
  -> Fill form: company (required), jobPosition (optional), description (text), url (optional), notes (optional)
  -> Save vacancy
  -> Vacancy appears in list as "Company (Position)" or just "Company"
```

### 5. Resume Generation

```
User opens vacancy detail
  -> Click "Generate Tailored Resume"
  -> System checks profile completeness
  -> If OK, server calls LLM generation service
  -> Service returns tailored resume JSON + match scores (before/after)
  -> Generation stored with timestamp
  -> UI shows latest generation
```

### 6. View & Export

```
User on vacancy detail
  -> Click "View ATS" or "View Human"
  -> Server renders resume via islands (SSR)
  -> Click "Export PDF"
  -> Server checks cache
  -> If cached and valid, return cached PDF
  -> Else generate PDF from HTML, cache it, return
  -> On regeneration, cache is invalidated
```

### 7. Admin: Role Management

```
Admin signs in to admin app
  -> Navigate to "Users"
  -> Search user by email
  -> Assign role (super_admin / friend / public)
  -> Save
```

### 8. Admin: System Controls

```
Admin on "System" page
  -> Toggle "Platform LLM enabled" (kill switch)
  -> Toggle "BYOK enabled" (separate switch)
  -> Select platform provider (OpenAI / Gemini Flash)
  -> Set global budget cap
  -> View current usage vs budget
```

---

## UI / Pages

### apps/site

| Route                  | Page             | Description                                           |
| ---------------------- | ---------------- | ----------------------------------------------------- |
| `/`                    | Home             | Marketing landing page                                |
| `/login`               | Login            | Google sign-in button                                 |
| `/dashboard`           | Dashboard        | Overview, quick actions                               |
| `/profile`             | Profile          | Edit user profile                                     |
| `/resumes`             | Resume List      | List of user's base resumes                           |
| `/resumes/new`         | Upload Resume    | File upload form (requires complete profile)          |
| `/resumes/:id`         | Resume Detail    | JSON editor for base resume                           |
| `/vacancies`           | Vacancy List     | List of vacancies                                     |
| `/vacancies/new`       | New Vacancy      | Vacancy creation form                                 |
| `/vacancies/:id`       | Vacancy Detail   | View vacancy, generation controls, lifetime indicator |
| `/vacancies/:id/ats`   | ATS View         | SSR island: ATS-friendly resume                       |
| `/vacancies/:id/human` | Human View       | SSR island: Human-friendly resume                     |
| `/settings`            | Settings         | BYOK key management                                   |
| `/privacy`             | Privacy Policy   | Static privacy policy page                            |
| `/terms`               | Terms of Service | Static terms of service page                          |

### apps/admin

| Route     | Page            | Description                   |
| --------- | --------------- | ----------------------------- |
| `/`       | Admin Home      | Dashboard overview            |
| `/login`  | Admin Login     | Separate admin auth           |
| `/users`  | User Management | Search, view, assign roles    |
| `/system` | System Controls | Kill switches, budget, limits |

---

## Data Model

### Strict Schemas (`packages/nuxt-layer-schema/` → `@int/schema`)

All schemas defined with Zod; TypeScript types inferred.

> **Architecture Note:** Domain DTOs/schemas live in `@int/schema` and are ORM-independent. The ORM (Drizzle) acts as an adapter only; ORM types are not exposed outside the data-access layer.

#### User

```typescript
type User = {
  id: string; // uuid
  email: string;
  googleId: string;
  role: 'super_admin' | 'friend' | 'public';
  createdAt: Date;
  updatedAt: Date;
};
```

#### Profile

```typescript
type Profile = {
  id: string; // uuid
  userId: string; // FK
  firstName: string;
  lastName: string;
  email: string;
  country: string; // ISO 3166-1 alpha-2
  searchRegion: string;
  workFormat: 'remote' | 'hybrid' | 'onsite';
  languages: Array<{
    language: string;
    level: string;
  }>;
  phones?: Array<{
    number: string;
    label?: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
};
```

#### Resume (Base)

```typescript
type Resume = {
  id: string; // uuid
  userId: string; // FK
  title: string;
  content: ResumeContent; // strict JSON schema
  sourceFileName: string;
  sourceFileType: 'docx' | 'pdf';
  createdAt: Date;
  updatedAt: Date;
};
```

#### ResumeContent (strict schema)

```typescript
type ResumeContent = {
  personalInfo: {
    fullName: string;
    email: string;
    phone?: string;
    location?: string;
    linkedin?: string;
    website?: string;
  };
  summary?: string;
  experience: Array<{
    company: string;
    position: string;
    startDate: string; // YYYY-MM
    endDate?: string; // YYYY-MM or null for "present"
    description: string;
    projects?: string[];
    links?: Array<{
      name: string;
      link: string;
    }>;
  }>;
  education: Array<{
    institution: string;
    degree: string;
    field?: string;
    startDate: string; // YYYY-MM
    endDate?: string; // YYYY-MM
  }>;
  skills: string[];
  certifications?: Array<{
    name: string;
    issuer?: string;
    date?: string; // YYYY-MM
  }>;
  languages?: Array<{
    language: string;
    level: string; // e.g., "Native", "Fluent", "Intermediate", "Basic"
  }>;
};
```

#### Vacancy

```typescript
type Vacancy = {
  id: string; // uuid
  userId: string; // FK
  company: string;
  jobPosition?: string;
  description: string;
  url?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
};
```

#### Generation

```typescript
type Generation = {
  id: string; // uuid
  vacancyId: string; // FK
  resumeId: string; // FK
  content: ResumeContent; // tailored
  matchScoreBefore: number; // 0-100
  matchScoreAfter: number; // 0-100
  generatedAt: Date;
};
```

> **Note:** UI shows only latest generation, but model supports history array for future features.

#### LLMKey (user-provided BYOK)

```typescript
type LLMKey = {
  id: string; // uuid
  userId: string; // FK
  provider: 'openai' | 'gemini';
  keyHint: string; // last 4 chars
  // Actual key stored encrypted or in browser only (MVP: browser only)
  createdAt: Date;
};
```

#### UsageLog

```typescript
type UsageLog = {
  id: string; // uuid
  userId: string; // FK
  operation: 'parse' | 'generate' | 'export';
  provider: 'platform' | 'byok';
  tokensUsed?: number;
  cost?: number;
  createdAt: Date;
};
```

#### SystemConfig

```typescript
type SystemConfig = {
  key: string;
  value: string | number | boolean;
  updatedAt: Date;
};
// Keys: platform_llm_enabled, byok_enabled, platform_provider, global_budget_cap, global_budget_used
// platform_provider: 'openai' | 'gemini_flash'
```

---

## API Surface

Implementation: `packages/nuxt-layer-api/` (package: `@int/api`)

### Auth

| Method | Endpoint           | Description                                                |
| ------ | ------------------ | ---------------------------------------------------------- |
| GET    | `/auth/google`     | Google OAuth (nuxt-auth-utils handles redirect + callback) |
| POST   | `/api/auth/logout` | Clear session                                              |
| GET    | `/api/auth/me`     | Get current user + profile                                 |

> **Note:** OAuth routes are in `server/routes/` (not `server/api/`) per nuxt-auth-utils best practices. The handler manages both the initial redirect and callback on the same endpoint.

### Profile

| Method | Endpoint                | Description                                 |
| ------ | ----------------------- | ------------------------------------------- |
| GET    | `/api/profile`          | Get current user's profile                  |
| PUT    | `/api/profile`          | Update profile                              |
| GET    | `/api/profile/complete` | Check if profile is complete for generation |

### Resume

| Method | Endpoint           | Description                    |
| ------ | ------------------ | ------------------------------ |
| GET    | `/api/resumes`     | List user's resumes            |
| POST   | `/api/resumes`     | Create resume (upload + parse) |
| GET    | `/api/resumes/:id` | Get resume detail              |
| PUT    | `/api/resumes/:id` | Update resume content          |
| DELETE | `/api/resumes/:id` | Delete resume                  |

### Vacancy

| Method | Endpoint             | Description           |
| ------ | -------------------- | --------------------- |
| GET    | `/api/vacancies`     | List user's vacancies |
| POST   | `/api/vacancies`     | Create vacancy        |
| GET    | `/api/vacancies/:id` | Get vacancy detail    |
| PUT    | `/api/vacancies/:id` | Update vacancy        |
| DELETE | `/api/vacancies/:id` | Delete vacancy        |

### Generation

| Method | Endpoint                                | Description              |
| ------ | --------------------------------------- | ------------------------ |
| POST   | `/api/vacancies/:id/generate`           | Generate tailored resume |
| GET    | `/api/vacancies/:id/generations`        | List generation history  |
| GET    | `/api/vacancies/:id/generations/latest` | Get latest generation    |

### Export

| Method | Endpoint                    | Description                         |
| ------ | --------------------------- | ----------------------------------- |
| POST   | `/api/vacancies/:id/export` | Export PDF (query: type=ats\|human) |

> **PDF Generation:** Uses Playwright with Chromium for HTML-to-PDF conversion. Renders SSR island views (ATS/Human) with full CSS fidelity. PDFs cached via storage adapter; invalidated on regeneration.

### LLM Keys (BYOK)

| Method | Endpoint        | Description                            |
| ------ | --------------- | -------------------------------------- |
| GET    | `/api/keys`     | List user's stored key hints           |
| POST   | `/api/keys`     | Store key hint (key itself in browser) |
| DELETE | `/api/keys/:id` | Remove key hint                        |

### Admin

| Method | Endpoint                    | Description              |
| ------ | --------------------------- | ------------------------ |
| GET    | `/api/admin/users`          | List users (with search) |
| GET    | `/api/admin/users/:id`      | Get user detail          |
| PUT    | `/api/admin/users/:id/role` | Update user role         |
| GET    | `/api/admin/system`         | Get system config        |
| PUT    | `/api/admin/system`         | Update system config     |
| GET    | `/api/admin/usage`          | Get usage stats          |

---

## LLM Workflows

### Resume Parsing

1. User uploads DOCX/PDF to `/api/resumes`
2. Server extracts text from document
3. Server calls LLM parsing service (`server/services/llm/parse.ts`)
4. Service sends text to LLM with structured prompt
5. LLM returns JSON response
6. **Service validates response with Zod** (not endpoint)
7. If valid, store resume; if invalid, retry with correction prompt or return error

### Resume Generation

1. User triggers `/api/vacancies/:id/generate`
2. Server loads base resume, vacancy description, user profile
3. Server calls LLM generation service (`server/services/llm/generate.ts`)
4. Service sends context to LLM with optimization prompt
5. LLM returns tailored JSON + match scores
6. **Service validates response with Zod** (not endpoint)
7. Store generation record with timestamp

### Provider Selection

- Check if user has BYOK key for preferred provider
- If BYOK, use user's key (still apply rate limits)
- If no BYOK, use platform key
- Check platform budget and kill switch before using platform key
- Default provider priority: OpenAI > Gemini Flash

---

## Limits & Safety

### Per-User Daily Limits

- Limits reset at midnight UTC
- Track in `UsageLog` table, aggregate by date
- Return 429 when limit exceeded

### Global Budget Cap

- Track total platform LLM cost in `SystemConfig.global_budget_used`
- Compare against `SystemConfig.global_budget_cap`
- When exceeded, reject platform-key requests (BYOK still allowed)

### Admin Kill Switch & Provider Control

- `SystemConfig.platform_llm_enabled`: if false, reject all platform-key LLM requests
- `SystemConfig.byok_enabled`: if false, reject all BYOK requests
- `SystemConfig.platform_provider`: `'openai' | 'gemini_flash'` - selects default provider for platform usage
- Super admins can bypass kill switch for emergency operations

> **Provider Strategy:** OpenAI for quality, Gemini Flash as free/cheap fallback. Admin can switch platform provider without code deployment.

### Rate Limiting

- Even with BYOK, enforce 1 req/sec per operation type
- Use sliding window rate limiter (Redis or memory-based for MVP)

---

## Security & Privacy

### Authentication

- **Module:** `nuxt-auth-utils` (Nuxt team maintained)
- Google OAuth 2.0 with PKCE
- Session stored in HTTP-only, secure, SameSite cookie
- CSRF protection via state parameter

### Authorization

- Middleware checks role on protected routes
- Admin routes require `super_admin` role
- Row-level security: users can only access own data

### Data Protection

- **Never log:** resume text, job descriptions, PII, API keys
- Encrypt BYOK keys at rest if stored server-side (MVP: browser only)
- UI shows only key hint (last 4 chars)

### Data Retention Policy

- **Generations & cached exports:** 90 days from creation, then auto-deleted
- **Usage logs:** 1 year, then auto-deleted
- **Base resumes & vacancies:** Retained until user deletes account
- **Deleted accounts:** All data purged within 30 days
- **UI indicator:** Vacancy detail page shows "Expires in X days" for generations
- **Background task:** Daily cleanup job removes expired data (cron-endpoint pattern)

### Input Validation

- All API inputs validated with Zod
- File uploads: validate MIME type, max size (10MB)
- Sanitize user-provided URLs

---

## i18n Keys Expectations

All user-facing strings use i18n. Key conventions:

```
# Common
common.save
common.cancel
common.delete
common.loading
common.error.generic

# Auth
auth.login.google
auth.logout
auth.error.failed

# Profile
profile.title
profile.form.firstName
profile.form.lastName
profile.form.email
profile.form.country
profile.form.searchRegion
profile.form.workFormat
profile.form.languages
profile.form.phones
profile.error.incomplete

# Resume
resume.list.title
resume.upload.title
resume.upload.dropzone
resume.upload.processing
resume.editor.title
resume.error.parseFailure

# Vacancy
vacancy.list.title
vacancy.form.company
vacancy.form.jobPosition
vacancy.form.description
vacancy.form.url
vacancy.form.notes
vacancy.detail.title

# Generation
generation.button
generation.inProgress
generation.success
generation.matchScore.before
generation.matchScore.after
generation.lifetime.expiresIn
generation.lifetime.days
generation.error.profileIncomplete
generation.error.limitExceeded

# Export
export.button.ats
export.button.human
export.inProgress
export.success
export.error.failed

# Settings
settings.title
settings.keys.title
settings.keys.add
settings.keys.hint
settings.keys.provider

# Admin
admin.users.title
admin.users.search
admin.users.role
admin.system.title
admin.system.platformLlm
admin.system.byok
admin.system.budget
```

---

## Monorepo / Layers Touchpoints

### Apps

- `apps/site` - User-facing product
- `apps/admin` - Admin interface

### Layer Packages

#### `packages/nuxt-layer-schema/` (package: `@int/schema`)

- Zod schemas for all entities
- Inferred TypeScript types
- Validation helpers
- Enums (roles, work formats, providers)

#### `packages/nuxt-layer-api/` (package: `@int/api`)

- `server/api/*` - REST endpoints (thin handlers, no direct ORM calls)
- `server/routes/*` - Non-API routes (OAuth callbacks)
- `server/services/*` - Business logic (LLM, export)
- `server/data/*` - Data-access layer (Drizzle ORM adapter, repository pattern)
- `server/storage/*` - Storage adapter interface (put/get/delete for blobs)
- `server/tasks/*` - Background tasks (cron-endpoint + idempotence pattern)
- `server/utils/*` - Shared utilities
- `server/plugins/*` - Server plugins
- `app/composables/*` - Shared API composables

> **Data Layer Isolation:** ORM calls are confined to `server/data/*`. Endpoints call data-access functions that return domain types from `@int/schema`. This enables DB/ORM migration without touching API handlers.

> **Storage Abstraction:** File storage uses a minimal interface (`put`, `get`, `delete`, `getUrl`) in `server/storage/*`. MVP uses Vercel Blob; adapter can swap to Netlify Blobs, S3, etc.

> **Background Tasks:** Long-running operations (PDF generation, cleanup) use cron-triggered endpoints with idempotency keys. Pattern supports future migration to dedicated job queue/orchestrator.

#### `packages/nuxt-layer-ui/` (package: `@int/ui`)

- NuxtUI v4 configuration
- Theme tokens (colors, typography)
- Base components
- Form components
- Layout components

### Consumption Pattern

```typescript
// apps/site/nuxt.config.ts
export default defineNuxtConfig({
  extends: ['@int/ui', '@int/api']
});
```

---

## Acceptance Criteria

### Auth

- [ ] User can sign in with Google
- [ ] User session persists across page reloads
- [ ] User can sign out
- [ ] Unauthenticated users are redirected to login

### Profile

- [ ] User can view and edit profile
- [ ] Profile validation enforces required fields
- [ ] Generation blocked until profile complete

### Resume

- [ ] User can upload DOCX file
- [ ] User can upload PDF file
- [ ] System parses resume to strict JSON
- [ ] User can view parsed JSON in editor
- [ ] User can edit and save JSON
- [ ] Invalid schema changes are rejected

### Vacancy

- [ ] User can create vacancy with company name
- [ ] User can add optional job position
- [ ] User can add description, URL, notes
- [ ] Vacancy list shows "Company (Position)" format
- [ ] User can edit and delete vacancies

### Generation

- [ ] User can generate tailored resume for vacancy
- [ ] System shows match scores (before/after)
- [ ] Generation history stored in database
- [ ] UI shows only latest generation

### Export

- [ ] User can view ATS version (SSR)
- [ ] User can view Human version (SSR)
- [ ] User can export ATS PDF
- [ ] User can export Human PDF
- [ ] PDFs are cached
- [ ] Cache invalidated on regeneration

### Limits

- [ ] Daily limits enforced per role
- [ ] 429 returned when limit exceeded
- [ ] Global budget cap stops platform requests
- [ ] Kill switch disables platform LLM

### Admin

- [ ] Admin can search users
- [ ] Admin can change user roles
- [ ] Admin can toggle kill switches
- [ ] Admin can set budget cap

---

## Edge Cases

### Resume Parsing

- Large files (>10MB) - reject with clear error
- Corrupted files - return parse error, suggest re-upload
- Non-English resumes - support via LLM, but flag as best-effort
- Empty/minimal content - parse what exists, user can edit

### Generation

- Profile incomplete - redirect to profile, then back
- Base resume missing - prompt to upload first
- LLM timeout - retry once, then show error
- Invalid LLM response - retry with correction, max 3 attempts

### Limits

- User hits limit mid-operation - complete operation, then block next
- Budget exhausted mid-day - block platform, allow BYOK
- Admin disables during user request - let request complete, block next

### Export

- Large resume (many pages) - allow, but warn about file size
- Concurrent export requests - queue or deduplicate
- Cache miss after long time - regenerate PDF

### Auth

- OAuth failure - show error, allow retry
- Session expired - redirect to login
- Token refresh failure - full re-auth

---

## Testing Plan

### Unit Tests

- Zod schema validation (all entity schemas)
- Limit calculation logic
- Rate limit enforcement
- Date/time utilities

### Integration Tests

- OAuth flow (mocked Google)
- Resume upload and parsing (mocked LLM)
- Generation flow (mocked LLM)
- Export flow (mocked PDF generator)
- Admin role management

### E2E Tests

- Complete happy path: sign in -> upload -> vacancy -> generate -> export
- Profile completion gate
- Limit enforcement (mock near-limit state)
- Admin kill switch effect

### Manual QA

- Cross-browser testing (Chrome, Firefox, Safari)
- Mobile responsive layouts
- i18n string completeness
- Accessibility audit (keyboard nav, screen reader)

---

## NEEDS CLARIFICATION

### BYOK Key Storage (Server-side)

- MVP: browser-only (localStorage)
- Future: if server storage needed, what encryption approach?

### Admin App Auth

- Same Google OAuth as site, but separate session?
- Or separate admin credentials?

### Match Score Algorithm

- LLM-provided or calculated from comparison?
- What factors influence the score?

---

## Clarifications

### Session 2026-01-22

- Q: Database choice for MVP? → A: PostgreSQL + Drizzle ORM (PostgreSQL locally via Docker). External Postgres provider (Supabase/Neon), not platform-specific. Architectural constraints: (1) Separate data-access layer - no ORM calls spread in server/api/\*, (2) Domain types in @int/schema (Zod) independent of ORM - ORM is adapter only, (3) Storage abstraction via small interface (put/get/delete) for Vercel Blob ↔ Netlify Blobs portability, (4) Background tasks as cron-endpoint + idempotence for future orchestrator migration.
- Q: Auth module choice? → A: nuxt-auth-utils (Nuxt team, lightweight sessions). Cookie-based auth with Google OAuth support. Works with separated data-access layer.
- Q: PDF generation library? → A: Playwright. Better serverless support for Vercel, consistent Chromium rendering, full CSS fidelity for ATS/Human views.
- Q: Export caching backend? → A: Resolved by storage abstraction (Q1). Uses Vercel Blob via adapter interface; cached PDFs stored with generation ID key for invalidation.
- Q: BYOK kill switch design? → A: Two separate switches (platform LLM + BYOK toggle) plus a provider selector (OpenAI vs Gemini Flash) for platform usage. Admin can independently disable platform LLM, disable BYOK, and choose default platform provider.
- Q: Data retention policy? → A: 90 days for generations/exports, 1 year for usage logs. Add lifetime indicator on vacancy page showing days remaining before auto-deletion.

---

## Next Steps

1. `/speckit.clarify` - Resolve open questions above
2. `/speckit.plan` - Create implementation plan
3. `/speckit.tasks` - Generate task breakdown
