# Implementation Plan: Cover Letter Generation MVP

**Branch**: `015-cover-letter-generation` | **Date**: 2026-02-21 | **Spec**: `/Users/kolobok/WebstormProjects/_My/resume-editor/specs/015-cover-letter-generation/spec.md`
**Input**: Feature specification from `/specs/015-cover-letter-generation/spec.md`

## Summary

Implement a complete cover-letter flow for vacancy detail pages:

1. Runtime generation endpoint backed by `cover_letter_generation` scenario.
2. Latest-only cover-letter persistence with PATCH-first incremental updates.
3. Site cover page with generation inputs, edit/preview workspace, copy and PDF export.
4. Dedicated cover-letter PDF prepare/payload/file + preview route.

## Technical Context

**Language/Version**: TypeScript 5.x (Nuxt 4 / Vue 3)
**Primary Dependencies**: Nuxt 4, NuxtUI 4, Pinia, Zod, Drizzle ORM, Playwright-based PDF export service
**Storage**: PostgreSQL (Drizzle schema under `packages/nuxt-layer-api/server/data/`)
**Testing**: Vitest unit/integration, Playwright smoke, `pnpm typecheck`, `pnpm lint`
**Target Platform**: Web (site + API)
**Project Type**: Nuxt monorepo with layered packages
**Performance Goals**:

- Cover generation request should be single-call orchestration in MVP.
- Cover edit autosave should be incremental PATCH with debounced requests.

**Constraints**:

- Keep vacancy status model unchanged.
- Cover MVP languages: `en`, `da`.
- No extraction-checklist and no universal stale badge UI in MVP.
- Use `useApi()` on client; no direct `$fetch`.

**Scale/Scope**:

- New schema/entity for cover letter.
- New LLM orchestration service + prompts.
- New runtime APIs and dedicated PDF endpoints.
- New site page replacing placeholder route.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                    | Status | Evidence                                                                           |
| ---------------------------- | ------ | ---------------------------------------------------------------------------------- |
| I. Documentation Is Binding  | PASS   | `docs/codestyle/base.md`, `docs/architecture/*`, `docs/api/*` used for conventions |
| II. Nuxt Stack Invariants    | PASS   | Nuxt 4 / NuxtUI 4 patterns preserved                                               |
| III. Schema-First Contracts  | PASS   | New cover-letter contracts added in `@int/schema` before API/UI wiring             |
| IV. Store/Action Data Flow   | PASS   | Site uses infrastructure API + Pinia store actions                                 |
| V. i18n and SSR Requirements | PASS   | New UI labels added to i18n; route-level UX remains SSR-compatible                 |

## Project Structure

### Documentation (this feature)

```text
specs/015-cover-letter-generation/
├── spec.md
├── plan.md
└── tasks.md
```

### Source Code (repository root)

```text
packages/schema/
├── constants/enums.ts
├── schemas/cover-letter.ts
└── index.ts

packages/nuxt-layer-api/
├── server/
│   ├── data/
│   │   ├── schema.ts
│   │   ├── migrations/
│   │   └── repositories/cover-letter.ts
│   ├── services/llm/
│   │   ├── cover-letter.ts
│   │   └── prompts/cover-letter.ts
│   ├── api/
│   │   ├── vacancies/[id]/cover-letter.get.ts
│   │   ├── vacancies/[id]/cover-letter/generate.post.ts
│   │   ├── cover-letters/[id].patch.ts
│   │   └── cover-letter/pdf/*.ts
│   └── utils/cover-letter-pdf-store.ts
└── types/vacancies.ts

apps/site/
├── i18n/locales/en.json
├── layers/vacancy/app/
│   ├── infrastructure/cover-letter.api.ts
│   ├── stores/index.ts
│   └── pages/vacancies/[id]/cover.vue
└── layers/_base/app/pages/cover-letter/pdf/preview.vue
```

**Structure Decision**: Reuse vacancy/domain layering and existing PDF export primitives while keeping cover-letter export endpoints dedicated in MVP.

## Implementation Phases

### Phase 1: Contracts and persistence

1. Add `@int/schema` contracts for cover-letter domain and enums.
2. Extend API DB schema with `cover_letters` table and add migration.
3. Implement `coverLetterRepository` with latest-per-vacancy and patch operations.

### Phase 2: LLM runtime and API endpoints

1. Implement cover-letter prompt pack and generation service with JSON parsing/validation.
2. Add GET/POST/PATCH cover-letter endpoints with ownership and validation checks.
3. Add migration adjustment to enforce `response_format=json` for cover scenario default assignments.

### Phase 3: Dedicated cover-letter PDF path

1. Implement dedicated payload store util for cover-letter PDF.
2. Add `/api/cover-letter/pdf/prepare`, `/payload`, `/file` endpoints.
3. Add dedicated preview page for PDF rendering.

### Phase 4: Site UX integration

1. Add client infrastructure API methods for cover-letter calls.
2. Extend vacancy store with cover-letter fetch/generate/patch actions and state.
3. Replace cover placeholder page with full MVP UI:
   - blocked state without generation,
   - generation inputs,
   - edit/preview toggle,
   - autosave patch,
   - copy plain text,
   - PDF download.

### Phase 5: Validation and smoke

1. Add/adjust tests for cover-letter API/service and frontend flow where feasible.
2. Run `pnpm typecheck`, `pnpm lint`, `pnpm test` (or targeted suites).
3. Run Playwright-based basic functional smoke for cover route and actions.

## Risk Assessment

| Risk                                     | Impact | Mitigation                                                                 |
| ---------------------------------------- | ------ | -------------------------------------------------------------------------- |
| LLM returns malformed JSON               | High   | Strict zod parse + guarded JSON extraction + fail-fast without persistence |
| Autosave PATCH races                     | Medium | Debounced save with in-flight guard/epoch pattern in store                 |
| PDF regression with existing resume flow | Medium | Keep dedicated cover-letter endpoints and separate preview route           |
| Feature complexity in one pass           | Medium | Phase-based delivery and incremental checks with tests/lint/typecheck      |

## Dependencies

- Phase 1 blocks all runtime work.
- Phase 2 blocks site integration.
- Phase 3 can run parallel to Phase 4 once core contracts exist.
- Phase 5 runs after all implementation phases.

## Complexity Tracking

No constitution violations requiring exception handling.
