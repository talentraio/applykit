# 008 — Admin LLM Model Catalog & Scenario Routing

## Documentation Gate _(mandatory)_

- Before implementation, read and follow `docs/codestyle/base.md`.
- Load additional docs as needed:
  - `docs/architecture/*`
  - `docs/api/*`
  - `docs/codestyle/*`

## Overview

Current LLM model selection and pricing are hardcoded in provider adapters:

- `packages/nuxt-layer-api/server/services/llm/providers/openai.ts` (package: `@int/api`)
- `packages/nuxt-layer-api/server/services/llm/providers/gemini.ts` (package: `@int/api`)

Admin users cannot manage model metadata, costs, or scenario-level model mapping from UI.
This feature introduces an admin control plane with:

1. Model catalog CRUD (provider model registry + pricing/capabilities)
2. Scenario routing configuration (default model per scenario)
3. Role-level routing overrides (optional model per role+scenario)

The runtime `callLLM` flow continues to be the single orchestration entrypoint and resolves
model settings via stored configuration instead of adapter hardcode.

## Goals

- Remove hardcoded model pricing/capability data from LLM providers.
- Enable `super_admin` to manage an internal model library from admin UI.
- Configure default model per LLM scenario without code changes.
- Allow per-role override for selected scenarios.
- Remove BYOK flow and keep only platform-managed provider keys.
- Keep existing limits/safety behavior intact (platform enable flags, daily budget, global budget).
- Prepare billing-ready usage attribution by model/scenario (foundation only, not full billing UI).

## Non-goals

- Implementing full billing product UX (plans, invoices, subscriptions).
- Replacing runtime provider SDK usage with a third-party CRM.
- Introducing monthly/yearly quota engine in this iteration.
- Implementing provider-specific prompt orchestration framework migration in this iteration.
- Building external customer-support CRM workflows.

## Scope

### In scope

1. Add internal data model for LLM catalog and routing configuration.
2. Add admin API endpoints for:
   - models CRUD
   - scenario default model mapping
   - role+scenario override mapping
3. Add admin UI pages:
   - model library page (CRUD)
   - routing page (scenario defaults + role overrides)
4. Extend runtime model resolution in `callLLM` to use configured model by scenario/role.
5. Add/update Zod schemas in `@int/schema` for new entities and endpoint payloads.
6. Add i18n keys for all new admin UI strings.
7. Keep parse/generate pipelines Zod validation behavior unchanged.
8. Remove BYOK functionality from API/runtime/admin settings:
   - stop accepting `x-api-key` in parse/generate endpoints
   - remove BYOK fields from role settings UI/API/schema
   - remove key metadata endpoints/storage related to BYOK

### Out of scope

- Payment checkout, subscriptions, invoices, or customer portal.
- Migrating historical usage rows to new pricing strategy beyond required backfill defaults.
- Cover-letter generation implementation itself (only routing readiness for scenario mapping).

## Roles & limits

- `super_admin`:
  - Full access to model catalog and scenario routing endpoints/pages.
  - Can activate/deactivate models and modify routing.
- `friend`:
  - No access to admin model/routing management.
  - Runtime LLM model is selected by configured scenario/role routing.
- `public`:
  - No access to admin endpoints/pages and no authenticated generation.

BYOK removal policy:

- Platform-managed keys are the only supported execution path.
- Any BYOK-specific request/header contract is removed from API surface.
- Usage provider type for LLM operations becomes platform-only.

## User flows

### 1. Maintain model library (admin)

1. `super_admin` opens admin model page.
2. System loads model list with provider, key, status, pricing, capabilities.
3. Admin creates or edits a model record.
4. Validation prevents duplicate active model entries for same provider+model key.
5. Save persists model and updates list view.

### 2. Set scenario default model

1. `super_admin` opens routing page.
2. System shows scenarios and current default model assignment.
3. Admin selects a model from active catalog for a scenario.
4. Save updates scenario default mapping.

### 3. Set role override for scenario

1. On routing page, admin expands scenario role overrides.
2. Admin selects role (`super_admin`/`friend`/`public`) and assigns model.
3. Save persists override.
4. Runtime resolver uses override before scenario default.

### 4. Runtime resolution on parse/generate

