# Site App Layers

Internal Nuxt layers for the Site application.

## Layer Structure

```
apps/site/layers/
├── _base/          # Shared foundation (must load first)
├── auth/           # Authentication & session management
├── user/           # User profile & settings
├── landing/        # Homepage & marketing pages
└── vacancy/        # Job vacancy management
```

## Layer Loading Order

Defined in `apps/site/nuxt.config.ts`:

```typescript
extends: [
  '@int/ui',        // UI components layer (external package)
  '@int/api',       // API layer (external package)
  './layers/_base', // 1. Base layer (shared utilities)
  './layers/auth',  // 2. Auth layer (login, logout)
  './layers/user',  // 3. User layer (profile, settings)
  './layers/landing', // 4. Landing layer (homepage)
  './layers/vacancy', // 5. Vacancy layer (job management)
]
```

**Important**: `_base` must be first in the internal layers list to ensure shared components/composables/stores are available to all other layers.

## Layer Details

### `_base` Layer

**Alias**: `@site/base`

Shared foundation for all site layers.

**Structure**:
```
_base/
├── nuxt.config.ts
└── app/
    ├── components/    # Shared components
    ├── composables/   # Shared composables
    ├── stores/        # Shared Pinia stores
    ├── utils/         # Shared utilities
    └── middleware/    # Shared middleware
```

**Purpose**:
- Shared components used across multiple layers
- Common composables (e.g., `useCurrentUser`, `useToast`)
- Shared Pinia stores (e.g., `useAuthStore`)
- Utility functions
- Global middleware

**Usage**:
```typescript
// Import from base layer
import { useToast } from '@site/base/composables/useToast'
import MySharedComponent from '@site/base/components/MySharedComponent.vue'
```

### `auth` Layer

**Alias**: `@site/auth`

Authentication and session management.

**Responsibilities**:
- Login/logout pages
- OAuth callback routes
- Auth middleware
- Session management
- Protected route guards

**Key Files (to be created)**:
- `app/pages/login.vue` - Login page
- `app/layouts/auth.vue` - Auth layout
- `app/middleware/auth.global.ts` - Auth guard middleware

**Usage**:
```typescript
// Import from auth layer
import { useAuthStore } from '@site/auth/stores/useAuthStore'
```

### `user` Layer

**Alias**: `@site/user`

User profile and settings management.

**Responsibilities**:
- User profile pages
- Settings pages
- Profile editing
- BYOK key management
- Usage dashboard

**Key Files (to be created)**:
- `app/pages/profile.vue` - Profile page
- `app/pages/settings.vue` - Settings page
- `app/pages/dashboard.vue` - User dashboard

**Usage**:
```typescript
// Import from user layer
import { useProfileStore } from '@site/user/stores/useProfileStore'
```

### `landing` Layer

**Alias**: `@site/landing`

Homepage and marketing pages.

**Responsibilities**:
- Homepage/landing page
- Marketing content
- Public pages
- Call-to-action sections

**Key Files (to be created)**:
- `app/pages/index.vue` - Homepage
- `app/components/Hero.vue` - Hero section
- `app/components/Features.vue` - Features section

**Usage**:
```typescript
// Import from landing layer
import HeroSection from '@site/landing/components/Hero.vue'
```

### `vacancy` Layer

**Alias**: `@site/vacancy`

Job vacancy management and resume generation.

**Responsibilities**:
- Vacancy list page
- Vacancy detail page
- Vacancy creation/editing
- Resume generation
- Export functionality

**Key Files (to be created)**:
- `app/pages/vacancies/index.vue` - Vacancy list
- `app/pages/vacancies/[id].vue` - Vacancy detail
- `app/pages/vacancies/new.vue` - Create vacancy
- `app/components/VacancyCard.vue` - Vacancy card component

**Usage**:
```typescript
// Import from vacancy layer
import { useVacancyStore } from '@site/vacancy/stores/useVacancyStore'
```

## Nuxt Layer Conventions

### Auto-Imports

Components, composables, and utilities in each layer are automatically imported:

```typescript
// NO NEED for explicit imports:
// ✅ Auto-imported from any layer
<template>
  <MyComponent />  <!-- From any layer's app/components/ -->
</template>

<script setup lang="ts">
const user = useCurrentUser()  // From any layer's app/composables/
const { formatDate } = useUtils() // From any layer's app/utils/
</script>
```

### Explicit Imports

Use layer aliases for explicit imports when needed:

```typescript
// Explicit import using alias
import { MyType } from '@site/base/types'
import MyComponent from '@site/auth/components/LoginForm.vue'
```

### Layer Isolation

Each layer is isolated and can:
- Have its own `pages/`, `layouts/`, `components/`, `composables/`, etc.
- Override or extend functionality from earlier layers
- Use components/composables from earlier layers (via auto-import or alias)

**Layer merging order**:
1. External packages (`@int/ui`, `@int/api`)
2. `_base` layer (shared foundation)
3. Feature layers (auth, user, landing, vacancy)

## Development Workflow

### Adding a New Component

```bash
# In the appropriate layer
touch apps/site/layers/_base/app/components/MyComponent.vue
```

Component is automatically available in all layers.

### Adding a New Composable

```bash
# In the appropriate layer
touch apps/site/layers/_base/app/composables/useMyComposable.ts
```

Composable is automatically available in all layers.

### Adding a New Page

```bash
# In the appropriate layer
touch apps/site/layers/vacancy/app/pages/vacancies/index.vue
```

Creates route: `/vacancies`

### Adding Layer-Specific Types

```typescript
// apps/site/layers/vacancy/types/index.ts
export interface VacancyFormData {
  company: string
  position: string
  description: string
}
```

Import explicitly:
```typescript
import type { VacancyFormData } from '@site/vacancy/types'
```

## Best Practices

### 1. Use Correct Layer

- **Shared/common** → `_base`
- **Authentication** → `auth`
- **User profile/settings** → `user`
- **Homepage/marketing** → `landing`
- **Vacancy management** → `vacancy`

### 2. Avoid Circular Dependencies

Layers should not depend on layers loaded after them:
- ✅ `vacancy` can use `_base`
- ✅ `vacancy` can use `auth`
- ❌ `auth` should not use `vacancy`

### 3. Shared State

Use Pinia stores in `_base/app/stores/` for state shared across layers:

```typescript
// apps/site/layers/_base/app/stores/useAuthStore.ts
export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  // ...
})
```

### 4. Layer-Specific State

Use Pinia stores in feature layers for layer-specific state:

```typescript
// apps/site/layers/vacancy/app/stores/useVacancyStore.ts
export const useVacancyStore = defineStore('vacancy', () => {
  const vacancies = ref([])
  // ...
})
```

### 5. Type Safety

Use TypeScript and leverage auto-imports:

```typescript
<script setup lang="ts">
import type { User } from '@int/schema'

const user = useCurrentUser() // Auto-imported composable
const toast = useToast()       // Auto-imported composable
</script>
```

## Testing

Each layer can have its own tests:

```
_base/
├── app/
│   └── composables/
│       └── useCurrentUser.ts
└── tests/
    └── composables/
        └── useCurrentUser.test.ts
```

Run tests:
```bash
pnpm test apps/site/layers/_base
pnpm test apps/site/layers/vacancy
```

## Deployment

All layers are bundled together when building the site app:

```bash
cd apps/site
pnpm build
```

The Nuxt build process automatically merges all layers in the correct order.

## Related Documentation

- [Nuxt Layers](https://nuxt.com/docs/getting-started/layers)
- [Project Monorepo Structure](../../../docs/architecture/monorepo.md)
- [Site App README](../README.md)
