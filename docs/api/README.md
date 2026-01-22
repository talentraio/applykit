# API

This folder documents the HTTP API surface used by the Nuxt apps (site/admin) and internal layers.

For MVP we keep the API documentation in two documents:

- **Endpoints:** `endpoints.md`
- **Schemas:** `schemas.md`

## Where this API is implemented

The API is implemented as an internal Nuxt layer package:

- **Path in repo:** `packages/nuxt-layer-api/`
- **Package name (package.json):** `@int/api`

Implementation follows standard Nitro/Nuxt server structure under:
`packages/nuxt-layer-api/server/*` (e.g. `server/api`, `server/routes`, `server/utils`, `server/plugins`).

## Where to start

- If you’re implementing UI or calling the backend → read `endpoints.md`
- If you’re implementing validation, persistence, or typed contracts → read `schemas.md`

## Conventions (high-level)

- Endpoints are documented in `endpoints.md` (grouped by domain: auth, resume, vacancies, export, etc.)
- Data contracts and entities live in `schemas.md`
- Server returns strictly typed responses; client should rely on inferred types (no manual generics on `$fetch`)
- Runtime validation is done in services (LLM parsing/generation, external IO), not duplicated in endpoint handlers