1. Server API handler calls parse/generate LLM service with scenario identifier.
2. Resolver chooses model in order:
   - role+scenario override
   - scenario default
   - provider adapter fallback default (guard rail)
3. Provider call executes with resolved model.
4. Usage log stores model/provider/cost/tokens as usual.

## UI/pages

### Page A: Model Library

- Proposed route: `/llm/models` in admin app.
- Capabilities:
  - list/search/filter models
  - create model
  - edit model fields
  - activate/deactivate model

### Page B: Scenario Routing

- Proposed route: `/llm/routing` in admin app.
- Capabilities:
  - display scenarios used by runtime (parse/generate + future cover)
  - set scenario default model
  - set/remove per-role model override

Only these two pages are in scope for this feature.

## Data model

All contracts are schema-first in `packages/schema/` (package: `@int/schema`) with Zod + inferred
types.

### Entity: LlmModel

- `id: uuid`
- `provider: LLMProvider` (`openai` | `gemini` for MVP)
- `modelKey: string` (provider model id)
- `displayName: string`
- `status: 'active' | 'disabled' | 'archived'`
- `inputPricePer1mUsd: number`
- `outputPricePer1mUsd: number`
- `cachedInputPricePer1mUsd?: number | null`
- `maxContextTokens?: number | null`
- `maxOutputTokens?: number | null`
- `supportsJson: boolean`
- `supportsTools: boolean`
- `supportsStreaming: boolean`
- `notes?: string | null`
- `createdAt`, `updatedAt`

### Entity: LlmScenario

- `key: string` (enum-backed in `@int/schema`)
- `label: string`
- `description?: string`
- `enabled: boolean`

Initial scenario keys:

- `resume_parse`
- `resume_adaptation`
- `cover_letter_generation` (routing-ready even if feature is not implemented yet)

### Entity: LlmScenarioModel

- `scenarioKey: LlmScenarioKey`
- `modelId: uuid` (FK -> `llm_models`)
- `temperature?: number | null`
- `maxTokens?: number | null`
- `responseFormat?: 'text' | 'json' | null`
- `updatedAt`

### Entity: LlmRoleScenarioOverride

- `role: Role` (`super_admin` | `friend` | `public`)
- `scenarioKey: LlmScenarioKey`
- `modelId: uuid` (FK -> `llm_models`)
- `temperature?: number | null`
- `maxTokens?: number | null`
- `responseFormat?: 'text' | 'json' | null`
- `updatedAt`

### Storage location

- DB schema + migrations in `packages/nuxt-layer-api/server/data/` (package: `@int/api`)
- Repositories in `packages/nuxt-layer-api/server/data/repositories/` (package: `@int/api`)

## API surface

All endpoints follow Nuxt/Nitro conventions under `packages/nuxt-layer-api/server/api/` (package:
`@int/api`). All endpoints below require `super_admin`.

### Models CRUD

- `GET /api/admin/llm/models`
  - returns `{ items: LlmModel[] }`
- `POST /api/admin/llm/models`
  - body: `LlmModelCreateInput`
  - returns `LlmModel`
- `PUT /api/admin/llm/models/:id`
  - body: `LlmModelUpdateInput`
  - returns `LlmModel`
- `DELETE /api/admin/llm/models/:id`
  - soft delete/deactivate behavior (no hard delete if referenced)

### Scenario routing

- `GET /api/admin/llm/routing`
  - returns scenarios + default model + role overrides
- `PUT /api/admin/llm/routing/:scenarioKey/default`
  - body: `{ modelId, temperature?, maxTokens?, responseFormat? }`
- `PUT /api/admin/llm/routing/:scenarioKey/roles/:role`
  - body: `{ modelId, temperature?, maxTokens?, responseFormat? }`
- `DELETE /api/admin/llm/routing/:scenarioKey/roles/:role`
  - removes role override for scenario

### Runtime impact

- Existing parse/generate endpoints remain stable:
  - `POST /api/resume`
  - `POST /api/vacancies/:id/generate`
- BYOK request contract is removed:
  - no `x-api-key` handling in parse/generate flows
- Internal service contract extends with optional `scenario` argument to resolve model.

## LLM workflows

### Parse workflow

