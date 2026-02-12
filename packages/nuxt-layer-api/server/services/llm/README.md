# LLM Service

Platform-managed multi-provider LLM service for `@int/api`.

## Scope

- Providers: OpenAI, Gemini
- Execution mode: **platform-only** (no user-provided key path)
- Budget enforcement: role caps + global budget cap
- Routing: scenario defaults with role overrides + runtime fallback model
- Usage logging: provider type `platform`, scenario usage contexts

## Main files

```
server/services/llm/
├── index.ts                 # provider init + budget checks + scenario resolution
├── routing.ts               # runtime scenario model resolution
├── types.ts                 # request/response and errors
├── generate.ts              # adaptation + lightweight baseline scoring
├── score-details.ts         # on-demand detailed scoring orchestration
├── mullion.ts               # shared context + Gemini cached-content helpers
├── prompts/
│   ├── generate.ts          # adaptation prompt
│   ├── baseline-score.ts    # lightweight baseline scoring prompt
│   └── generate-score.ts    # detailed scoring prompts (signals/evidence mapping)
└── providers/
    ├── openai.ts
    └── gemini.ts
```

## Generate flow

`POST /api/vacancies/:id/generate` executes:

1. Adaptation call (`resume_adaptation`) -> tailored `ResumeContent`
   - strategy-aware prompt (`economy` or `quality`)
   - retry model supported for adaptation scenario
2. Baseline scoring call (`resume_adaptation_scoring`)
   - returns lightweight `matchScoreBefore/After`
   - generates fallback `scoreBreakdown` payload for backward-compatible contracts

If baseline scoring fails, generation is still saved with deterministic fallback scores.

`POST /api/vacancies/:id/generations/:generationId/score-details` executes on demand:

1. Extract weighted signals from vacancy text
2. Map before/after evidence against base/tailored resume
3. Compute deterministic `matchScoreBefore/After` + detailed breakdown
4. Persist `generation_score_details` with vacancy-version marker for reuse/regenerate gating

## Routing semantics

- Resolution precedence for each scenario:
  - role override
  - scenario default
  - runtime fallback from config
- `strategyKey` applies only to `resume_adaptation`.
- `retryModelId` applies to `resume_parse`, `resume_adaptation`, and
  `resume_adaptation_scoring_detail`.

## Usage contexts

Generation writes separate usage logs:

- adaptation: `resume_adaptation`
- baseline scoring: `resume_adaptation_scoring`
- detailed scoring: `resume_adaptation_scoring_detail`

## Caching behavior

- Shared context is built once and reused across adaptation/baseline scoring prompts.
- OpenAI benefits from automatic prompt-prefix caching (provider-side).
- Gemini uses explicit `cachedContent` when enabled via runtime config.

## Runtime config

Required keys:

- `NUXT_LLM_OPENAI_API_KEY`
- `NUXT_LLM_GEMINI_API_KEY`

Optional cache controls:

- `NUXT_LLM_OPENAI_PROMPT_CACHE_ENABLED` (`true` by default)
- `NUXT_LLM_OPENAI_PROMPT_CACHE_MIN_PREFIX_TOKENS` (`1024` by default)
- `NUXT_LLM_OPENAI_PROMPT_CACHE_SAFETY_BUFFER_TOKENS` (`256` by default)
- `NUXT_LLM_GEMINI_CACHE_ENABLED` (`true` by default)
- `NUXT_LLM_GEMINI_CACHE_TTL_SECONDS` (`300` by default)

Fallback model config:

- `NUXT_LLM_FALLBACK_PROVIDER`
- `NUXT_LLM_FALLBACK_MODEL`
- `NUXT_LLM_FALLBACK_PRICE_INPUT`
- `NUXT_LLM_FALLBACK_PRICE_OUTPUT`
- `NUXT_LLM_FALLBACK_PRICE_CACHE`
