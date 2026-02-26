# Cover Letter Locale/Market Onboarding

This guide explains how to add support for a new cover-letter locale and/or market profile.

## Runtime architecture

Cover letter generation combines two independent prompt artifacts:

- Locale pack (`language-packs`): language grammar, greetings/closings, tone/length rules, validations
- Market pack (`market-packs`): country/regional hiring style and presentation settings (for example date format)

Final prompt is assembled in:

- `packages/nuxt-layer-api/server/services/llm/prompts/cover-letter.ts`

Post-processing (header/date/closing injection for `letter`) is server-side and deterministic:

- `packages/nuxt-layer-api/server/services/llm/cover-letter.ts`
- `packages/nuxt-layer-api/server/services/vacancy/cover-letter-locale-presentation.ts`

## Scope decision before coding

Decide what you are adding:

1. New locale only (for example `de-DE`) that can reuse existing market (`default`/`dk`/`ua`)
2. New market only (for example `de`) with existing locale(s)
3. New locale + new market + new UI profile option (for example `Germany (German)`)

## Step-by-step implementation

### 1) Prepare research data (LLM deep research)

Use the prompt template from the section `Deep Research Prompt Template` below.

Expected output from research:

- language conventions for `letter` and `message`
- market conventions for `letter` and `message`
- tone mapping (`professional`, `friendly`, `enthusiastic`, `direct`)
- length guidance
- anti-AI naturalness rules
- validation heuristics (regex/structure)
- greeting and closing candidates
- date format recommendation for the market

### 2) Add schema constants and enums

Update:

- `packages/schema/constants/enums.ts`

Required changes:

- `COVER_LETTER_LOCALE_MAP` (new locale code)
- `COVER_LETTER_LOCALE_META_MAP` (`requiresGrammaticalGender`)
- `COVER_LETTER_MARKET_MAP` (if adding market)
- `COVER_LETTER_DEFAULT_MARKET_BY_LOCALE_MAP`

Notes:

- Locale values are ISO-style (`en`, `da-DK`, `uk-UA`, ...)
- Market values are short codes (`default`, `dk`, `ua`, ...)

### 3) Update DB enum schema and migration

Cover-letter `language` and `market` are PostgreSQL enums in this project.

Update enum sources used in schema:

- `packages/nuxt-layer-api/server/data/schema.ts`

Then generate/apply migration:

```bash
pnpm --filter @int/api db:generate
pnpm --filter @int/api db:migrate
```

If you skip migration, runtime errors like `invalid input value for enum ...` are expected.

### 4) Add locale prompt pack

Create file:

- `packages/nuxt-layer-api/server/services/llm/prompts/cover-letter/language-packs/<locale>.ts`

Use type contract:

- `packages/nuxt-layer-api/server/services/llm/prompts/cover-letter/language-packs/types.ts`

Register pack in:

- `packages/nuxt-layer-api/server/services/llm/prompts/cover-letter/language-packs/index.ts`

If locale must be selectable in app now, add it to:

- `COVER_LETTER_ACTIVE_LANGUAGE_PACKS`

### 5) Add market prompt pack (if needed)

Create file:

- `packages/nuxt-layer-api/server/services/llm/prompts/cover-letter/market-packs/<market>.ts`

Use contract:

- `packages/nuxt-layer-api/server/services/llm/prompts/cover-letter/market-packs/types.ts`

Register in:

- `packages/nuxt-layer-api/server/services/llm/prompts/cover-letter/market-packs/index.ts`

Set market presentation date format in this file:

- `presentation.datePattern`

### 6) Update deterministic presentation config

Update:

- `packages/nuxt-layer-api/server/services/vacancy/cover-letter-locale-presentation.ts`

Required:

- Map locale to `date-fns` locale
- Define `closingByTone` for this locale

### 7) Update UI profile options

Current UI profile selector is in:

- `apps/site/layers/vacancy/app/components/Item/cover/Left/GenerationConfig.vue`

Update:

- locale/market profile map (for example `GERMANY_DE`, `GERMANY_EN`)
- profile labels and i18n keys
- mapping logic `resolveProfileFromSettings` and `applyProfileToSettings`

Also add i18n labels:

- `apps/site/i18n/locales/en.json` (and other locale files when enabled)

### 8) Add/update tests

Minimum test coverage for new locale/market:

- language pack registry and shape:
  - `packages/nuxt-layer-api/tests/unit/services/llm/cover-letter-language-packs.test.ts`
- market/date presentation:
  - `packages/nuxt-layer-api/tests/unit/services/vacancy/cover-letter-locale-presentation.test.ts`
