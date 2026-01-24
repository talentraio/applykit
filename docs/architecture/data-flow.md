# Data flow & lifecycle

## Core entities

- **User**
- **Profile** (contact data, locales, job preferences)
- **Base Resume** (strict JSON; derived from DOCX/PDF via LLM; editable by user)
- **Vacancy** (company required; optional jobPosition; description text; optional URL; notes)
- **Generated Resume Versions** (array; keep only the latest in UI for MVP, but store as array to avoid refactor later)

## Resume parsing (DOCX primary, PDF supported)

1. User uploads DOCX/PDF
2. Server calls LLM parsing service
3. Service validates output with Zod and returns strictly typed JSON
4. Store JSON as the canonical “source of truth” for the resume
5. User reviews/edits JSON and saves

## Vacancy tailoring

1. User creates vacancy (company required; jobPosition optional)
2. User provides vacancy description text (MVP) + optional link
3. Server generates adapted resume version + stores it under vacancy

## Re-generation (important)

If base resume changes, user can re-run generation for an existing vacancy.
We support:

- `POST /api/vacancies/:id/generate` (create a new version, append to versions array)

## Rendering & export

- Views:
  - ATS: `/vacancies/:id/ats`
  - Human: `/vacancies/:id/human`
- Rendering is server-side (`*.server.vue` islands), fully static HTML per request.
- Export:
  - `POST /api/vacancies/:id/export?type=ats|human`
  - Cache exports (Nitro storage / FS / Redis) and invalidate cache on re-generation

## Store-init pattern (Nuxt)

On server app start:

- preload global “dictionary” data (countries, etc.)
- if user session exists, load user + profile + current resume list

This runs in `app/plugins/store-init.ts` with:

- `enforce: 'pre'`
- `parallel: false`
- `dependsOn: ['pinia']`
