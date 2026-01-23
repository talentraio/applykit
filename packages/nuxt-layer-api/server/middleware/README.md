# Server Middleware

Nuxt server middleware that runs on every request to the server.

## Overview

This directory contains global server middleware for authentication and authorization:

- **auth.ts**: Requires authenticated user session for API routes
- **admin.ts**: Requires super_admin role for admin API routes

## Execution Order

Nuxt server middleware runs in alphabetical order:

1. `admin.ts` (checks admin routes)
2. `auth.ts` (checks API routes)

Both middlewares are smart and only apply to their respective route patterns.

## Auth Middleware

Protects all API routes except public routes.

### Protected Routes

All routes under `/api/` require authentication by default.

### Public Routes

The following routes are public (no authentication required):

- `/api/auth/google` - OAuth login initiation
- `/api/auth/google/callback` - OAuth callback
- `/api/health` - Health check endpoint
- All routes matching `/^\/api\/auth\//` pattern

### Adding Public Routes

To add a new public route, update the `publicRoutes` or `publicPatterns` arrays:

```typescript
// auth.ts
const publicRoutes = [
  '/api/auth/google',
  '/api/auth/google/callback',
  '/api/health',
  '/api/your-new-public-route' // Add here
]

const publicPatterns = [
  /^\/api\/auth\//,
  /^\/api\/public\// // Or add pattern here
]
```

### Usage in Route Handlers

After auth middleware runs, you can access the user from `event.context`:

```typescript
// server/api/profile.get.ts
export default defineEventHandler(async event => {
  // User is guaranteed to exist (auth middleware already checked)
  const user = event.context.user

  return {
    id: user.id,
    email: user.email,
    role: user.role
  }
})
```

### Manual Session Check

If you need to manually check authentication in a public route:

```typescript
// server/api/optional-auth.get.ts
export default defineEventHandler(async event => {
  // Optional: get session without throwing error
  const session = await getUserSession(event)

  if (session.user) {
    return { message: `Hello ${session.user.email}` }
  }

  return { message: 'Hello guest' }
})
```

## Admin Middleware

Protects admin routes by requiring `super_admin` role.

### Admin Routes

All routes under `/api/admin/` require super_admin role.

### Usage

Admin middleware automatically runs after auth middleware:

```typescript
// server/api/admin/users.get.ts
export default defineEventHandler(async event => {
  // User is guaranteed to be super_admin (admin middleware checked)
  const user = event.context.user
  const isAdmin = event.context.isAdmin // true

  // Perform admin operations
  return await userRepository.findAll()
})
```

### Error Responses

Admin middleware returns:

- **401 Unauthorized**: If user is not authenticated
- **403 Forbidden**: If user is authenticated but not super_admin

## Session Management

Sessions are managed by `nuxt-auth-utils` with encrypted cookies.

### Session Duration

- **Default**: 7 days
- **Configuration**: `nuxt.config.ts` → `runtimeConfig.session.maxAge`

### Session Data Structure

```typescript
type UserSession = {
  user: {
    id: string
    email: string
    role: 'super_admin' | 'friend' | 'public'
    googleId: string
  }
  loggedInAt?: Date
}
```

### Session Helpers

Available in server routes:

```typescript
// Get session (returns empty object if not authenticated)
const session = await getUserSession(event)

// Require session (throws 401 if not authenticated)
const session = await requireUserSession(event)

// Set session (after login)
await setUserSession(event, {
  user: {
    id: user.id,
    email: user.email,
    role: user.role,
    googleId: user.googleId
  },
  loggedInAt: new Date()
})

// Clear session (logout)
await clearUserSession(event)

// Replace session (update user data)
await replaceUserSession(event, newSessionData)
```

## Environment Variables

Required environment variables:

```bash
# Session encryption key (required, minimum 32 characters)
NUXT_SESSION_PASSWORD=your-super-secret-password-with-at-least-32-characters

# Google OAuth credentials
NUXT_OAUTH_GOOGLE_CLIENT_ID=your_google_client_id
NUXT_OAUTH_GOOGLE_CLIENT_SECRET=your_google_client_secret
```

### Generating Session Password

```bash
# Using openssl
openssl rand -base64 32

# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Security Notes

### Session Cookies

- **HttpOnly**: true (prevents XSS attacks)
- **Secure**: true in production (HTTPS only)
- **SameSite**: lax (prevents CSRF attacks)
- **Encrypted**: Uses `NUXT_SESSION_PASSWORD`

### Best Practices

1. **Never store sensitive data in session** (use database instead)
2. **Keep sessions short** (7 days max for most apps)
3. **Rotate session password** periodically in production
4. **Use HTTPS in production** (secure cookies won't work on HTTP)
5. **Validate session data** on every request (role checks, etc.)

### Session Size Limits

Cookie size limit is ~4KB. For larger data:

```typescript
// ❌ Don't store large data in session
await setUserSession(event, {
  user: { id: '123', email: 'user@example.com' },
  resume: hugeResumeObject // Too large!
})

// ✅ Store only ID, fetch from DB when needed
await setUserSession(event, {
  user: { id: '123', email: 'user@example.com' }
})

// Later, in route handler:
const resume = await resumeRepository.findById(user.id)
```

## Testing

### Mocking Authenticated User

```typescript
import { vi } from 'vitest'

// Mock getUserSession
vi.mock('#imports', () => ({
  getUserSession: vi.fn().mockResolvedValue({
    user: {
      id: 'test-user-id',
      email: 'test@example.com',
      role: 'public'
    }
  })
}))
```

### Testing Protected Routes

```typescript
describe('Protected API Route', () => {
  it('should return 401 for unauthenticated user', async () => {
    vi.mocked(getUserSession).mockResolvedValue({})

    const response = await $fetch('/api/protected', {
      ignoreResponseError: true
    })

    expect(response.statusCode).toBe(401)
  })

  it('should return data for authenticated user', async () => {
    vi.mocked(getUserSession).mockResolvedValue({
      user: { id: '123', email: 'user@example.com', role: 'public' }
    })

    const response = await $fetch('/api/protected')
    expect(response).toBeDefined()
  })
})
```

## Related

- **Auth Routes**: T059-T063 (Google OAuth implementation)
- **User Repository**: T028 (user data access)
- **Profile Repository**: T029 (profile data access)
- **Usage Logs**: T034 (track operations per user)
