# Pinia guide (selective)

Use this guide when working with state.

## Core rules

- All API interactions are surfaced through **store actions**.
- Components should call **store actions**, not raw `$fetch`.
- Actions **must return data**, even if they also store it.
  - This makes SSR/CSR usage predictable (works well with `useAsyncData` / `callOnce`).

## SSR initialization pattern

- Use a server plugin to warm up baseline data and user state:
  - `app/plugins/init-data.server.ts`
- Plugin options:
  - `enforce: 'pre'`
  - `parallel: false`
  - `dependsOn: ['pinia']`

Flow:
1) Load base dictionaries (countries, etc.)
2) If the user is authenticated, load profile/user data
3) Store results into Pinia

## Page data fetching

- For page-critical data: call store actions via `useAsyncData` / `callOnce`.
- Avoid direct fetches inside components that should be SSR-complete.