- generation flow with structure validation:
  - `packages/nuxt-layer-api/tests/unit/services/llm/cover-letter-generation.test.ts`
- if needed, preview markdown behavior:
  - `apps/site/tests/unit/layers/vacancy/cover-letter-markdown.test.ts`

### 9) Validation commands

```bash
pnpm lint
pnpm typecheck
pnpm test
```

For local manual smoke:

1. Open `/vacancies/:id/cover`
2. Pick new Writing profile
3. Generate both `Cover letter` and `Application message`
4. Verify date format, greeting/closing, tone, and character-limit behavior

## Deep Research Prompt Template

Use this prompt with GPT deep research before implementing a new locale/market.

```text
I need production-ready language/market guidance for a job application cover-letter generator.

Target output profile:
- Locale: {{LOCALE_CODE}} (for example de-DE)
- Market: {{MARKET_CODE_OR_COUNTRY}} (for example de / Germany)
- Output types:
  1) letter = formal cover letter (sender header + greeting + body + closing/signature)
  2) message = short application message (ATS/email body, no formal sender header/signature block)

Context:
- This is for an AI generator where prompt packs are split into:
  - locale pack (language rules)
  - market pack (regional hiring conventions + date format)
- We need strict, machine-usable output for engineering implementation.

Please provide:

1) Communication norms by type (`letter` vs `message`) for this locale+market
2) Structure rules:
   - required blocks for letter
   - required blocks for message
   - greeting and closing norms
3) Tone map for 4 tones:
   - professional, friendly, enthusiastic, direct
   Include lexical style, sentence-length guidance, and “too much” signals.
4) Length guidance:
   - word ranges for letter (short/standard/long)
   - character ranges for message (short/standard/long)
   - behavior for strict ATS character limits
5) Naturalness / anti-AI guidance:
   - common templated phrases to avoid
   - punctuation or style artifacts that sound AI-generated
   - translation traps (if relevant)
6) Validation heuristics:
   - regex/structure checks with false-positive risk (low/medium/high)
7) Good and bad examples:
   - 2 good + 2 bad for letter
   - 2 good + 2 bad for message
8) Date formatting recommendation for this market:
   - exact pattern suggestion for `date-fns/format`
   - edge cases if locale is language-only and not country-specific

Output format:
- First: concise narrative analysis
- Then: machine-readable JSON with this structure:
{
  "languagePack": {
    "locale": "...",
    "label": "...",
    "requiresGrammaticalGender": false,
    "letter": { "guidance": [], "greetings": [], "closings": [] },
    "message": { "guidance": [], "greetings": [], "closings": [] },
    "toneMap": {
      "professional": { "lexicalStyle": "...", "sentenceLength": "...", "tooMuchSignals": [] },
      "friendly": { ... },
      "enthusiastic": { ... },
      "direct": { ... }
    },
    "lengthGuidelines": {
      "letter": {
        "short": { "minWords": 0, "maxWords": 0 },
        "standard": { "minWords": 0, "maxWords": 0 },
        "long": { "minWords": 0, "maxWords": 0 }
      },
      "message": {
        "short": { "minChars": 0, "maxChars": 0 },
        "standard": { "minChars": 0, "maxChars": 0 },
        "long": { "minChars": 0, "maxChars": 0 }
      },
      "atsFieldStrategy": {
        "hardBucketsMaxChars": [300, 500, 1000, 2000],
        "compressionOrder": []
      }
    },
    "naturalnessRules": [],
    "validationHeuristics": [
      {
        "id": "...",
        "description": "...",
        "patterns": [],
        "falsePositiveRisk": "low"
      }
    ]
  },
  "marketPack": {
    "market": "...",
    "label": "...",
    "letterGuidance": [],
    "messageGuidance": [],
    "naturalnessRules": [],
    "presentation": {
      "datePattern": "..."
    }
  }
}

Constraints:
- Do not use vague advice.
- Prefer recruiter-facing practical guidance.
- Include concrete regex suggestions where possible.
- Mention uncertainty explicitly when normative and real-world usage differ.
```

## Common pitfalls

- Added locale in schema but forgot DB migration for postgres enum.
- Added language pack but forgot `COVER_LETTER_ACTIVE_LANGUAGE_PACKS`.
- Added market pack but forgot date pattern or market registration.
- Added new locale/market but did not update UI profile mapping in `GenerationConfig.vue`.
- Date format chosen as `d.` prefix causes markdown ordered-list ambiguity; prefer non-list-safe date patterns unless explicitly required.
