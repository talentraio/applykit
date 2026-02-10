# Security & privacy notes (MVP guardrails)

This is not legal advice. It's a practical checklist to avoid obvious mistakes.

## Authentication

Supported auth methods:

- **Google OAuth** - Primary OAuth provider
- **LinkedIn OAuth** - Secondary OAuth provider
- **Email/Password** - Traditional registration with email verification

### Password requirements

- Minimum 8 characters
- At least 1 uppercase letter
- At least 1 number
- Hashed with bcrypt (12 rounds)

### Token security

- Email verification tokens: 32 bytes hex, 24h expiry, single-use
- Password reset tokens: 32 bytes hex, 1h expiry, single-use

### Account linking

- When OAuth login matches existing email, accounts are merged
- OAuth-verified emails are automatically marked as verified
- Email change in profile requires re-verification

### Session management

- Cookie-based sessions (7-day expiry)
- HttpOnly, Secure (in production), SameSite=Lax

## Platform-managed LLM keys

- User-provided BYOK keys are removed from runtime/API/UI surface.
- Platform secrets stay server-side in runtime config (`NUXT_LLM_*`), never in client storage.
- Do NOT expose platform keys in logs, responses, or client bundles.
- Continue enforcing role limits, per-user daily caps, and global budget caps for all LLM operations.

## User data (EU / GDPR shape)

If we collect CVs and personal data, we need:

- data minimisation (collect only what we need)
- storage limitation (define retention; don’t keep data forever)
- security measures and deletion flows

Important: if we ever want to reuse resumes to build a dataset, do it as an explicit opt-in.
Do NOT tie consent for dataset reuse to “basic product usage”.

## Account activation gate

MVP gate after resume import:

- allow resume upload + parsing without extra friction
- before generating adapted resumes:
  - ask user to confirm key profile fields (name, email, country/region, languages)
  - phone is optional; support multiple numbers if provided

## “Multi-brand SEO” (post-MVP)

Treat as an experiment with risks.
Avoid tactics that look like doorway sites or duplicate content; it can backfire and damage trust.
Prefer one strong brand + clear landing pages per region/role and real content.
