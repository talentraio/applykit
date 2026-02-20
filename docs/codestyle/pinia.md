# Pinia guide (selective)

Use this guide when working with state ownership and action flow.

## Core rules

- Stateful domain data should be owned by Pinia stores.
- Reusable API operations should be called from store actions.
- Store actions should return data in addition to updating state.
- Use getters for derived state (`get*` naming convention).

## Architecture

```text
Component/Page
  -> Store action (preferred for stateful domain flows)
  -> infrastructure/*.api.ts (reusable wrappers)
  -> useApi()
  -> server endpoint
```

For localized UI-only actions (no shared state), direct `useApi()` inside a page/component is acceptable.

## Store responsibilities

- State cache for domain entities.
- Derived getters.
- Business orchestration in actions.
- Triggering API wrappers and committing state changes.

## Infrastructure responsibilities

- Thin wrappers around `useApi()`.
- Domain-oriented request methods.
- No view logic.

Locations:

- Site: `apps/site/layers/*/app/infrastructure/*.api.ts`
- Admin: `apps/admin/layers/*/app/infrastructure/*.api.ts`

## Example pattern

```ts
// apps/site/layers/resume/app/infrastructure/resume.api.ts
export const resumeApi = {
  async fetchList() {
    return await useApi('/api/resumes', { method: 'GET' });
  },
  async fetchById(id: string) {
    return await useApi(`/api/resumes/${id}`, { method: 'GET' });
  }
};

// store action
export const useResumeStore = defineStore('ResumeStore', {
  actions: {
    async fetchResumeList() {
      const data = await resumeApi.fetchList();
      this.resumeList = data.items;
      return data.items;
    }
  }
});
```

## SSR initialization pattern

Plugin: `apps/site/layers/_base/app/plugins/init-data.ts`

Recommended options:

- `enforce: 'pre'`
- `parallel: false`
- `dependsOn: ['pinia']`

Behavior:

- initialize auth session state early,
- safely continue for public (unauthenticated) requests.

## Data fetching on pages

Prefer SSR-friendly calls:

- `callOnce(...)`
- `useAsyncData(...)`

Avoid `onMounted` for data required on first paint.

## Anti-patterns

```ts
// Bad: bypassing transport conventions
await $fetch('/api/resumes');

// Bad: duplicating shared domain state in local refs
const resume = ref(null);

// Bad: onMounted for SSR-critical data
onMounted(() => fetchResume());
```
