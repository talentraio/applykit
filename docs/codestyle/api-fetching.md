# API fetching guide (selective)

Use this guide when touching API transport / composables.

## Architecture overview

```
Store Action
    ↓
infrastructure/*.api.ts (typed methods)
    ↓
useApi() composable
    ↓
$api plugin (configured $fetch)
    ↓
Server endpoint
```

## `$api` plugin (single source of truth)

- Located at: `@int/api/app/plugins/create-api.ts`
- Creates a configured `$fetch` instance with:
  - `credentials: 'include'`
  - Timeout from config
  - SSR header forwarding (`cookie`, `accept-language`, `user-agent`)

## `useApi()` composable

- Located at: `@int/api/app/composables/useApi.ts`
- Thin wrapper that calls `nuxtApp.$api()`
- **This is the ONLY way to make API calls from client code**

```typescript
// useApi signature
const data = await useApi('/api/resumes', { method: 'GET' });
```

## Forbidden patterns

```typescript
// ❌ FORBIDDEN: Direct $fetch anywhere in client code
await $fetch('/api/resumes');

// ❌ FORBIDDEN: $fetch with generic types
await $fetch<Resume[]>('/api/resumes');

// ❌ FORBIDDEN: useApi directly in components
// (use store actions instead)
const data = await useApi('/api/profile');
```

## Infrastructure API files

All API calls must be wrapped in typed functions in `infrastructure/*.api.ts` files:

```typescript
// infrastructure/resume.api.ts
const baseUrl = '/api/resumes';

export const resumeApi = {
  async fetchAll() {
    return await useApi(baseUrl, { method: 'GET' });
  },

  async fetchById(id: string) {
    return await useApi(`${baseUrl}/${id}`, { method: 'GET' });
  },

  async create(file: File, title?: string) {
    const formData = new FormData();
    formData.append('file', file);
    if (title) formData.append('title', title);

    return await useApi(baseUrl, {
      method: 'POST',
      body: formData
    });
  }
};
```

## File locations

- **Shared** (both apps): `packages/nuxt-layer-api/app/infrastructure/`
  - `auth.api.ts` — authentication (fetchMe, logout)
  - `user.api.ts` — user profile (shared profile endpoints)

- **App-specific**: `apps/{app}/layers/{layer}/app/infrastructure/`
  - `resume.api.ts` — resume CRUD (site only)
  - `vacancy.api.ts` — vacancy CRUD (site only)

## Where to call infrastructure API

- **Only from Pinia store actions**
- Never from components, pages, or composables directly

```typescript
// ✅ GOOD: Store action calls infrastructure
// stores/resume.ts
export const useResumeStore = defineStore('ResumeStore', {
  actions: {
    async fetchResumes() {
      const data = await resumeApi.fetchAll();
      this.resumes = data;
      return data;
    }
  }
});

// ❌ BAD: Component calls infrastructure directly
// SomeComponent.vue
const data = await resumeApi.fetchAll(); // Don't do this!
```

## Headers in SSR

- In SSR, `$api` automatically forwards request headers (`cookie`, `accept-language`, `user-agent`)
- Do not log sensitive headers or cookies
- The `x-on-server-call: true` header is added for debugging
