# LLM Scenarios

This page explains how LLM scenarios work in ApplyKit for both business and engineering audiences.

## What is a scenario?

A scenario is a specific AI task in the product. Each scenario has:

- a business purpose,
- a dedicated routing key,
- configurable model selection (default + role override),
- scenario-level enable flag (with optional role-level enable override),
- optional retry model,
- strategy controls (`economy` / `quality`) where relevant,
- optional reasoning effort control where relevant.

## Routing model (high level)

When the system runs a scenario, it resolves configuration in this order:

1. Role override for the scenario
2. Scenario default
3. Runtime fallback model (from `runtimeConfig.llm.fallbackLlmModel`)

This gives product teams controlled defaults plus optional per-role customization.

## Scenario catalog

| Scenario key                       | Business purpose                                       | Trigger             |
| ---------------------------------- | ------------------------------------------------------ | ------------------- |
| `resume_parse`                     | Convert uploaded resume file into structured JSON      | Resume upload       |
| `resume_adaptation`                | Tailor resume content to vacancy requirements          | Vacancy generation  |
| `resume_adaptation_scoring`        | Quick score delta (`before/after`)                     | During generation   |
| `resume_adaptation_scoring_detail` | Explainable score details (match/gaps/recommendations) | On-demand action    |
| `cover_letter_generation`          | Generate vacancy-specific cover letter                 | Cover letter action |

## Scenario details

### `resume_parse`

**Business view**

- Takes a user upload and creates editable structured resume data.
- Reduces manual copy/paste work and keeps resume data consistent.

**Technical view**

- Input: source file (`docx`/`pdf`).
- Output: validated `ResumeContent` JSON.
- Validation: strict schema checks with retries/fallback behavior in parser service.
- Typical endpoint context: resume upload flow.

### `resume_adaptation`

**Business view**

- Rewrites and reorders resume content for a specific vacancy.
- Keeps one base resume but allows multiple vacancy-specific versions.

**Technical view**

- Input: base resume JSON + vacancy fields + optional profile hints.
- Output: tailored resume JSON persisted as generation.
- Uses shared context assembly and scenario model resolution.
- Supports strategy (`economy` / `quality`) and reasoning effort from routing config.

### `resume_adaptation_scoring`

**Business view**

- Returns lightweight numeric feedback quickly.
- Used as immediate signal after generation.

**Technical view**

- Input: base resume + tailored resume + vacancy.
- Output: `matchScoreBefore`, `matchScoreAfter`, plus breakdown payload.
- Called as part of generation pipeline.
- Designed to be cost-aware and stable for broad usage.

### `resume_adaptation_scoring_detail`

**Business view**

- Gives detailed and explainable diagnostics only when needed.
- Suitable for premium or advanced user experiences.

**Technical view**

- Triggered on demand (separate from base generation).
- Pipeline:
  1. Extract weighted vacancy signals
  2. Map evidence before/after
  3. Compute deterministic summary/breakdown
- Persists results in `generation_score_details` with vacancy version marker.
- Reuse-first behavior to avoid unnecessary recomputation.
- Regeneration allowed only when vacancy state enables it.

### `cover_letter_generation`

**Business view**

- Produces a role-specific cover letter from existing resume + vacancy context.
- Provides a full “application package” experience.

**Technical view**

- Scenario key is available in routing/configuration.
- Dedicated runtime endpoint/flow is currently not exposed in the user API (coming-soon surface).

## Strategies: `economy` vs `quality`

- **Economy**: lower-cost, faster model path for broad/default traffic.
- **Quality**: higher-quality path for premium roles/use-cases.

Important: strategy and model selection should be aligned. Mixed setups are possible but may reduce
predictability in quality/cost outcomes.

## Caching and cost behavior

- Shared prompts are intentionally stable to improve provider-side cache reuse.
- Cache effectiveness may differ by provider/model pair.
- If primary and retry models differ, cache reuse across attempts can be lower.

## Where to configure

- Admin page: scenario defaults (`/llm/routing`)
- Admin page: role-specific overrides (`/roles/[role]`)

## Related docs

- Data flow: [`./data-flow.md`](./data-flow.md)
- Security/privacy: [`./security-privacy.md`](./security-privacy.md)
- API endpoints: [`../api/endpoints.md`](../api/endpoints.md)
