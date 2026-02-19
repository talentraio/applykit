# Monorepo layout (pnpm workspaces)

## Apps

- `apps/site` - user-facing product
- `apps/admin` - admin UI

## Internal workspace packages (Nuxt layers)

Internal packages use:

- path convention: `packages/nuxt-layer-*/`
- package name convention: `@int/*`

Primary packages:

- `packages/schema` (`@int/schema`)
  - shared Zod schemas, enums, and inferred TS contracts
- `packages/nuxt-layer-api` (`@int/api`)
  - API endpoints (`server/api`)
  - route handlers (`server/routes`)
  - repositories/services/utilities
  - client API composable and plugin (`app/composables/useApi.ts`, `app/plugins/create-api.ts`)
- `packages/nuxt-layer-ui` (`@int/ui`)
  - shared UI setup/theme/tokens/components

## Site app layers

Located in `apps/site/layers/`:

- `_base`
- `auth`
- `landing`
- `profile`
- `resume`
- `static`
- `vacancy`

## Admin app layers

Located in `apps/admin/layers/`:

- `_base`
- `auth`
- `users`
- `roles`
- `llm`
- `system`

## How apps consume layers

Both apps consume workspace layers via dependencies and `extends` in Nuxt config.

Typical setup:

- dependencies include `@int/api`, `@int/ui`, `@int/schema`
- app Nuxt config extends shared layers
- aliases/components prefixes are configured to avoid naming collisions

## Notes

- Legacy references to `packages/layer-api` are outdated; use `packages/nuxt-layer-api`.
- The monorepo intentionally keeps business domains split by app layer and shared package.
