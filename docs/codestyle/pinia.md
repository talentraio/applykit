# Pinia guide (selective)

Use this guide when working with state.

## Core rules

- All API interactions are surfaced through **store actions**.
- Components should call **store actions**, not raw `$fetch` or `useApi` directly.
- Actions **must return data**, even if they also store it.
  - This makes SSR/CSR usage predictable (works well with `useAsyncData` / `callOnce`).

## Architecture: Store → Infrastructure → API

```
Component/Page
    ↓ (calls action or uses getter)
Pinia Store (state + actions + getters)
    ↓ (action calls infrastructure)
infrastructure/*.api.ts (typed API methods)
    ↓ (uses useApi)
useApi composable → $api plugin
    ↓
Server endpoint
```

### Store responsibilities

- **State**: reactive data cache (user, profile, resumes, etc.)
- **Getters**: computed derived data
- **Actions**: orchestrate business logic, call infrastructure API, update state

### Infrastructure API responsibilities

- Thin typed wrappers around `useApi()`
- One file per domain: `auth.api.ts`, `user.api.ts`, `resume.api.ts`
- Located in:
  - `packages/nuxt-layer-api/app/infrastructure/` — shared across apps
  - `apps/{app}/layers/{layer}/app/infrastructure/` — app/layer-specific

### Example

```typescript
// infrastructure/resume.api.ts
export const resumeApi = {
  async fetchAll() {
    return await useApi('/api/resumes', { method: 'GET' });
  },
  async fetchById(id: string) {
    return await useApi(`/api/resumes/${id}`, { method: 'GET' });
  }
};

// stores/resume.ts
export const useResumeStore = defineStore('ResumeStore', {
  state: () => ({
    resumes: [] as Resume[],
    current: null as Resume | null,
    loading: false
  }),
  actions: {
    async fetchResumes() {
      this.loading = true;
      try {
        const data = await resumeApi.fetchAll();
        this.resumes = data;
        return data; // always return for useAsyncData
      } finally {
        this.loading = false;
      }
    }
  }
});
```

## Composables as thin proxies (optional)

Composables can wrap store access for convenience, but must NOT:

- Hold their own state (use store state)
- Call `$fetch` or `useApi` directly (use store actions)
- Use `onMounted` for data fetching (use `useAsyncData` / `callOnce`)

```typescript
// composables/useResumes.ts — thin proxy
export function useResumes() {
  const store = useResumeStore();
  return {
    resumes: computed(() => store.resumes),
    loading: computed(() => store.loading),
    fetchResumes: store.fetchResumes
    // ...
  };
}
```

## SSR initialization pattern

- Use a server plugin to warm up baseline data and user state:
  - `apps/{app}/layers/_base/app/plugins/init-data.server.ts`
- Plugin options:
  - `enforce: 'pre'`
  - `parallel: false`
  - `dependsOn: ['pinia']`

Flow:

1. Load base dictionaries (countries, etc.)
2. If the user is authenticated, load user + profile data via store actions
3. Store results into Pinia (already done by actions)

```typescript
// plugins/init-data.server.ts
export default defineNuxtPlugin({
  name: 'init-data',
  enforce: 'pre',
  parallel: false,
  dependsOn: ['pinia'],
  async setup() {
    const authStore = useApiAuthStore();

    // Load user session if authenticated
    try {
      await authStore.fetchMe();
    } catch {
      // Not authenticated, ignore
    }
  }
});
```

## Page data fetching

- For page-critical data: call store actions via `useAsyncData` / `callOnce`.
- **Never** use `onMounted` for SSR-required data.
- Avoid direct fetches inside components that should be SSR-complete.

```typescript
// pages/resumes/index.vue
const store = useResumeStore();

// SSR-compatible data fetching
await callOnce(async () => {
  await store.fetchResumes();
});

// Or with useAsyncData for refresh capability
const { refresh } = await useAsyncData('resumes', () => store.fetchResumes());
```

## Anti-patterns to avoid

```typescript
// ❌ BAD: Direct $fetch in composable
const data = await $fetch<Resume[]>('/api/resumes');

// ❌ BAD: State in composable
const resumes = ref<Resume[]>([]);

// ❌ BAD: onMounted for SSR data
onMounted(() => {
  fetchResumes();
});

// ❌ BAD: Generic typing with $fetch
await $fetch<Profile>('/api/profile');

// ✅ GOOD: Store action via useAsyncData
await useAsyncData('resumes', () => store.fetchResumes());
```
