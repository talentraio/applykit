# Specification: Authentication Expansion

> **Feature**: 003-auth-expansion
> **Status**: Implemented
> **Created**: 2026-01-29
> **Plan**: [plan.md](./plan.md)

---

## Overview

Expand the authentication system to support multiple methods (Google, LinkedIn, Email/Password) with modal-based UI flows and email verification.

---

## User Stories

### US1: LinkedIn OAuth Login

**As a** user
**I want to** sign in with my LinkedIn account
**So that** I can quickly access ApplyKit using my professional identity

**Acceptance Criteria:**

- [ ] LinkedIn OAuth button visible on login modal
- [ ] Clicking initiates LinkedIn OAuth flow
- [ ] New users are created with LinkedIn ID
- [ ] Existing users (same email) get LinkedIn linked to their account
- [ ] Session created after successful OAuth

### US2: Email/Password Registration

**As a** new user
**I want to** create an account with my email and password
**So that** I can use ApplyKit without social accounts

**Acceptance Criteria:**

- [ ] Registration form with: firstName, lastName, email, password, confirmPassword
- [ ] Password validation: min 8 chars, 1 uppercase, 1 number
- [ ] Email uniqueness check
- [ ] Verification email sent after registration
- [ ] Auto-login after successful registration
- [ ] Account created with `emailVerified: false`

### US3: Email/Password Login

**As a** registered user
**I want to** sign in with my email and password
**So that** I can access my account

**Acceptance Criteria:**

- [ ] Login form with email and password fields
- [ ] Error message for invalid credentials (no email enumeration)
- [ ] Rate limiting: 5 attempts per 15 minutes per email
- [ ] Session created after successful login
- [ ] Can login even if email not verified (with reminder)

### US4: Password Reset

**As a** user who forgot my password
**I want to** reset my password via email
**So that** I can regain access to my account

**Acceptance Criteria:**

- [ ] "Forgot password" link on login modal
- [ ] Form to enter email address
- [ ] Reset email sent (or silent success if email not found)
- [ ] Reset link valid for 1 hour
- [ ] Reset page with new password form
- [ ] Password updated and token invalidated
- [ ] Redirect to login modal with success message

### US5: Email Verification

**As a** user with unverified email
**I want to** verify my email address
**So that** my account is fully activated

**Acceptance Criteria:**

- [ ] Verification status shown in profile (next to email field)
- [ ] "Send verification email" button for unverified users
- [ ] Verification email with 24h valid link
- [ ] Clicking link verifies email and redirects to profile
- [ ] Success/error feedback shown
- [ ] Rate limit: 3 emails per hour

### US6: Modal-Based Auth UI

**As a** user
**I want to** login/register via modal
**So that** I don't lose my current page context

**Acceptance Criteria:**

- [ ] Auth modal triggered from header "Sign In" button
- [ ] Auth modal triggered from protected route redirects
- [ ] Modal has tabs/links: Login ↔ Register ↔ Forgot Password
- [ ] URL synced with modal state (`?auth=login`, `?auth=register`)
- [ ] Modal closes on successful auth
- [ ] Modal closes on backdrop click or ESC
- [ ] /login page removed (redirects to /?auth=login)

### US7: Account Linking

**As a** user with email/password account
**I want to** link my Google or LinkedIn account
**So that** I can use either method to login

**Acceptance Criteria:**

- [ ] OAuth with existing email links to account (not creates new)
- [ ] User can then login via password OR OAuth
- [ ] Profile shows linked providers (future: unlink option)

---

## Data Model Changes

### Users Table (Modified)

```typescript
type User = {
  id: string;
  email: string;
  googleId: string | null; // Was required, now nullable
  linkedInId: string | null; // NEW
  passwordHash: string | null; // NEW
  emailVerified: boolean; // NEW, default false
  emailVerificationToken: string | null; // NEW
  emailVerificationExpires: Date | null; // NEW
  passwordResetToken: string | null; // NEW
  passwordResetExpires: Date | null; // NEW
  role: 'super_admin' | 'friend' | 'public';
  status: 'active' | 'invited' | 'blocked' | 'deleted';
  lastLoginAt: Date | null;
  deletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

// Constraint: At least one of googleId, linkedInId, or passwordHash must be set
```

### Drizzle Schema Changes

