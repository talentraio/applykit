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

- Centralize client calls in a small set of API modules.
- Use a single `apiFetch()` wrapper:
  - minimal: forward headers/cookies on server, attach required headers
  - no extra magic in MVP

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
