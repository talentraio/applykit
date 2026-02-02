# Research: Foundation MVP

> **Feature**: 001-foundation-mvp
> **Date**: 2026-01-22
> **Status**: Complete

This document captures research findings for technology decisions in the Foundation MVP.

---

## 1. Database & ORM

### Decision

**PostgreSQL + Drizzle ORM** (PostgreSQL for local development)

### Rationale

- Type-safe schema definition with TypeScript inference
- Excellent Nuxt/Nitro integration
- Migration support out of the box
- Driver abstraction allows PostgreSQL locally and in production
- Lighter than Prisma, better serverless cold-start

### Alternatives Considered

| Option          | Pros                   | Cons                              | Rejected Because                    |
| --------------- | ---------------------- | --------------------------------- | ----------------------------------- |
| Prisma          | Popular, mature        | Heavier bundle, slower cold-start | Drizzle is lighter for serverless   |
| Kysely          | Type-safe, lightweight | Less ecosystem, manual migrations | Drizzle has better Nuxt integration |
| Raw SQL         | Maximum control        | No type safety, manual migrations | Too much boilerplate for MVP        |
| Supabase client | Built-in auth          | Vendor lock-in                    | Prefer portable data layer          |

### Implementation Notes

- External PostgreSQL provider: Supabase or Neon (both have free tiers)
- Data-access layer in `server/data/` with repository pattern
- ORM types stay in data layer; API returns domain types from `@int/schema`
- Connection pooling via provider (Supabase has built-in)

---

## 2. Authentication

### Decision

**nuxt-auth-utils** with Google OAuth

### Rationale

- Maintained by Nuxt core team
- Lightweight, focused on session management
- Built-in Google OAuth support
- Cookie-based sessions (HTTP-only, secure, SameSite)
- No forced DB schema (we control user storage)

### Alternatives Considered

| Option              | Pros                         | Cons                     | Rejected Because                   |
| ------------------- | ---------------------------- | ------------------------ | ---------------------------------- |
| @sidebase/nuxt-auth | Feature-rich (NextAuth port) | Heavier, complex config  | Overkill for single-provider OAuth |
| Custom OAuth        | Full control                 | More code, security risk | nuxt-auth-utils handles edge cases |
| Supabase Auth       | Integrated with Supabase     | Vendor lock-in           | Prefer portable auth               |

### Implementation Notes

- Session stored in cookie, user data in PostgreSQL
- Role stored on User entity, checked in middleware
- Admin app uses same auth flow, checks `super_admin` role
- CSRF protection via state parameter in OAuth flow

---

## 3. PDF Generation

### Decision

**Playwright** with Chromium

### Rationale

- Better serverless support than Puppeteer
- Consistent rendering across environments
- Full CSS fidelity for styled resumes
- Can render SSR pages directly
- Vercel-compatible with `@playwright/test`

### Alternatives Considered

| Option                  | Pros                | Cons                             | Rejected Because                  |
| ----------------------- | ------------------- | -------------------------------- | --------------------------------- |
| Puppeteer               | Mature, widely used | Larger bundle, serverless issues | Playwright better for Vercel      |
| wkhtmltopdf             | Fast, small         | Limited CSS support              | Can't render modern CSS           |
| jsPDF                   | Client-side         | No HTML rendering                | Need server-side HTML-to-PDF      |
| @vercel/og + satori     | Lightweight         | SVG-only, limited CSS            | Not suitable for multi-page docs  |
| External API (PDFShift) | No infra            | Cost, latency, privacy           | Want to keep resume data internal |

### Implementation Notes

- Render ATS/Human view pages server-side
- Pass rendered HTML to Playwright
- Cache PDFs in Vercel Blob with generation ID as key
- Invalidate cache on regeneration
- Consider background task for large PDFs

---

## 4. File Storage

### Decision

**Vercel Blob** with adapter interface

### Rationale

- Native Vercel integration, zero config
- Pay-per-use pricing
- Simple API (put/get/delete)
- Adapter pattern allows future swap

### Alternatives Considered

| Option           | Pros                 | Cons                         | Rejected Because            |
| ---------------- | -------------------- | ---------------------------- | --------------------------- |
| S3               | Industry standard    | More config, AWS dependency  | Vercel Blob simpler for MVP |
| Cloudflare R2    | S3-compatible, cheap | Requires Cloudflare          | Not on Vercel ecosystem     |
| File system      | Simple               | Not persistent on serverless | Won't work on Vercel        |
| Supabase Storage | Integrated           | Vendor lock-in               | Prefer portable storage     |

### Implementation Notes

- Storage adapter interface: `put(key, data)`, `get(key)`, `delete(key)`, `getUrl(key)`
- MVP implementation: Vercel Blob
- Key format: `{userId}/{type}/{id}` (e.g., `user123/pdf/gen456.pdf`)
- Stored items: uploaded resumes (temp), cached PDFs, exported files

---

## 5. LLM Integration

### Decision

**OpenAI primary, Gemini Flash fallback** with BYOK support

### Rationale

- OpenAI GPT-4 for quality parsing/generation
- Gemini Flash as free/cheap fallback
- BYOK allows users to use own keys
- Provider abstraction for easy switching

### Alternatives Considered