```typescript
// packages/nuxt-layer-api/server/data/schema.ts

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  googleId: varchar('google_id', { length: 255 }).unique(), // Remove .notNull()
  linkedInId: varchar('linkedin_id', { length: 255 }).unique(), // NEW
  passwordHash: varchar('password_hash', { length: 255 }), // NEW
  emailVerified: boolean('email_verified').notNull().default(false), // NEW
  emailVerificationToken: varchar('email_verification_token', { length: 64 }), // NEW
  emailVerificationExpires: timestamp('email_verification_expires', { mode: 'date' }), // NEW
  passwordResetToken: varchar('password_reset_token', { length: 64 }), // NEW
  passwordResetExpires: timestamp('password_reset_expires', { mode: 'date' }), // NEW
  role: roleEnum('role').notNull().default(USER_ROLE_MAP.PUBLIC),
  status: userStatusEnum('status').notNull().default('active'),
  lastLoginAt: timestamp('last_login_at', { mode: 'date' }),
  deletedAt: timestamp('deleted_at', { mode: 'date' }),
  createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow()
});
```

---

## API Specification

### POST /api/auth/register

Create new account with email/password.

**Request:**

```typescript
{
  email: string; // Valid email, unique
  password: string; // Min 8 chars, 1 uppercase, 1 number
  firstName: string; // Required
  lastName: string; // Required
}
```

**Response (201):**

```typescript
{
  success: true;
}
// + Set-Cookie: session
```

**Errors:**

- 400: Validation error (password requirements, missing fields)
- 409: Email already registered

**Side Effects:**

- Creates user with `emailVerified: false`
- Creates profile with firstName, lastName, email
- Sends verification email
- Creates session (auto-login)

---

### POST /api/auth/login

Login with email/password.

**Request:**

```typescript
{
  email: string;
  password: string;
}
```

**Response (200):**

```typescript
{
  success: true,
  emailVerified: boolean  // So UI can show reminder
}
// + Set-Cookie: session
```

**Errors:**

- 401: Invalid credentials
- 429: Too many attempts

**Rate Limit:** 5 attempts per email per 15 minutes

---

### POST /api/auth/forgot-password

Request password reset email.

**Request:**

```typescript
{
  email: string;
}
```

**Response (200):**

```typescript
{
  success: true;
}
// Always returns success (prevents email enumeration)
```

**Side Effects (if email exists and has password):**

- Generates reset token (32 bytes hex)
- Sets expiry to 1 hour
- Sends reset email

**Rate Limit:** 3 per email per hour

---

### POST /api/auth/reset-password

Reset password with token.

**Request:**

```typescript
{
  token: string;
  password: string; // Same requirements as register
}
```

**Response (200):**

```typescript
{
  success: true;
}
```

**Errors:**

- 400: Invalid or expired token
- 400: Password validation failed

**Side Effects:**

- Updates passwordHash
- Clears reset token
- Does NOT create session (user must login)

---

### POST /api/auth/send-verification

Send/resend verification email for current user.

**Request:** None (uses session)

**Response (200):**

```typescript
{
  success: true;
}
```

**Errors:**

- 401: Not authenticated
- 400: Email already verified
- 429: Too many requests

**Rate Limit:** 3 per user per hour

**Side Effects:**

- Generates verification token (32 bytes hex)
- Sets expiry to 24 hours
- Sends verification email

---

### GET /api/auth/verify-email

Verify email with token.

**Query:**

```
?token=xxx
```

**Response:** Redirect to `/profile?emailVerified=true`

**Errors:** Redirect to `/profile?emailVerified=false&error=invalid_token`

**Side Effects:**

- Sets `emailVerified: true`
- Clears verification token

---

### GET /auth/linkedin

LinkedIn OAuth flow (same pattern as Google).

**Flow:**

1. Initial request → Redirect to LinkedIn consent
2. Callback → Create/link user → Create session → Redirect

**Account Linking Logic:**

```
if (existingUserByLinkedInId) {
  // Known LinkedIn user - login
  createSession(existingUser)
} else if (existingUserByEmail) {
  // Email exists - link LinkedIn to account
  updateUser({ linkedInId })
  createSession(existingUser)
} else {
  // New user - create account
  createUser({ email, linkedInId, emailVerified: true })
  createSession(newUser)
}
```

---

## UI Components

### AuthModal (`apps/site/layers/auth/app/components/modal/AuthModal.vue`)

Container component managing auth flow states.

**Props:**

```typescript
{
  open: boolean;
  initialView?: 'login' | 'register' | 'forgot';
}
```

**Emits:**

```typescript
{
  'update:open': [value: boolean];
  'success': [];
}
```

**State Management:**

- Syncs with URL query param `?auth=login|register|forgot`
- Removes query param on close

---

