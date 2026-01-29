# Plan: Authentication Expansion

> **Feature**: 003-auth-expansion
> **Status**: Implemented
> **Created**: 2026-01-29

## Overview

Expand authentication system to support multiple methods:

1. LinkedIn OAuth (in addition to existing Google OAuth)
2. Email/Password registration and login
3. Replace login page with modal-based authentication UI
4. Email verification flow integrated into profile

## Goals

- Multiple auth methods: Google, LinkedIn, Email/Password
- Seamless UX with modal-based auth flows
- Email verification for password-based accounts
- Password reset functionality
- Maintain existing session-based security model

## Non-Goals (This Phase)

- Mobile app JWT authentication
- Apple Sign-In / GitHub OAuth
- Two-factor authentication (2FA)
- Social account linking (merge accounts)

---

## Architecture Decisions

### 1. Session Strategy

**Decision**: Keep session-based auth (cookies)
**Rationale**: SSR-first Nuxt app, no mobile API needs, simpler security model

### 2. Password Hashing

**Decision**: Use `bcrypt` via `bcryptjs` package
**Rationale**: Well-tested, good defaults, pure JS (no native deps for serverless)

### 3. Email Service

**Decision**: Use Resend (or configurable via env)
**Rationale**: Simple API, generous free tier, good DX

### 4. Modal vs Page

**Decision**: Modal-based auth with URL state sync
**Rationale**: Better UX, no page navigation, can trigger from anywhere

---

## Database Changes

### Users Table Modifications

```sql
-- Make googleId nullable (was required)
ALTER TABLE users ALTER COLUMN google_id DROP NOT NULL;

-- Add new columns
ALTER TABLE users ADD COLUMN linkedin_id VARCHAR(255) UNIQUE;
ALTER TABLE users ADD COLUMN password_hash VARCHAR(255);
ALTER TABLE users ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN email_verification_token VARCHAR(255);
ALTER TABLE users ADD COLUMN email_verification_expires TIMESTAMP;
ALTER TABLE users ADD COLUMN password_reset_token VARCHAR(255);
ALTER TABLE users ADD COLUMN password_reset_expires TIMESTAMP;

-- Add constraint: user must have at least one auth method
-- (enforced in application layer, not DB)
```

### Migration Strategy

- Existing Google users: `emailVerified = true` (trusted from Google)
- New password users: `emailVerified = false` until verified

---

## API Design

### New Auth Endpoints

| Method | Endpoint                      | Description                        |
| ------ | ----------------------------- | ---------------------------------- |
| POST   | `/api/auth/register`          | Create account with email/password |
| POST   | `/api/auth/login`             | Login with email/password          |
| POST   | `/api/auth/forgot-password`   | Request password reset email       |
| POST   | `/api/auth/reset-password`    | Reset password with token          |
| POST   | `/api/auth/send-verification` | Send/resend verification email     |
| GET    | `/api/auth/verify-email`      | Verify email with token            |
| GET    | `/auth/linkedin`              | LinkedIn OAuth flow                |

### Request/Response Schemas

```typescript
// POST /api/auth/register
RegisterInput = {
  email: string;      // valid email
  password: string;   // min 8 chars, 1 uppercase, 1 number
  firstName: string;
  lastName: string;
}
// Response: { success: true } + Set-Cookie (auto-login after register)

// POST /api/auth/login
LoginInput = {
  email: string;
  password: string;
}
// Response: { success: true } + Set-Cookie
// Error: 401 { message: "Invalid credentials" }

// POST /api/auth/forgot-password
ForgotPasswordInput = {
  email: string;
}
// Response: { success: true } (always, to prevent email enumeration)

// POST /api/auth/reset-password
ResetPasswordInput = {
  token: string;
  password: string;
}
// Response: { success: true }
// Error: 400 { message: "Invalid or expired token" }

// POST /api/auth/send-verification
// No body (uses current session)
// Response: { success: true }

// GET /api/auth/verify-email?token=xxx
// Response: redirect to /profile?verified=true
// Error: redirect to /profile?verified=false
```

---

## UI Components

### Auth Modals (New)

Located in `apps/site/layers/auth/app/components/modal/`

```
modal/
├── AuthModal.vue          # Container with tab switching
├── LoginForm.vue          # Email/password + OAuth buttons
├── RegisterForm.vue       # Registration form
├── ForgotPasswordForm.vue # Request reset
└── ResetPasswordForm.vue  # New password (standalone page)
```

### Modal Behavior

1. **Trigger**: From header, protected routes, or any CTA
2. **URL Sync**: `?auth=login`, `?auth=register`, `?auth=forgot`
3. **Close**: Click outside, ESC, or successful auth
4. **Switch**: Tabs/links between login ↔ register ↔ forgot

### Login Modal Content

```
┌─────────────────────────────────────┐
│         Sign In to ApplyKit         │
├─────────────────────────────────────┤
│  [Google Button - full width]       │
│  [LinkedIn Button - full width]     │
│                                     │
│  ────────── or ──────────           │
│                                     │
│  Email: [________________]          │
│  Password: [________________]       │
│                                     │
│  [Forgot password?]                 │
│                                     │
│  [        Sign In        ]          │
│                                     │
│  Don't have an account? [Register]  │
└─────────────────────────────────────┘
```

### Register Modal Content

