# Implementation Plan: Foundation MVP

**Branch**: `001-foundation-mvp` | **Date**: 2026-01-22 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-foundation-mvp/spec.md`

## Summary

Build an end-to-end resume tailoring MVP: users upload DOCX/PDF resumes, LLM parses them to strict JSON, users create vacancies, generate tailored resume versions with match scoring, and export ATS/Human-friendly PDFs. Includes Google OAuth, role-based limits, BYOK support, and admin controls.

## Technical Context

**Language/Version**: TypeScript 5.x (Nuxt 4 / Vue 3)
**Primary Dependencies**:

- Nuxt v4 (framework)
- NuxtUI v4 (component library)
- nuxt-auth-utils (authentication)
- Drizzle ORM (database)
- Zod (validation)
- date-fns (date formatting/parsing)
- Playwright (PDF generation)
- OpenAI SDK / Google AI SDK (LLM)

**Storage**:

- PostgreSQL (external: Supabase/Neon)
- Vercel Blob (file storage via adapter)
- SQLite (local development)

**Testing**: Vitest (unit/integration), Playwright (E2E)
**Target Platform**: Vercel (serverless), SSR + Edge-compatible
**Project Type**: Web application (Nuxt monorepo with layers)

**Performance Goals**:

- API response <500ms p95 for CRUD operations
- LLM operations: best-effort (dependent on provider)
- PDF export: <10s for typical resume

**Constraints**:

- Data-access layer isolated (no ORM in API handlers)
- Storage abstraction (put/get/delete interface)
- i18n from day 1 (no hardcoded strings)
- SSR islands for ATS/Human views

**Scale/Scope**:

- MVP: <1000 users
- ~12 site pages, ~4 admin pages
- 8 entities, 25+ API endpoints

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

The constitution template is not yet customized for this project. Applying ApplyKit-specific conventions from `docs/` and `CLAUDE.md`:

| Principle                     | Status | Notes                                |
| ----------------------------- | ------ | ------------------------------------ |
| Nuxt v4 + NuxtUI v4 only      | PASS   | Confirmed in stack                   |
| Monorepo with @int/\* layers  | PASS   | Schema, API, UI layers defined       |
| Strict schemas in @int/schema | PASS   | Zod + inferred types                 |
| Store/actions pattern         | PASS   | Pinia stores planned                 |
| SSR islands for ATS/Human     | PASS   | Specified in spec                    |
| i18n from day 1               | PASS   | Key conventions defined              |
| VueUse first                  | PASS   | Will check before custom composables |
| MCP docs rule                 | PASS   | Will use Nuxt/NuxtUI MCP             |

**Gate Status: PASS** - No violations. Proceed to Phase 0.

## Project Structure

### Documentation (this feature)

```text
specs/001-foundation-mvp/
├── spec.md              # Feature specification (complete)
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (OpenAPI specs)
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
apps/
├── site/                          # User-facing Nuxt app
│   ├── app/                       # Nuxt 4 app directory (keep thin: orchestration only)
│   │   ├── app.vue
│   │   ├── app.config.ts
│   │   ├── layouts/
│   │   ├── pages/                 # Route pages that mount feature modules
│   │   └── plugins/               # App plugins (store-init)
│   ├── layers/                    # App-internal Nuxt layers (feature slices)
│   │   ├── _base/                 # @site/base     (shared app logic for other site layers)
│   │   │   ├── app/
│   │   │   │   ├── components/
│   │   │   │   ├── composables/
│   │   │   │   ├── stores/
│   │   │   │   ├── utils/
│   │   │   │   └── middleware/
│   │   │   └── nuxt.config.ts     # defines unique alias for cross-layer imports
│   │   ├── landing/               # @site/landing  (homepage, marketing sections)
│   │   │   ├── app/
│   │   │   └── nuxt.config.ts
│   │   ├── auth/                  # @site/auth     (login/register, auth UI)
│   │   │   ├── app/
│   │   │   └── nuxt.config.ts
│   │   ├── profile/               # @site/profile  (user profile management)
│   │   │   ├── app/
│   │   │   └── nuxt.config.ts
│   │   ├── resume/                # @site/resume   (resume upload, editing, management)
│   │   │   ├── app/
│   │   │   └── nuxt.config.ts
│   │   └── vacancy/               # @site/vacancy  (vacancy pages + business logic)
│   │       ├── app/
│   │       └── nuxt.config.ts
│   ├── public/                    # Static assets
│   └── nuxt.config.ts             # Extends @int/ui, @int/api + ./layers/*
│
└── admin/                         # Admin Nuxt app
    ├── app/                       # Nuxt 4 app directory (keep thin: orchestration only)
    │   ├── app.vue
    │   ├── app.config.ts
    │   ├── layouts/
    │   ├── pages/
    │   └── plugins/
    ├── layers/                    # App-internal Nuxt layers (feature slices)
    │   ├── _base/                 # @admin/base    (shared app logic for other admin layers)
    │   │   ├── app/
    │   │   │   ├── components/
    │   │   │   ├── composables/
    │   │   │   ├── stores/
    │   │   │   ├── utils/
    │   │   │   └── middleware/
    │   │   └── nuxt.config.ts
    │   ├── auth/                  # @admin/auth
    │   │   ├── app/
    │   │   └── nuxt.config.ts
    │   ├── users/                 # @admin/users
    │   │   ├── app/
    │   │   └── nuxt.config.ts
    │   └── system/                # @admin/system  (budget, kill-switch, system flags)
    │       ├── app/
    │       └── nuxt.config.ts
    └── nuxt.config.ts             # Extends @int/ui, @int/api + ./layers/*

