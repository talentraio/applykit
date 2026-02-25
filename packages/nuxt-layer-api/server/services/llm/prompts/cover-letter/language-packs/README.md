# Cover Letter Language Packs

This folder contains locale-specific prompt/validation artifacts for cover letter generation.

## Structure

- `en.ts`, `da-dk.ts`, `uk-ua.ts`: one file per locale artifact
- `types.ts`: shared type contract for all language packs
- `index.ts`: registry and resolvers

## Add a new language

1. Create `<locale>.ts` and export a `CoverLetterLanguagePack`.
2. Register it in `COVER_LETTER_PROMPT_PACKS_BY_LOCALE` in `index.ts`.
3. If language should be runtime-selectable now, add it to:
   - `COVER_LETTER_ACTIVE_LANGUAGE_PACKS` in `index.ts`
   - schema locale enum (`@int/schema` constants + migration + UI labels)
4. Add/update tests under `tests/unit/services/llm/cover-letter-language-packs.test.ts`.