```
┌─────────────────────────────────────┐
│       Create Your Account           │
├─────────────────────────────────────┤
│  [Google Button - full width]       │
│  [LinkedIn Button - full width]     │
│                                     │
│  ────────── or ──────────           │
│                                     │
│  First Name: [________________]     │
│  Last Name: [________________]      │
│  Email: [________________]          │
│  Password: [________________]       │
│  Confirm Password: [________________]│
│                                     │
│  [       Create Account     ]       │
│                                     │
│  Already have an account? [Sign In] │
└─────────────────────────────────────┘
```

### Profile Email Verification

In profile form, next to email field:

```
Email: [alex@example.com]  ✓ Verified
-- or --
Email: [alex@example.com]  [Verify Email] ⚠️ Not verified
```

### Password Reset Page

Standalone page at `/auth/reset-password?token=xxx`:

- Token in URL, not modal
- Form: new password + confirm
- Redirect to login modal on success

---

## Email Templates

### Verification Email

```
Subject: Verify your ApplyKit email

Hi {firstName},

Please verify your email address by clicking the link below:

[Verify Email]

This link expires in 24 hours.

If you didn't create an account, you can ignore this email.
```

### Password Reset Email

```
Subject: Reset your ApplyKit password

Hi {firstName},

We received a request to reset your password. Click the link below:

[Reset Password]

This link expires in 1 hour.

If you didn't request this, you can ignore this email.
```

---

## Security Considerations

### Password Requirements

- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 number
- Validated client-side and server-side

### Rate Limiting

- Login: 5 attempts per email per 15 minutes
- Register: 3 per IP per hour
- Forgot password: 3 per email per hour
- Send verification: 3 per user per hour

### Token Security

- Verification tokens: 32 bytes, hex encoded, 24h expiry
- Reset tokens: 32 bytes, hex encoded, 1h expiry
- Single use (invalidated after use)

### Email Enumeration Prevention

- Forgot password always returns success
- Login error: "Invalid credentials" (not "user not found")

---

## Implementation Phases

### Phase 1: Database & Schema ✅

- [x] Update Drizzle schema
- [x] Update user repository
- [x] Update Zod schemas in @int/schema

### Phase 2: LinkedIn OAuth ✅

- [x] Create LinkedIn OAuth handler
- [x] Update user repository for LinkedIn
- [x] Add LinkedIn button to UI

### Phase 3: Email/Password Backend ✅

- [x] Password hashing service
- [x] Register endpoint
- [x] Login endpoint
- [x] Forgot password endpoint
- [x] Reset password endpoint
- [x] Email service setup (Resend)
- [x] Verification endpoints

### Phase 4: Auth Modals UI ✅

- [x] Create AuthModal container
- [x] LoginForm component
- [x] RegisterForm component
- [x] ForgotPasswordForm component
- [x] ResetPasswordForm page
- [x] URL state sync (?auth=login|register|forgot)
- [x] Update /login page to redirect to modal

### Phase 5: Profile Integration ✅

- [x] Email verification status in profile
- [x] Send verification button
- [x] Verification success handling

### Phase 6: Polish & i18n ✅

- [x] i18n keys for all auth strings
- [x] Error handling
- [ ] Rate limiting (deferred to future task)

---

## Files to Create/Modify

### New Files

```
packages/nuxt-layer-api/
├── server/routes/auth/linkedin.ts
├── server/api/auth/register.post.ts
├── server/api/auth/login.post.ts
├── server/api/auth/forgot-password.post.ts
├── server/api/auth/reset-password.post.ts
├── server/api/auth/send-verification.post.ts
├── server/api/auth/verify-email.get.ts
├── server/services/email/index.ts
├── server/services/email/templates/
│   ├── verification.ts
│   └── password-reset.ts
└── server/services/password.ts

apps/site/layers/auth/app/
├── components/modal/
│   ├── AuthModal.vue
│   ├── LoginForm.vue
│   ├── RegisterForm.vue
│   └── ForgotPasswordForm.vue
├── pages/auth/reset-password.vue
└── composables/useAuthModal.ts
```

### Modified Files

```
packages/nuxt-layer-api/server/data/schema.ts
packages/nuxt-layer-api/server/data/repositories/user.ts
packages/schema/schemas/user.ts
packages/nuxt-layer-ui/i18n/locales/en.json
apps/site/layers/auth/app/pages/login.vue (delete or redirect)
apps/site/layers/profile/app/components/Form/section/Basic.vue
apps/site/app/components/AppHeader.vue (trigger modal)
```

---

## Environment Variables

```bash
# Email service (Resend)
NUXT_EMAIL_RESEND_API_KEY="re_xxx"
NUXT_EMAIL_FROM="ApplyKit <noreply@applykit.com>"

# LinkedIn OAuth
NUXT_OAUTH_LINKEDIN_CLIENT_ID="xxx"
NUXT_OAUTH_LINKEDIN_CLIENT_SECRET="xxx"
```

---

## Resolved Questions

1. **Account linking**: If user registers with email, then tries Google/LinkedIn with same email?
   - **Decision: Merge accounts** - link OAuth provider to existing account

2. **Email change**: Should changing email in profile require re-verification?
   - **Decision: Yes** - only the new email needs verification

3. **Password change**: Add "Change password" for password users in settings?
   - Deferred to future task

---

## Success Criteria

- [ ] User can register with email/password
- [ ] User can login with email/password
- [ ] User can login with Google OAuth (existing)
- [ ] User can login with LinkedIn OAuth (new)
- [ ] User can reset forgotten password
- [ ] User can verify email from profile
- [ ] Auth flows work via modals (no /login page)
- [ ] All forms have proper validation
- [ ] Rate limiting prevents abuse
- [ ] i18n complete for all auth strings