packages/
├── schema/                        # (package: @int/schema) NOT a Nuxt layer package
│   ├── package.json               # required
│   ├── schemas/                   # Zod schemas by domain
│   │   ├── user.ts
│   │   ├── profile.ts
│   │   ├── resume.ts
│   │   ├── vacancy.ts
│   │   ├── generation.ts
│   │   └── system.ts
│   ├── types/                     # Inferred types export
│   └── index.ts                   # Public API
│
├── nuxt-layer-api/                # (package: @int/api) Nuxt layer package
│   ├── package.json               # required
│   ├── .playground/               # isolated debugging app
│   ├── server/
│   │   ├── api/
│   │   ├── routes/
│   │   ├── data/
│   │   ├── services/
│   │   ├── storage/
│   │   ├── tasks/
│   │   ├── utils/
│   │   └── plugins/
│   ├── app/
│   │   └── composables/
│   └── nuxt.config.ts
│
└── nuxt-layer-ui/                 # (package: @int/ui) Nuxt layer package
    ├── package.json               # required
    ├── .playground/               # isolated debugging app
    ├── app/
    │   ├── components/
    │   └── composables/
    ├── assets/
    └── nuxt.config.ts

tests/
├── unit/
├── integration/
└── e2e/
```

**Structure Decision**: Nuxt monorepo with pnpm workspaces. Three layer packages (@int/schema, @int/api, @int/ui) consumed by two apps (site, admin). Data-access isolated in `server/data/`, storage abstracted in `server/storage/`.

## Complexity Tracking

No constitution violations requiring justification.

| Aspect                    | Decision | Rationale                                                        |
| ------------------------- | -------- | ---------------------------------------------------------------- |
| 3 layer packages          | Required | Schema/API/UI separation is standard for typed monorepos         |
| Repository pattern        | Required | Enables DB/ORM migration without API changes (per clarification) |
| Storage adapter           | Required | Enables Vercel Blob ↔ S3/Netlify swap (per clarification)        |
| Background tasks via cron | Simpler  | Avoids job queue dependency for MVP                              |

---

## Phase 0: Research Summary

See [research.md](./research.md) for detailed findings.

### Key Decisions

| Topic         | Decision                              | Rationale                                          |
| ------------- | ------------------------------------- | -------------------------------------------------- |
| Database      | PostgreSQL + Drizzle ORM              | Type-safe, migration support, SQLite for local dev |
| Auth          | nuxt-auth-utils                       | Nuxt-native, lightweight, Google OAuth             |
| PDF           | Playwright                            | Serverless-compatible, full CSS fidelity           |
| Storage       | Vercel Blob + adapter                 | Portable, pay-per-use                              |
| LLM           | OpenAI primary, Gemini Flash fallback | Quality vs cost tradeoff                           |
| Rate limiting | In-memory for MVP                     | Redis post-MVP if needed                           |

### Remaining Unknowns (Low Impact)

| Topic                 | Default Decision                | Can Revisit                |
| --------------------- | ------------------------------- | -------------------------- |
| BYOK server storage   | Browser-only for MVP            | Post-MVP                   |
| Admin app auth        | Same Google OAuth, same session | If security concern arises |
| Match score algorithm | LLM-provided                    | If accuracy issues         |

---

## Phase 1: Design Artifacts

- **Data Model**: [data-model.md](./data-model.md)
- **API Contracts**: [contracts/](./contracts/)
- **Quickstart Guide**: [quickstart.md](./quickstart.md)

---

## Next Steps

1. Generate Phase 0 research.md
2. Generate Phase 1 artifacts (data-model.md, contracts/, quickstart.md)
3. Run `/speckit.tasks` for task breakdown