### LoginForm (`apps/site/layers/auth/app/components/modal/LoginForm.vue`)

**Content:**

1. OAuth buttons (Google, LinkedIn)
2. Divider "or"
3. Email input
4. Password input
5. "Forgot password?" link
6. Submit button
7. "Don't have account? Register" link

**Validation:**

- Email: required, valid format
- Password: required

**On Submit:**

- Call POST /api/auth/login
- On success: emit 'success', close modal
- On error: show error message

---

### RegisterForm (`apps/site/layers/auth/app/components/modal/RegisterForm.vue`)

**Content:**

1. OAuth buttons (Google, LinkedIn)
2. Divider "or"
3. First Name input
4. Last Name input
5. Email input
6. Password input (with requirements hint)
7. Confirm Password input
8. Submit button
9. "Already have account? Sign in" link

**Validation:**

- All fields required
- Email: valid format
- Password: min 8 chars, 1 uppercase, 1 number
- Confirm: must match password

**On Submit:**

- Call POST /api/auth/register
- On success: emit 'success', close modal, show toast "Check email for verification"
- On error: show error message

---

### ForgotPasswordForm (`apps/site/layers/auth/app/components/modal/ForgotPasswordForm.vue`)

**Content:**

1. Description text
2. Email input
3. Submit button
4. "Back to login" link

**On Submit:**

- Call POST /api/auth/forgot-password
- Always show success: "If email exists, you'll receive reset instructions"
- Switch to login view after 3 seconds

---

### ResetPasswordPage (`apps/site/layers/auth/app/pages/auth/reset-password.vue`)

Standalone page (not modal) for password reset.

**URL:** `/auth/reset-password?token=xxx`

**Content:**

1. New Password input
2. Confirm Password input
3. Submit button

**Validation:**

- Password requirements same as register
- Confirm must match

**On Submit:**

- Call POST /api/auth/reset-password
- On success: redirect to `/?auth=login` with success toast
- On error: show error, allow retry

**On Invalid/Missing Token:**

- Show error state with link to forgot password

---

### useAuthModal Composable

```typescript
// apps/site/layers/auth/app/composables/useAuthModal.ts

export function useAuthModal() {
  const isOpen = ref(false);
  const view = ref<'login' | 'register' | 'forgot'>('login');

  function open(initialView: 'login' | 'register' | 'forgot' = 'login') {
    view.value = initialView;
    isOpen.value = true;
    // Update URL: ?auth=login
  }

  function close() {
    isOpen.value = false;
    // Remove ?auth from URL
  }

  function switchView(newView: 'login' | 'register' | 'forgot') {
    view.value = newView;
    // Update URL
  }

  // Watch route query on mount to open modal if ?auth=xxx

  return { isOpen, view, open, close, switchView };
}
```

---

### Profile Email Verification UI

In `apps/site/layers/profile/app/components/Form/section/Basic.vue`:

```vue
<div class="flex items-center gap-2">
  <UInput v-model="email" type="email" />

  <!-- Verified badge -->
  <UBadge v-if="emailVerified" color="success" variant="subtle">
    <UIcon name="i-lucide-check" /> Verified
  </UBadge>

  <!-- Unverified state -->
  <template v-else>
    <UBadge color="warning" variant="subtle">
      <UIcon name="i-lucide-alert-triangle" /> Not verified
    </UBadge>
    <UButton
      size="xs"
      variant="soft"
      :loading="sendingVerification"
      @click="sendVerification"
    >
      Send verification
    </UButton>
  </template>
</div>
```

---

## Email Templates

### Verification Email

**Subject:** Verify your ApplyKit email

```html
<h1>Verify your email</h1>
<p>Hi {{firstName}},</p>
<p>Please verify your email address to complete your ApplyKit account setup.</p>
<a href="{{verifyUrl}}" class="button">Verify Email</a>
<p>This link expires in 24 hours.</p>
<p>If you didn't create an account on ApplyKit, you can safely ignore this email.</p>
```

### Password Reset Email

**Subject:** Reset your ApplyKit password

```html
<h1>Reset your password</h1>
<p>Hi {{firstName}},</p>
<p>
  We received a request to reset your password. Click the button below to choose a new password.
</p>
<a href="{{resetUrl}}" class="button">Reset Password</a>
<p>This link expires in 1 hour.</p>
<p>If you didn't request a password reset, you can safely ignore this email.</p>
```

---

## i18n Keys

