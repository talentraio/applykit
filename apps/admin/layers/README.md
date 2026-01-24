# Admin App Layers

Internal Nuxt layers for the Admin application.

## Layer Structure

```
apps/admin/layers/
├── _base/          # Shared foundation (must load first)
├── auth/           # Admin authentication & authorization
├── users/          # User management (list, edit roles, view usage)
└── system/         # System settings & platform controls
```

## Layer Loading Order

Defined in `apps/admin/nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
  extends: [
    '@int/ui', // UI components layer (external package)
    '@int/api', // API layer (external package)
    './layers/_base', // 1. Base layer (shared utilities)
    './layers/auth', // 2. Auth layer (admin login, logout)
    './layers/users', // 3. Users layer (user management)
    './layers/system' // 4. System layer (platform settings)
  ]
})
```

**Important**: `_base` must be first in the internal layers list to ensure shared components/composables/stores are available to all other layers.

## Layer Details

### `_base` Layer

**Alias**: `@admin/base`

Shared foundation for all admin layers.

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
- Common composables (e.g., `useCurrentAdmin`, `useToast`)
- Shared Pinia stores (e.g., `useAdminAuthStore`)
- Utility functions
- Global middleware

**Usage**:

```typescript
import MySharedComponent from '@admin/base/components/MySharedComponent.vue'
// Import from base layer
import { useToast } from '@admin/base/composables/useToast'
```

### `auth` Layer

**Alias**: `@admin/auth`

Admin authentication and authorization.

**Responsibilities**:

- Admin login page
- OAuth callback routes
- Auth middleware (requires super_admin role)
- Session management
- Protected admin route guards

**Key Files (to be created)**:

- `app/pages/login.vue` - Admin login page
- `app/layouts/auth.vue` - Auth layout
- `app/middleware/admin.global.ts` - Admin guard middleware

**Usage**:

```typescript
// Import from auth layer
import { useAdminAuthStore } from '@admin/auth/stores/useAdminAuthStore'
```

### `users` Layer

**Alias**: `@admin/users`

User management for platform administrators.

**Responsibilities**:

- User list page with filtering
- User detail page
- Role management (promote to friend/super_admin)
- Usage statistics per user
- User activity tracking

**Key Files (to be created)**:

- `app/pages/users/index.vue` - User list page
- `app/pages/users/[id].vue` - User detail page
- `app/components/UserTable.vue` - User table component
- `app/components/RoleSelector.vue` - Role management component

**Usage**:

```typescript
// Import from users layer
import { useUsersStore } from '@admin/users/stores/useUsersStore'
```

### `system` Layer

**Alias**: `@admin/system`

System settings and platform controls.

**Responsibilities**:

- Platform configuration
- LLM budget management
- Default provider selection
- Global usage statistics
- System health monitoring

**Key Files (to be created)**:

- `app/pages/system.vue` - System settings page
- `app/components/BudgetSettings.vue` - LLM budget controls
- `app/components/ProviderSettings.vue` - Default provider selector
- `app/components/UsageChart.vue` - Platform usage charts

**Usage**:

```typescript
// Import from system layer
import { useSystemStore } from '@admin/system/stores/useSystemStore'
```

## Nuxt Layer Conventions

### Auto-Imports

Components, composables, and utilities in each layer are automatically imported:

```vue
<template>
  <MyComponent />
  <!-- From any layer's app/components/ -->
</template>

<script setup lang="ts">
const admin = useCurrentAdmin() // From any layer's app/composables/
const { formatDate } = useUtils() // From any layer's app/utils/
</script>
```

### Explicit Imports

Use layer aliases for explicit imports when needed:

```typescript
import MyComponent from '@admin/auth/components/LoginForm.vue'
// Explicit import using alias
import { MyType } from '@admin/base/types'
```

### Layer Isolation

Each layer is isolated and can:

- Have its own `pages/`, `layouts/`, `components/`, `composables/`, etc.
- Override or extend functionality from earlier layers
- Use components/composables from earlier layers (via auto-import or alias)

