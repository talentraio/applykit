# API fetching guide (selective)

Use this guide when touching API transport or client-side request patterns.

## Core rule

- Always use `useApi()` for client-side calls.
- Do not call raw `$fetch` directly for backend API requests.

Why:

- shared `$api` plugin handles SSR header forwarding,
- auth error behavior is centralized,
- timeout and transport behavior stays consistent.

## Request path

Typical flow:

```text
UI (component/page/store)
  -> infrastructure/*.api.ts (preferred for reusable domain calls)
  -> useApi()
  -> $api plugin (@int/api/app/plugins/create-api.ts)
  -> server endpoint
```

## Where to place API calls

Preferred placement:

- reusable domain operations -> `infrastructure/*.api.ts` + store actions
- one-off local UI actions (modal/page-local actions) -> direct `useApi()` in component/page is acceptable

Examples of acceptable local calls in current codebase:

- profile photo upload/delete actions,
- dismissing generation score alert,
- PDF preview payload fetch.

## `useApi()` composable

- Path: `@int/api/app/composables/useApi.ts`
- Wrapper over Nuxt app `$api` instance.

Example:

```ts
const resumes = await useApi('/api/resumes', { method: 'GET' });
```

## Forbidden patterns

```ts
// Forbidden: bypassing configured transport
await $fetch('/api/resumes');

// Forbidden: typed $fetch workaround instead of fixing endpoint typing
await $fetch<MyType>('/api/resumes');
```

## Infrastructure file locations

API wrappers live in app layers:

- Site: `apps/site/layers/*/app/infrastructure/*.api.ts`
- Admin: `apps/admin/layers/*/app/infrastructure/*.api.ts`

Shared API transport primitives live in:

- `packages/nuxt-layer-api/app/composables/useApi.ts`
- `packages/nuxt-layer-api/app/plugins/create-api.ts`

## Endpoint naming note

Prefer current plural endpoints for new code:

- use `/api/resumes*` for resume CRUD flows.
