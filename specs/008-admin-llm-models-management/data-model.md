# Data Model: 008 - Admin LLM Model Catalog and Routing

## New entities

### LlmModel

Catalog record for a provider model that can be selected in routing rules.

| Field                    | Type          | Constraints                | Description                          |
| ------------------------ | ------------- | -------------------------- | ------------------------------------ |
| id                       | UUID          | PK                         | Model record id                      |
| provider                 | `LLMProvider` | NOT NULL                   | `openai` or `gemini` (MVP)           |
| modelKey                 | string        | NOT NULL                   | Provider-specific model identifier   |
| displayName              | string        | NOT NULL                   | Human-readable label for admin UI    |
| status                   | enum          | NOT NULL, default `active` | `active` \| `disabled` \| `archived` |
| inputPricePer1mUsd       | decimal(10,6) | NOT NULL, >=0              | Input token price                    |
| outputPricePer1mUsd      | decimal(10,6) | NOT NULL, >=0              | Output token price                   |
| cachedInputPricePer1mUsd | decimal(10,6) | nullable                   | Optional cached input price          |
| maxContextTokens         | integer       | nullable, >0               | Optional context limit               |
| maxOutputTokens          | integer       | nullable, >0               | Optional output limit                |
| supportsJson             | boolean       | NOT NULL, default false    | Model can reliably return JSON       |
| supportsTools            | boolean       | NOT NULL, default false    | Model supports tool calling          |
| supportsStreaming        | boolean       | NOT NULL, default false    | Model supports streaming             |
| notes                    | text          | nullable                   | Admin note                           |
| createdAt                | timestamp     | NOT NULL                   | Creation time                        |
| updatedAt                | timestamp     | NOT NULL                   | Last update time                     |

**Indexes/constraints**:

- unique `(provider, model_key)` for active/usable records policy
- index on `status`
- index on `(provider, status)`

### LlmScenario

List of logical LLM scenarios used by runtime routing.

| Field       | Type      | Constraints            | Description          |
| ----------- | --------- | ---------------------- | -------------------- |
| key         | enum      | PK                     | Scenario key         |
| label       | string    | NOT NULL               | Admin display label  |
| description | text      | nullable               | Optional explanation |
| enabled     | boolean   | NOT NULL, default true | Scenario active flag |
| createdAt   | timestamp | NOT NULL               | Creation time        |
| updatedAt   | timestamp | NOT NULL               | Last update time     |

Initial `key` values:

- `resume_parse`
- `resume_adaptation`
- `cover_letter_generation`

### LlmScenarioModel

Default model assignment per scenario.

| Field          | Type             | Constraints                     | Description                |
| -------------- | ---------------- | ------------------------------- | -------------------------- |
| scenarioKey    | `LlmScenarioKey` | PK, FK -> `llm_scenarios.key`   | Scenario id                |
| modelId        | UUID             | FK -> `llm_models.id`, NOT NULL | Assigned default model     |
| temperature    | decimal(3,2)     | nullable, 0..2                  | Optional scenario override |
| maxTokens      | integer          | nullable, >0                    | Optional scenario override |
| responseFormat | enum             | nullable                        | `text` or `json`           |
| updatedAt      | timestamp        | NOT NULL                        | Last update time           |

Constraint:

- one default record per scenario (PK on `scenario_key`)

### LlmRoleScenarioOverride

Role-specific model assignment for scenario.

| Field          | Type             | Constraints                         | Description                           |
| -------------- | ---------------- | ----------------------------------- | ------------------------------------- |
| role           | `Role`           | NOT NULL                            | `super_admin` \| `friend` \| `public` |
| scenarioKey    | `LlmScenarioKey` | NOT NULL, FK -> `llm_scenarios.key` | Scenario id                           |
| modelId        | UUID             | FK -> `llm_models.id`, NOT NULL     | Override model                        |
| temperature    | decimal(3,2)     | nullable, 0..2                      | Optional override                     |
| maxTokens      | integer          | nullable, >0                        | Optional override                     |
| responseFormat | enum             | nullable                            | `text` or `json`                      |
| updatedAt      | timestamp        | NOT NULL                            | Last update time                      |

Constraint:

- unique `(role, scenario_key)` (single override row per pair)

## Modified existing entities

### RoleSettings (existing)

Current shape includes BYOK toggle. After feature:

- remove `byokEnabled` from schema, API contracts, and storage

Resulting role-level controls:

- `platformLlmEnabled`
- `platformProvider`
- `dailyBudgetCap`

### UsageLog (existing)

`providerType` historically stores `platform` or `byok`.

Post-change behavior:

- no new `byok` rows are created by runtime
- analytics API normalizes output to platform-only view
- historical rows remain readable for compatibility

## Removed entities

### LLMKey (remove)

Remove BYOK metadata entity and related API/UI flow:

- `llm_keys` table
- `/api/keys/*` endpoints
- profile settings BYOK manager

## Relationships

```text
llm_scenarios (1) ----- (1) llm_scenario_models ----- (n) llm_models
      |                              |
      |                              +-- default model per scenario
      |
      +----- (n) llm_role_scenario_overrides ----- (n) llm_models
                         |
                         +-- role-specific override per scenario
```

Runtime resolver lookup:

1. fetch role override by `(role, scenario)`
2. fallback to scenario default
3. fallback to provider adapter default

## Validation rules

1. `inputPricePer1mUsd`, `outputPricePer1mUsd` must be numeric and >= 0.
2. `cachedInputPricePer1mUsd` (if present) must be >= 0.
3. `temperature` (if present) must be within supported bound.
4. Inactive model (`disabled`/`archived`) cannot be assigned in new routing updates.
5. Routing updates require model/provider compatibility checks.
6. Deleting model that is referenced by routing is blocked; use deactivate/archived status.

## State transitions

### LlmModel status

```text
active -> disabled -> active
active -> archived
disabled -> archived
```

`archived` is terminal for assignment; existing references must be remapped before archival or
runtime must fallback safely.

### Routing lifecycle

```text
scenario created -> default model assigned
                 -> optional role override assigned
                 -> role override updated/removed
```

## Migration notes

1. Create new LLM routing tables.
2. Seed `llm_scenarios` rows with required keys.
3. Seed at least one active model per provider from existing defaults.
4. Remove `role_settings.byok_enabled`.
5. Drop `llm_keys` table and remove repository/api usage.
6. Ensure parse/generate endpoints no longer read `x-api-key`.
