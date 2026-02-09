# Quickstart: 008 - Admin LLM Model Catalog and Routing

## Prerequisites

- Node.js 20+
- pnpm 9+
- Local PostgreSQL configured for `@int/api`
- Workspace bootstrapped (`pnpm install`)

## Implementation order

### Phase 1: Schema and migration foundation

1. Add schemas/enums in `@int/schema`:
   - `LlmModel*` schemas
   - `LlmScenario*` schemas
   - routing schemas
   - remove `byokEnabled` from role settings schema
   - update usage/provider schemas for post-BYOK behavior

2. Update DB schema in `packages/nuxt-layer-api/server/data/schema.ts`:
   - add `llm_models`
   - add `llm_scenarios`
   - add `llm_scenario_models`
   - add `llm_role_scenario_overrides`
   - remove `llm_keys`
   - remove `role_settings.byok_enabled`

3. Generate and run migrations:

```bash
cd /Users/kolobok/WebstormProjects/_My/resume-editor
pnpm --filter @int/api db:generate
pnpm --filter @int/api db:migrate
```

4. Seed baseline records:
   - scenarios (`resume_parse`, `resume_adaptation`, `cover_letter_generation`)
   - initial active models for OpenAI/Gemini
   - initial scenario defaults

### Phase 2: Server repositories and runtime integration

5. Add repositories:
   - `llm-model.ts`
   - `llm-routing.ts`

6. Refactor LLM runtime:
   - add scenario-aware resolver in `services/llm/index.ts`
   - integrate in parse/generate service calls
   - remove BYOK branch and `userApiKey` option path

7. Remove BYOK server artifacts:
   - delete `/api/keys/*`
   - remove `llm-key` repository usage
   - remove `x-api-key` handling in parse/generate endpoints

### Phase 3: Admin API and client flows

8. Implement admin endpoints for:
   - models CRUD
   - routing read/write
   - role override write/delete

9. Add admin client API infrastructure, composables, and stores:
   - model catalog flows
   - routing flows

10. Add admin pages:

- `/llm/models`
- `/llm/routing`

11. Update existing admin roles/system modules:

- remove BYOK fields from roles page and endpoint contracts
- normalize usage provider display for platform-only behavior

### Phase 4: Site/profile cleanup and i18n

12. Remove BYOK UI from profile settings page and remove KeyManager component usage.

13. Add/adjust i18n keys:

- admin model/routing labels
- validation and action messages
- remove stale BYOK strings where no longer used

### Phase 5: Validation and documentation

14. Update documentation:

- `docs/api/endpoints.md`
- `docs/api/schemas.md`
- `docs/architecture/security-privacy.md`

15. Run quality checks:

```bash
cd /Users/kolobok/WebstormProjects/_My/resume-editor
pnpm typecheck
pnpm test
```

16. Run targeted e2e/manual checks:

- admin creates model
- admin maps scenario default + role override
- resume parse and vacancy generate use configured model
- BYOK endpoints/flows are no longer available

## Key files to modify

```text
packages/schema/constants/enums.ts
packages/schema/schemas/role-settings.ts
packages/schema/schemas/usage.ts
packages/schema/schemas/llm-model.ts              # NEW
packages/schema/schemas/llm-routing.ts            # NEW
packages/schema/index.ts

packages/nuxt-layer-api/server/data/schema.ts
packages/nuxt-layer-api/server/data/repositories/llm-model.ts        # NEW
packages/nuxt-layer-api/server/data/repositories/llm-routing.ts      # NEW
packages/nuxt-layer-api/server/data/repositories/role-settings.ts
packages/nuxt-layer-api/server/data/repositories/usage-log.ts

packages/nuxt-layer-api/server/services/llm/index.ts
packages/nuxt-layer-api/server/services/llm/types.ts
packages/nuxt-layer-api/server/services/llm/parse.ts
packages/nuxt-layer-api/server/services/llm/generate.ts
packages/nuxt-layer-api/server/services/llm/providers/openai.ts
packages/nuxt-layer-api/server/services/llm/providers/gemini.ts

packages/nuxt-layer-api/server/api/admin/llm/models/*.ts             # NEW
packages/nuxt-layer-api/server/api/admin/llm/routing/*.ts            # NEW
packages/nuxt-layer-api/server/api/admin/roles/[role].put.ts
packages/nuxt-layer-api/server/api/resume/index.post.ts
packages/nuxt-layer-api/server/api/resumes/index.post.ts
packages/nuxt-layer-api/server/api/vacancies/[id]/generate.post.ts
packages/nuxt-layer-api/server/api/keys/*.ts                         # REMOVE

packages/nuxt-layer-api/app/infrastructure/admin-llm-models.api.ts   # NEW
packages/nuxt-layer-api/app/infrastructure/admin-llm-routing.api.ts  # NEW
packages/nuxt-layer-api/app/stores/admin-llm-models.ts               # NEW
packages/nuxt-layer-api/app/stores/admin-llm-routing.ts              # NEW
packages/nuxt-layer-api/app/stores/admin-roles.ts
packages/nuxt-layer-api/app/stores/admin-system.ts

apps/admin/app/pages/llm/models.vue                                   # NEW
apps/admin/app/pages/llm/routing.vue                                  # NEW
apps/admin/layers/roles/app/pages/roles/[role].vue

apps/site/layers/profile/app/pages/settings.vue
apps/site/layers/profile/app/components/KeyManager.vue               # REMOVE usage and/or file
```

## Smoke verification checklist

1. `GET /api/admin/llm/models` returns seeded catalog.
2. `PUT /api/admin/llm/routing/{scenario}/default` updates runtime selection.
3. Role override route changes model for selected role only.
4. Parse/generate flows succeed without `x-api-key`.
5. Old `/api/keys/*` endpoints are absent.
6. Admin role edit form has no BYOK toggle.
7. Usage dashboard does not expose BYOK as active provider dimension.
