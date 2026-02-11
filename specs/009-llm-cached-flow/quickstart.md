# Quickstart: 009 - Cached Two-Step Resume Adaptation Scoring

## Prerequisites

- Node.js 20+
- pnpm 9+
- Local Postgres configured for `@int/api`
- Workspace bootstrapped (`pnpm install`)

## Phase 1: Dependencies and schema updates

1. Add Mullion + AI SDK dependencies to API workspace.

```bash
cd /Users/kolobok/WebstormProjects/_My/resume-editor
pnpm --filter @int/api add @mullion/core @mullion/ai-sdk ai @ai-sdk/openai @ai-sdk/google
```

2. Update `@int/schema` enums/schemas:

- add `resume_adaptation_scoring` to scenario enum
- add `resume_adaptation_scoring` to usage context enum
- remove BYOK from provider type enum

3. Update DB schema + migration:

- seed scoring scenario row
- normalize `usage_logs.provider_type='byok'` to `platform`
- migrate `provider_type` enum to platform-only values

```bash
cd /Users/kolobok/WebstormProjects/_My/resume-editor
pnpm --filter @int/api db:generate
pnpm --filter @int/api db:migrate
```

## Phase 2: Two-step generation service

4. Split adaptation and scoring logic in `packages/nuxt-layer-api/server/services/llm/generate.ts`.

5. Add scoring prompt module:

- `packages/nuxt-layer-api/server/services/llm/prompts/generate-score.ts`

6. Add deterministic fallback scoring helper to keep generation non-blocking.

7. Integrate Mullion orchestration for shared context between phase calls.

8. Implement explicit Gemini `cachedContent` usage in scoring call path.

## Phase 3: Endpoint and logging integration

9. Refactor endpoint orchestration in:

- `packages/nuxt-layer-api/server/api/vacancies/[id]/generate.post.ts`

10. Update usage logging contexts:

- adaptation call: `resume_adaptation`
- scoring call: `resume_adaptation_scoring`

11. Keep endpoint response shape unchanged for site UI compatibility.

## Phase 4: Admin routing UX grouping

12. Keep backend scenario key separate, but group controls in admin UI:

- `/llm/routing`
- `/roles/[id]`

13. Reuse shared card/composable so save/cancel/dirty-state behavior stays consistent.

## Phase 5: BYOK full purge and docs cleanup

14. Remove BYOK residual references from active runtime docs and terms copy.

15. Ensure codebase no longer contains runtime BYOK execution branches.

## Validation commands

```bash
cd /Users/kolobok/WebstormProjects/_My/resume-editor
pnpm typecheck
pnpm --filter @int/api test
pnpm --filter admin typecheck
pnpm --filter site typecheck
```

## Manual verification checklist

1. Generate on `/vacancies/[id]/overview` succeeds and stores generation.
2. Scores are returned and persisted for normal scoring path.
3. Forced scoring failure still saves generation with fallback scores.
4. `/llm/routing` and `/roles/[id]` show adaptation+scoring grouped controls.
5. Scenario save/update persists and applies to runtime resolution.
6. No BYOK references remain in runtime/API behavior.
