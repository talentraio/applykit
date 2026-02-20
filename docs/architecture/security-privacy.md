# Security and privacy notes (MVP guardrails)

This is not legal advice. It is a practical implementation-aligned checklist.

## Authentication

Supported methods:

- Google OAuth
- LinkedIn OAuth
- Email/password with verification

### Password and token rules

- Password policy is validated server-side (minimum length and complexity checks).
- Password hashes use bcrypt (`12` rounds).
- Password reset tokens are single-use and expire in ~1 hour.
- Email verification tokens are single-use with standard expiry, except invite flow:
  - for `flow=invite`, token expiry is bypassed while user remains in `invited` status.

### Session management

- Cookie-based sessions via `nuxt-auth-utils`.
- Runtime config sets `maxAge = 7 days`.
- Secure cookie attributes are environment-aware (`Secure` in production).

## Access control

- `/api/*` is auth-protected by default.
- `/api/auth/*` is public.
- `/api/admin/*` requires `super_admin`.
- Blocked/deleted users are denied protected operations.

## LLM credential model

- Platform-managed provider keys only.
- No BYOK runtime flow in current API/UI surface.
- Keys stay server-side (`NUXT_LLM_*`) and must not leak into logs/responses/client bundles.

## LLM routing and scenario controls

- Resolution order: `role override -> scenario default -> runtime fallback`.
- Scenario normalization is enforced server-side (retry/strategy/reasoning fields).
- Inactive model assignments are rejected.
- Scenario-level enable flags and role-level enable overrides are supported.

## Scoring integrity

- Baseline score is generated with adaptation and stored on `Generation`.
- Detailed scoring is on-demand and persisted separately.
- Detailed scoring uses evidence-backed deterministic structure, not opaque score-only output.
- Fallback behavior is explicit through breakdown versioning.

## Profile completion gate

Generation requires profile completeness:

- required now: `firstName`, `lastName`, `email`, `country`, `searchRegion`
- currently not required for gate: `languages` (temporarily relaxed)
- phone and photo are optional

## User data and deletion

Account deletion flow (`DELETE /api/profile/account`) currently:

1. create suppression record from email HMAC (anti-abuse)
2. delete user content (photos, vacancies, resumes, usage logs, profile)
3. sanitize user PII (tombstone)
4. clear session

Hard admin delete can remove suppression to allow clean re-registration.

## GDPR-aligned guardrails

- Data minimization
- Storage limitation
- Access and deletion flows
- Security controls around secrets, sessions, and abuse prevention

Important product rule:

- reuse of resume content for training/datasets must be explicit opt-in,
- consent for that reuse must not be bundled with core product access.
