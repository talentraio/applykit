# ApplyKit

AI-powered platform for resume tailoring, job-fit scoring, and export-ready ATS/Human resume outputs.

## Why this product matters

Hiring teams use ATS filters, while real people still evaluate clarity, structure, and impact.
Most candidates struggle to optimize for both at once. ApplyKit solves this gap by combining:

- structured resume data,
- vacancy-specific adaptation,
- measurable fit scoring,
- one-click export for ATS and Human-friendly formats.

## Product goal

Help candidates apply faster with higher-quality, role-specific resumes while keeping content truthful,
readable, and production-ready.

## Core user flow

1. Upload a base resume (`DOCX`/`PDF`) and parse it into strict structured JSON.
2. Edit and normalize the base resume in the app.
3. Add a vacancy and generate a tailored resume version.
4. Review quick fit score (`before/after`) and optionally request detailed scoring insights.
5. Export to ATS or Human format.

## LLM scenarios (business view)

- **Resume Parse**: converts uploaded file into valid structured resume JSON.
- **Resume Adaptation**: tailors the base resume to a target vacancy.
- **Baseline Scoring**: returns lightweight score delta (`before/after`) for generation output.
- **Detailed Scoring**: generates explainable matching/gap insights on demand.
- **Cover Letter Generation**: creates a vacancy-specific cover letter.

Full scenario docs: [`docs/architecture/llm-scenarios.md`](./docs/architecture/llm-scenarios.md)

## Technology stack

- **Frontend**: Nuxt 4, Nuxt UI 4, Pinia, i18n
- **Backend**: Nitro server routes (Nuxt layer), Zod validation
- **Data**: PostgreSQL + Drizzle ORM/migrations
- **AI**: OpenAI/Gemini via platform-managed model routing
- **Testing**: Vitest (unit/integration), Playwright (e2e)
- **Monorepo**: pnpm workspaces, shared internal layers/packages (`@int/*`)

## Repository structure

- `apps/site` – candidate-facing product app
- `apps/admin` – admin panel (roles, users, LLM routing/model management)
- `packages/nuxt-layer-api` – shared backend/API layer
- `packages/nuxt-layer-ui` – shared UI layer/theme
- `packages/schema` – shared contracts/constants/schemas
- `docs` – architecture, API, development, standards
- `specs` – feature specs and implementation planning artifacts

## Documentation map

- Documentation index: [`docs/README.md`](./docs/README.md)
- Architecture: [`docs/architecture/README.md`](./docs/architecture/README.md)
- API: [`docs/api/README.md`](./docs/api/README.md)
- Development guide: [`docs/development/README.md`](./docs/development/README.md)
- Code style: [`docs/codestyle/README.md`](./docs/codestyle/README.md)

## Quick local start

1. Install dependencies:

```bash
pnpm install
```

2. Create env file:

```bash
cp .env.example .env
```

3. Start local PostgreSQL and apply migrations:

```bash
pnpm db:up
pnpm --filter @int/api db:migrate
```

4. Start app(s):

```bash
pnpm dev:site
# optional second app in another terminal
PORT=3001 pnpm dev:admin
```

More details: [`docs/development/local-setup.md`](./docs/development/local-setup.md)
