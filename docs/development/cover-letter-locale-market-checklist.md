# Cover Letter Locale/Market PR Checklist

One-page checklist for adding a new cover-letter locale and/or market profile.

Use full guide for details:

- `docs/development/cover-letter-locale-market-onboarding.md`

## 0) Decide scope

- `locale only` (new language behavior, existing market)
- `market only` (new regional style/date format, existing locale)
- `locale + market + UI profile`

## 1) Research package ready

- Deep research completed for:
  - `letter` + `message` conventions
  - tone map (`professional`, `friendly`, `enthusiastic`, `direct`)
  - length guidance
  - anti-AI/naturalness rules
  - validation heuristics (regex/structure)
  - date format recommendation for market
- Output normalized into:
  - locale pack data
  - market pack data

## 2) Schema/constants updated (`@int/schema`)

- `packages/schema/constants/enums.ts`
  - `COVER_LETTER_LOCALE_MAP` (if new locale)
  - `COVER_LETTER_LOCALE_META_MAP` (`requiresGrammaticalGender`)
  - `COVER_LETTER_MARKET_MAP` (if new market)
  - `COVER_LETTER_DEFAULT_MARKET_BY_LOCALE_MAP`
- `packages/schema/schemas/enums.ts` and related schemas still compile

## 3) DB enum migration done (`@int/api`)

- `packages/nuxt-layer-api/server/data/schema.ts` uses new enum values
- Migration generated and committed:
  - `pnpm --filter @int/api db:generate`
- Migration applied locally:
  - `pnpm --filter @int/api db:migrate`
- No runtime enum errors in API logs

## 4) Prompt packs added

- Locale file created:
  - `packages/nuxt-layer-api/server/services/llm/prompts/cover-letter/language-packs/<locale>.ts`
- Locale registered:
  - `.../language-packs/index.ts`
  - `COVER_LETTER_ACTIVE_LANGUAGE_PACKS` updated (if active now)
- Market file created (if needed):
  - `packages/nuxt-layer-api/server/services/llm/prompts/cover-letter/market-packs/<market>.ts`
- Market registered:
  - `.../market-packs/index.ts`

## 5) Deterministic presentation updated

- `packages/nuxt-layer-api/server/services/vacancy/cover-letter-locale-presentation.ts`
  - `date-fns` locale mapping added
  - `closingByTone` for locale added
- Market `presentation.datePattern` set
- Date pattern is markdown-safe (avoid day-dot style if it triggers list parsing)

## 6) UI profile mapping updated

- `apps/site/layers/vacancy/app/components/Item/cover/Left/GenerationConfig.vue`
  - profile item added (`Writing profile`)
  - locale↔market mapping added (`resolveProfileFromSettings`, `applyProfileToSettings`)
- i18n keys added:
  - `apps/site/i18n/locales/en.json`
  - other locale files when enabled

## 7) Tests updated

- Language packs tests updated:
  - `packages/nuxt-layer-api/tests/unit/services/llm/cover-letter-language-packs.test.ts`
- Locale presentation tests updated:
  - `packages/nuxt-layer-api/tests/unit/services/vacancy/cover-letter-locale-presentation.test.ts`
- Generation tests updated:
  - `packages/nuxt-layer-api/tests/unit/services/llm/cover-letter-generation.test.ts`
- Preview markdown tests updated if needed:
  - `apps/site/tests/unit/layers/vacancy/cover-letter-markdown.test.ts`

## 8) Verification

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- Manual smoke in `/vacancies/:id/cover`:
  - both output types (`letter`, `message`)
  - all length modes used by product
  - date/greeting/closing are correct
  - character limits respected

## 9) Deep research prompt (short template)

```text
Prepare production-ready guidance for a cover-letter generator:
- Locale: {{LOCALE_CODE}}
- Market: {{MARKET_CODE_OR_COUNTRY}}
- Output types: letter + message

Provide:
1) Language conventions for letter/message
2) Market conventions for letter/message
3) Tone map for professional/friendly/enthusiastic/direct
4) Length ranges (letter words, message chars)
5) Naturalness/anti-AI rules and translation traps
6) Validation heuristics (regex/structure + false-positive risk)
7) Good/Bad examples for each output type
8) Recommended date format pattern for this market (date-fns compatible)

Return narrative + machine-readable JSON with separate `languagePack` and `marketPack`.
```
