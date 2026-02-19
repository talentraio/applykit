# Documentation Changelog: 2026-02-19

## Scope

Synchronization pass for documentation against the current implementation in:

- `packages/nuxt-layer-api/server/api/*`
- `packages/nuxt-layer-api/server/routes/*`
- `packages/schema/*`
- current `apps/site` and `apps/admin` behavior

## What Was Updated

- Reworked API documentation:
  - `docs/api/endpoints.md`
  - `docs/api/schemas.md`
  - `docs/api/README.md`
- Updated architecture docs to match current flows:
  - `docs/architecture/data-flow.md`
  - `docs/architecture/homepage.md`
  - `docs/architecture/llm-scenarios.md`
  - `docs/architecture/monorepo.md`
  - `docs/architecture/security-privacy.md`
- Updated code-style/dev/design docs where behavior/path references were outdated:
  - `docs/codestyle/api-fetching.md`
  - `docs/codestyle/pinia.md`
  - `docs/codestyle/nuxt-conventions.md`
  - `docs/development/workflow.md`
  - `docs/design/mvp.md`

## Key Corrections

- API endpoint inventory now matches current server files (no missing or extra documented routes).
- Export flow docs updated from old vacancy-export route to current tokenized PDF flow:
  - `POST /api/pdf/prepare`
  - `GET /api/pdf/payload`
  - `GET /api/pdf/file`
- Added/clarified active endpoints previously undocumented (profile photo/account, generation edit,
  score alert dismiss, routing enabled overrides, etc.).
- Updated contract descriptions to current schema shapes (resume content, format settings,
  routing fields including `reasoningEffort`, role list including `promo`).
- Removed outdated architecture references (`packages/layer-api`, legacy plugin/file names, BYOK wording).

## Validation

- Endpoint coverage check: documented API routes vs `server/api` routes => **1:1 match**.
- Formatting check: `prettier --check` for updated docs => **passed**.