**Layer merging order**:

1. External packages (`@int/ui`, `@int/api`)
2. `_base` layer (shared foundation)
3. Feature layers (auth, users, system)

## Development Workflow

### Adding a New Component

```bash
# In the appropriate layer
touch apps/admin/layers/_base/app/components/MyComponent.vue
```

Component is automatically available in all layers.

### Adding a New Composable

```bash
# In the appropriate layer
touch apps/admin/layers/_base/app/composables/useMyComposable.ts
```

Composable is automatically available in all layers.

### Adding a New Page

```bash
# In the appropriate layer
touch apps/admin/layers/users/app/pages/users/index.vue
```

Creates route: `/users`

### Adding Layer-Specific Types

```typescript
// apps/admin/layers/users/types/index.ts
export type UserManagementData = {
  userId: string
  currentRole: Role
  newRole: Role
}
```

Import explicitly:

```typescript
import type { UserManagementData } from '@admin/users/types'
```

## Best Practices

### 1. Use Correct Layer

- **Shared/common** → `_base`
- **Authentication** → `auth`
- **User management** → `users`
- **Platform settings** → `system`

### 2. Avoid Circular Dependencies

Layers should not depend on layers loaded after them:

- ✅ `system` can use `_base`
- ✅ `system` can use `auth`
- ❌ `auth` should not use `system`

### 3. Shared State

Use Pinia stores in `_base/app/stores/` for state shared across layers:

```typescript
// apps/admin/layers/_base/app/stores/useAdminAuthStore.ts
export const useAdminAuthStore = defineStore('adminAuth', () => {
  const admin = ref(null)
  // ...
})
```

### 4. Layer-Specific State

Use Pinia stores in feature layers for layer-specific state:

```typescript
// apps/admin/layers/users/app/stores/useUsersStore.ts
export const useUsersStore = defineStore('users', () => {
  const users = ref([])
  // ...
})
```

### 5. Admin-Only Access

All admin routes must verify `super_admin` role:

```typescript
// apps/admin/layers/auth/app/middleware/admin.global.ts
export default defineNuxtRouteMiddleware(async () => {
  const { user } = useUserSession()
  if (!user.value || user.value.role !== 'super_admin') {
    return navigateTo('/login')
  }
})
```

### 6. Type Safety

Use TypeScript and leverage auto-imports:

```vue
<script setup lang="ts">
import type { User } from '@int/schema'

const admin = useCurrentAdmin() // Auto-imported composable
const toast = useToast() // Auto-imported composable
</script>
```

## Testing

Each layer can have its own tests:

```
_base/
├── app/
│   └── composables/
│       └── useCurrentAdmin.ts
└── tests/
    └── composables/
        └── useCurrentAdmin.test.ts
```

Run tests:

```bash
pnpm test apps/admin/layers/_base
pnpm test apps/admin/layers/users
```

## Deployment

All layers are bundled together when building the admin app:

```bash
cd apps/admin
pnpm build
```

The Nuxt build process automatically merges all layers in the correct order.

## Security Considerations

### Admin Authentication

- All admin routes require `super_admin` role
- Session management via nuxt-auth-utils
- OAuth with Google (same as site app)
- Session cookie: 7-day duration, httpOnly, secure in production

### Role-Based Access

```typescript
// Verify admin role in middleware
if (user.role !== 'super_admin') {
  throw createError({ statusCode: 403, message: 'Admin access required' })
}
```

### Sensitive Operations

- User role changes → audit log entry
- System config updates → audit log entry
- Budget changes → audit log entry
- Never expose API keys in UI (show only last 4 characters)

## Related Documentation

- [Nuxt Layers](https://nuxt.com/docs/getting-started/layers)
- [Project Monorepo Structure](../../../docs/architecture/monorepo.md)
- [Admin App README](../README.md)
- [Site App Layers](../../site/layers/README.md)
