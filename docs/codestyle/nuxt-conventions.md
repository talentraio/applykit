# Nuxt conventions

## Components

- Use Nuxt component auto-import naming rules.
- Avoid repeated prefixes in filenames like `AtsDocument.vue` under `components/ats/`.
  Prefer: `components/ats/Document.vue`.

Recommended:

- `app/components/base/*` for reusable primitives
- `app/components/the/*` for layout-level singletons

## Layers

- Each internal layer defines:
  - `alias` for imports
  - component prefix mapping to avoid collisions

## Stores (Pinia)

- UI components do not call API modules directly.
- Components call store actions.
- Store actions:
  - call API modules
  - update store state
  - always return the fetched data (even if stored)
    This avoids double fetching when used with `useAsyncData()` / `callOnce()`.

## API calls

- Use `useApi()` for all backend API calls.
- Prefer domain wrappers in `infrastructure/*.api.ts` files per layer.
- Keep reusable/stateful data flows in store actions.
- Direct page/component `useApi()` is acceptable only for localized one-off actions that do not
  require shared store orchestration.

## Environment variables (runtimeConfig)

- Use `useRuntimeConfig()` for all Nuxt runtime values.
- Do **not** read `process.env` in runtime code (except `NODE_ENV`); reserve it for CLI configs.
- Env vars must use `NUXT_` (server-only) or `NUXT_PUBLIC_` (client-exposed) prefixes.
- In `nuxt.config.ts`, provide **defaults only**; rely on Nuxt env injection for overrides.

## Versions & documentation

- Nuxt: **v4**
- NuxtUI: **v4**

Documentation workflow:

- Nuxt: use the Nuxt docs MCP server. If it’s required but unavailable, stop and ask the user to resolve MCP.
- NuxtUI: use the NuxtUI docs MCP server. If it’s required but unavailable, stop and ask the user to resolve MCP.
- Everything else: try MCP context7 first.

## Prefer VueUse

Before writing custom utilities/composables, check VueUse.
If a suitable composable exists, use it.
