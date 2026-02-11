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
├── generate.ts              # two-step adaptation + scoring orchestration
├── mullion.ts               # shared context + Gemini cached-content helpers
├── prompts/
│   ├── generate.ts          # adaptation prompt
│   └── generate-score.ts    # scoring prompt
└── providers/
    ├── openai.ts
    └── gemini.ts
```

## Generate flow

`POST /api/vacancies/:id/generate` executes:

1. Adaptation call (`resume_adaptation`) -> tailored `ResumeContent`
   - strategy-aware prompt (`economy` or `quality`)
   - retry model supported for adaptation scenario
2. Scoring call (`resume_adaptation_scoring`)
   - extract vacancy signals
   - map evidence before/after
   - compute deterministic `matchScoreBefore/After` + `scoreBreakdown`

If scoring fails, generation is still saved with deterministic fallback scores.

## Routing semantics

- Resolution precedence for each scenario:
  - role override
  - scenario default
  - runtime fallback from config
- `strategyKey` applies only to `resume_adaptation`.
- `retryModelId` applies to `resume_parse` and `resume_adaptation`.
- Scoring scenario does not use retry model in current implementation.

## Usage contexts

Generation writes separate usage logs:

- adaptation: `resume_adaptation`
- scoring: `resume_adaptation_scoring`

## Caching behavior

- Shared context is built once and reused across adaptation/scoring prompts.
- OpenAI benefits from automatic prompt-prefix caching (provider-side).
- Gemini uses explicit `cachedContent` when enabled via runtime config.

## Runtime config

Required keys:

- `NUXT_LLM_OPENAI_API_KEY`
- `NUXT_LLM_GEMINI_API_KEY`

Optional cache controls:

- `NUXT_LLM_GEMINI_CACHE_ENABLED` (`true` by default)
- `NUXT_LLM_GEMINI_CACHE_TTL_SECONDS` (`300` by default)

Fallback model config:

- `NUXT_LLM_FALLBACK_PROVIDER`
- `NUXT_LLM_FALLBACK_MODEL`
- `NUXT_LLM_FALLBACK_PRICE_INPUT`
- `NUXT_LLM_FALLBACK_PRICE_OUTPUT`
- `NUXT_LLM_FALLBACK_PRICE_CACHE`
