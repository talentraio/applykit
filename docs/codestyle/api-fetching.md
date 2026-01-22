# API fetching guide (selective)

Use this guide when touching API transport / composables.

## `apiFetch()` (single source of truth)

- Implement a minimal `apiFetch()` wrapper.
- Responsibilities:
  - Add required headers for SSR calls (`cookie`, `accept-language`).
  - Keep behavior consistent between SSR and browser.

## Where it lives

- Prefer a shared plugin in the API layer:
  - `@int/api/app/plugins/api-fetch.ts`
- Export `apiFetch()` via auto-import (or a lightweight composable) so apps can use it.

## Headers in SSR

- In SSR, use request headers as the source of truth.
- Do not log sensitive headers or cookies.
