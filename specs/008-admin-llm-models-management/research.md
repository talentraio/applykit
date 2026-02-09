# Research: 008 - Admin LLM Model Catalog and Routing

## R1: Source of truth for model pricing/capabilities

**Decision**: Move model pricing and capability metadata to `llm_models` DB records and treat that as
the runtime source of truth.

**Rationale**: Current adapters keep per-model pricing maps in code
(`providers/openai.ts`, `providers/gemini.ts`). That requires deploys for every pricing change and
creates drift risk across providers.

**Alternatives considered**:

- Keep adapter hardcode and only add admin UI labels:
  - Rejected, because business logic remains duplicated in code.
- Use provider API for pricing at runtime:
  - Rejected, because pricing APIs are not consistently available and add runtime coupling.

## R2: Scenario taxonomy for this phase

**Decision**: Introduce explicit scenario keys:

- `resume_parse`
- `resume_adaptation`
- `cover_letter_generation`

**Rationale**: Parse and adaptation are already separate runtime workflows. Cover letter is not fully
implemented yet, but routing should be prepared now to avoid schema churn.

**Alternatives considered**:

- Single generic `generation` scenario:
  - Rejected, because parse and adaptation have different constraints.
- Add many fine-grained scenarios now (including separate scoring):
  - Deferred, can be added after first production telemetry.

## R3: Runtime model resolution order

**Decision**: Resolve model configuration in this order:

1. role + scenario override
2. scenario default
3. provider fallback default (adapter-level safety fallback)

**Rationale**: This enables precise control when needed while maintaining deterministic behavior if
admin configuration is incomplete.

**Alternatives considered**:

- Role global default before scenario default:
  - Rejected, because scenario-specific tuning should take precedence.
- Fail hard when mapping missing:
  - Rejected for MVP reliability; fallback prevents operational outages.

## R4: BYOK removal strategy

**Decision**: Remove BYOK end-to-end in this feature.

Removal scope:

- no BYOK header usage in parse/generate endpoints
- remove `/api/keys/*` endpoints and key metadata repository/table usage
- remove `byokEnabled` from role settings schema/API/UI
- remove profile settings BYOK UI

**Rationale**: Product direction changed to platform-managed provider strategy. Keeping BYOK doubles
configuration complexity and complicates multi-provider scenario routing.

**Alternatives considered**:

- Keep dormant BYOK with hidden UI:
  - Rejected, leaves dead runtime branches and maintenance burden.
- Soft deprecation first:
  - Rejected, as user explicitly requested full removal.

## R5: Provider type analytics after BYOK removal

**Decision**: Stop writing new `byok` usage records; normalize legacy `byok` rows into platform view
in admin analytics responses.

**Rationale**: Historical rows may exist. Hard-removing enum value can cause migration risk and
complicate old data handling. API/UI should expose platform-only behavior post-removal.

**Alternatives considered**:

- Migrate all historical `byok` rows to `platform`:
  - Possible, but optional and not required for correctness in this feature.
- Keep showing BYOK in admin usage charts:
  - Rejected, conflicts with explicit BYOK removal.

## R6: Role settings evolution

**Decision**: Keep role-level controls but simplify to platform-only fields:

- `platformLlmEnabled`
- `platformProvider`
- `dailyBudgetCap`

Remove `byokEnabled`.

**Rationale**: Role-level budget and provider controls are still needed, but BYOK toggle becomes
invalid once BYOK is removed.

**Alternatives considered**:

- Remove role settings entirely and centralize all config in LLM routing:
  - Rejected, because budget and enable/disable are still role-level controls.

## R7: Contract style for this feature

**Decision**: Use OpenAPI YAML for admin LLM endpoints in
`contracts/admin-llm-routing.yaml`.

**Rationale**: Prior specs in this repo already use OpenAPI YAML (for example vacancy status spec),
and it is easy to derive typed contracts and tests from.

**Alternatives considered**:

- Markdown-only endpoint descriptions:
  - Rejected, less precise for request/response validation.

## R8: Runtime integration boundary

**Decision**: Keep `services/llm/index.ts` as the single orchestration entrypoint and add routing
resolution there, rather than scattering routing logic in endpoint handlers.

**Rationale**: Existing architecture already centralizes provider selection, budgets, and key access
logic in `callLLM`. This minimizes refactor risk and keeps parse/generate APIs stable.

**Alternatives considered**:

- Resolve models in each endpoint handler:
  - Rejected, duplicates logic and increases drift risk.
- Resolve models directly in provider adapters:
  - Rejected, adapters should stay provider-focused, not business-routing aware.