```json
{
  "auth": {
    "modal": {
      "loginTitle": "Sign in to ApplyKit",
      "registerTitle": "Create your account",
      "forgotTitle": "Reset your password"
    },
    "login": {
      "email": "Email",
      "password": "Password",
      "submit": "Sign In",
      "forgotPassword": "Forgot password?",
      "noAccount": "Don't have an account?",
      "register": "Create account",
      "error": {
        "invalid": "Invalid email or password",
        "tooMany": "Too many attempts. Please try again later."
      }
    },
    "register": {
      "firstName": "First Name",
      "lastName": "Last Name",
      "email": "Email",
      "password": "Password",
      "confirmPassword": "Confirm Password",
      "submit": "Create Account",
      "hasAccount": "Already have an account?",
      "signIn": "Sign in",
      "passwordHint": "Min 8 characters, 1 uppercase, 1 number",
      "success": "Account created! Check your email for verification.",
      "error": {
        "emailExists": "An account with this email already exists",
        "passwordMismatch": "Passwords do not match",
        "passwordWeak": "Password does not meet requirements"
      }
    },
    "forgot": {
      "description": "Enter your email and we'll send you a link to reset your password.",
      "email": "Email",
      "submit": "Send Reset Link",
      "backToLogin": "Back to login",
      "success": "If an account exists with this email, you'll receive reset instructions."
    },
    "reset": {
      "title": "Set new password",
      "password": "New Password",
      "confirmPassword": "Confirm New Password",
      "submit": "Reset Password",
      "success": "Password reset successfully. Please sign in.",
      "error": {
        "invalid": "Invalid or expired reset link",
        "expired": "This reset link has expired"
      }
    },
    "verification": {
      "verified": "Verified",
      "notVerified": "Not verified",
      "sendButton": "Send verification",
      "sent": "Verification email sent",
      "success": "Email verified successfully",
      "error": {
        "invalid": "Invalid verification link",
        "expired": "Verification link has expired"
      }
    },
    "oauth": {
      "google": "Continue with Google",
      "linkedin": "Continue with LinkedIn",
      "or": "or"
    }
  }
}
```

---

## Security Checklist

- [ ] Passwords hashed with bcrypt (cost factor 12)
- [ ] Tokens are cryptographically random (32 bytes)
- [ ] Tokens are single-use
- [ ] Token expiry enforced
- [ ] Rate limiting on auth endpoints
- [ ] No email enumeration (consistent responses)
- [ ] CSRF protection via SameSite cookies
- [ ] Session invalidation on password reset
- [ ] Secure password requirements enforced
- [ ] OAuth state parameter validated

---

## Migration Notes

### Existing Users

- All existing Google users get `emailVerified: true` (Google provides verified emails)
- `googleId` column becomes nullable but existing values preserved

### Migration SQL

```sql
-- Make googleId nullable
ALTER TABLE users ALTER COLUMN google_id DROP NOT NULL;

-- Add new columns
ALTER TABLE users
  ADD COLUMN linkedin_id VARCHAR(255) UNIQUE,
  ADD COLUMN password_hash VARCHAR(255),
  ADD COLUMN email_verified BOOLEAN NOT NULL DEFAULT true, -- true for existing
  ADD COLUMN email_verification_token VARCHAR(64),
  ADD COLUMN email_verification_expires TIMESTAMP,
  ADD COLUMN password_reset_token VARCHAR(64),
  ADD COLUMN password_reset_expires TIMESTAMP;

-- Index for token lookups
CREATE INDEX idx_users_email_verification_token ON users(email_verification_token) WHERE email_verification_token IS NOT NULL;
CREATE INDEX idx_users_password_reset_token ON users(password_reset_token) WHERE password_reset_token IS NOT NULL;
```

---

## Test Scenarios

### Registration

1. Register with valid data → success, email sent, auto-login
2. Register with existing email → error 409
3. Register with weak password → error 400
4. Register with mismatched passwords → client validation error

### Login

1. Login with valid credentials → success, session created
2. Login with wrong password → error 401
3. Login with non-existent email → error 401 (same message)
4. Login after 5 failed attempts → error 429

### Password Reset

1. Request reset for existing email → email sent
2. Request reset for non-existent email → success (no email)
3. Reset with valid token → password updated
4. Reset with expired token → error 400
5. Reset with used token → error 400

### OAuth Linking

1. Google login, new user → account created
2. Google login, email exists (password user) → account linked
3. LinkedIn login, new user → account created
4. LinkedIn login, email exists → account linked

### Email Verification

1. Click valid verification link → email verified
2. Click expired link → error shown
3. Resend verification → new email sent
4. Resend too many times → rate limited