| Option      | Pros          | Cons                      | Rejected Because                    |
| ----------- | ------------- | ------------------------- | ----------------------------------- |
| OpenAI only | Best quality  | Cost for platform         | Need cheap fallback                 |
| Gemini only | Free tier     | Lower quality             | Want quality option                 |
| Claude      | High quality  | Higher cost, no free tier | OpenAI has better structured output |
| Local LLM   | Free, private | Needs GPU, slow           | Not viable for serverless           |

### Implementation Notes

- LLM service in `server/services/llm/`
- Provider interface: `parse(text): ResumeContent`, `generate(resume, vacancy): TailoredResume`
- Structured output with JSON mode (OpenAI) or schema enforcement
- Zod validation on all LLM responses
- Retry with correction prompt on validation failure (max 3 attempts)
- Provider selection: BYOK key > platform provider setting

### Prompt Strategy

- **Parsing**: System prompt defines exact JSON schema, few-shot examples
- **Generation**: Include base resume, vacancy description, profile context
- **Match scoring**: LLM provides before/after scores based on keyword/skill matching

---

## 6. Rate Limiting

### Decision

**In-memory rate limiter for MVP** (Redis post-MVP if needed)

### Rationale

- Simple implementation for MVP scale
- No additional infrastructure
- Per-user limits tracked in UsageLog table
- Global rate limits in memory

### Alternatives Considered

| Option        | Pros                    | Cons                       | Rejected Because        |
| ------------- | ----------------------- | -------------------------- | ----------------------- |
| Redis         | Distributed, persistent | Additional infra cost      | Overkill for MVP        |
| Upstash Redis | Serverless Redis        | Cost, external dependency  | Can add later if needed |
| Database-only | Persistent              | Slower for frequent checks | Hybrid approach better  |

### Implementation Notes

- Daily limits: Query UsageLog count by user + date
- Rate limits (req/sec): In-memory sliding window
- Reset at midnight UTC
- 429 response with `Retry-After` header
- Super admins bypass limits

---

## 7. Document Parsing (DOCX/PDF)

### Decision

**mammoth (DOCX) + pdf-parse (PDF)**

### Rationale

- mammoth: Clean HTML extraction from DOCX
- pdf-parse: Text extraction from PDF
- Both lightweight, serverless-compatible
- Text fed to LLM for structured parsing

### Alternatives Considered

| Option      | Pros             | Cons              | Rejected Because          |
| ----------- | ---------------- | ----------------- | ------------------------- |
| Apache Tika | Comprehensive    | Java, heavy       | Not serverless-friendly   |
| pdf.js      | Full PDF parsing | Complex, overkill | Just need text extraction |
| docx4js     | Alternative DOCX | Less maintained   | mammoth is standard       |

### Implementation Notes

- Extract text first, then send to LLM
- Preserve basic structure (headings, lists) for context
- Max file size: 10MB
- Validate MIME type before processing

---

## 8. i18n

### Decision

**@nuxtjs/i18n** with Vue I18n

### Rationale

- Official Nuxt module
- SSR-compatible
- Lazy loading of locale files
- Route-based locale detection

### Implementation Notes

- Default locale: `en`
- Locale files in `locales/{lang}.json`
- Key conventions defined in spec
- No hardcoded strings in components
- Shared translations in `@int/ui` layer

---

## 9. Background Tasks

### Decision

**Cron-triggered endpoints with idempotency**

### Rationale

- No additional infrastructure
- Vercel Cron Jobs support
- Idempotency keys prevent duplicate processing
- Easy migration to job queue later

### Alternatives Considered

| Option         | Pros               | Cons                | Rejected Because         |
| -------------- | ------------------ | ------------------- | ------------------------ |
| BullMQ + Redis | Robust, retries    | Requires Redis      | Additional infra for MVP |
| Inngest        | Serverless queues  | External service    | Keep it simple for MVP   |
| Trigger.dev    | Modern, TypeScript | External dependency | Cron sufficient for now  |

### Implementation Notes

- Tasks: cleanup expired data, PDF generation (if async)
- Endpoint: `POST /api/tasks/{task-name}`
- Vercel cron config in `vercel.json`
- Idempotency key in request body
- Log task execution for debugging

---

## 10. Remaining Unknowns (Deferred)

### BYOK Server-Side Storage

- **MVP**: Browser-only (localStorage)
- **Future**: If needed, consider encrypted storage with user-derived key
- **Why deferred**: Browser storage sufficient for MVP, no security risk

### Admin App Authentication

- **MVP**: Same Google OAuth, same session, role check
- **Future**: Separate admin credentials if security requirements change
- **Why deferred**: Role-based access sufficient for MVP

### Match Score Algorithm

- **MVP**: LLM-provided scores
- **Future**: Hybrid approach with keyword extraction + LLM assessment
- **Why deferred**: LLM scores provide reasonable baseline

---

## Summary

All major technology decisions resolved. Implementation can proceed with:

1. PostgreSQL + Drizzle ORM (data layer)
2. nuxt-auth-utils (authentication)
3. Playwright (PDF generation)
4. Vercel Blob (file storage)
5. OpenAI + Gemini Flash (LLM)
6. In-memory rate limiting
7. mammoth + pdf-parse (document parsing)
8. @nuxtjs/i18n (internationalization)
9. Cron endpoints (background tasks)

No blocking unknowns remain.