- Endpoint receives file and parsed text.
- `parseResumeWithLLM` calls `callLLM` with scenario `resume_parse`.
- Response still validated by Zod in parse service.
- No change to parsing output schema.

### Generate workflow

- Endpoint loads resume + vacancy.
- `generateResumeWithLLM` calls `callLLM` with scenario `resume_adaptation`.
- Response still validated by Zod in generate service.
- No change to generated response schema.

Validation location remains unchanged in:

- `packages/nuxt-layer-api/server/services/llm/parse.ts` (package: `@int/api`)
- `packages/nuxt-layer-api/server/services/llm/generate.ts` (package: `@int/api`)

## Limits & safety

Existing controls remain mandatory:

- Per-role platform enable flags (`platformLlmEnabled`)
- Per-user daily budget cap (`dailyBudgetCap`) for platform usage
- Global platform budget cap (`systemConfigRepository.canUseGlobalBudget`)
- Admin-only access to model/routing management

Safety rules for routing:

- Disabled/archived models cannot be newly assigned.
- If assigned model becomes unavailable, resolver falls back to provider default and logs warning.
- Deleting referenced model must be blocked or converted to soft-disable.

## Security & privacy

- No secrets are stored in model catalog records.
- API authorization for all admin model/routing endpoints is `super_admin` only.
- Audit logging for model/routing changes is required (who changed what and when).
- BYOK key metadata endpoints/storage are removed from active runtime path.

## i18n keys

Add keys in admin locale files for:

- navigation labels (`admin.nav.llmModels`, `admin.nav.llmRouting`)
- model catalog labels/errors/success messages
- routing labels/errors/success messages
- scenario names and helper text
- validation messages (duplicate model, invalid pricing, inactive model selection)

No hardcoded UI strings in components.

## Monorepo/layers touchpoints

- Admin pages/UI:
  - `apps/admin/` (app)
  - `packages/nuxt-layer-api/app/` (package: `@int/api`) for admin APIs/stores/composables
- API + runtime routing:
  - `packages/nuxt-layer-api/server/api/admin/` (package: `@int/api`)
  - `packages/nuxt-layer-api/server/services/llm/` (package: `@int/api`)
- Data persistence:
  - `packages/nuxt-layer-api/server/data/` (package: `@int/api`)
- Shared schemas/types:
  - `packages/schema/` (package: `@int/schema`)

## Acceptance criteria

1. Admin can create, edit, list, and deactivate LLM models from UI without code changes.
2. Admin can assign default model per scenario and role-specific overrides.
3. Parse/generate requests resolve model via DB configuration and continue to pass current Zod
   validations.
4. Hardcoded pricing maps in provider adapters are no longer the primary source of truth.
5. Existing budget and role controls continue to work without regression.
6. All new UI strings are i18n-backed.
7. Unit/integration tests cover resolver precedence and routing persistence behavior.
8. BYOK-specific runtime/API/admin functionality is removed without breaking platform-key flows.

## Edge cases

- Scenario has no default model and no role override.
- Role override points to inactive model.
- Model is deactivated while still referenced by routing.
- Admin tries to delete model that is currently mapped to any scenario/role.
- Provider returns missing token details; cost calculation fallback still works.
- Legacy client still sends `x-api-key` header after BYOK removal.

## Testing plan

- Unit tests:
  - model/routing repositories
  - runtime resolver precedence (role override > scenario default > provider fallback)
  - validation of CRUD payloads in Zod schemas
- Integration tests:
  - admin model/routing endpoints auth and behavior
  - parse/generate endpoints selecting configured model
  - limits still enforced with routed models
- E2E tests:
  - admin creates model, maps scenario, triggers parse/generate from app, verifies selected model
    recorded in usage logs

## Open questions / NEEDS CLARIFICATION

1. **Billing architecture**: use Stripe-only metering initially or add dedicated usage-billing layer
   (e.g., Lago/Orb/Metronome) in near term?
2. **Scenario taxonomy**: confirm final scenario key set for MVP (parse/adapt/cover + any scoring
   split scenario).
3. **Provider expansion**: should this feature include provider enum expansion beyond
   `openai|gemini`, or defer until first additional provider rollout?
4. **Cost source of truth**: should runtime always use catalog prices, or provider-reported cost when
   available with catalog as fallback?
