# 013 — Admin Invite Email Flow and Invited Password Activation

## Overview

Improve admin user invitation so that invited users receive a verification/invite email, are redirected by flow type after email click, and can activate invited accounts via email/password (without mandatory OAuth).

This spec contains requirements and clarifications for `/speckit.specify` + `/speckit.clarify`.

## Clarifications

### Session 2026-02-17

- Q: Where should user land after clicking invite email link? → A: Invite flow redirects to `/resume` (not `/profile`).
- Q: What about current email verification flow for existing users? → A: Keep current behavior (`/profile`) for normal verification flow.
- Q: Must invited users be able to finish onboarding without Google/LinkedIn? → A: Yes, invited users must be able to complete activation through email/password registration.
- Q: Does email/password activation replace OAuth activation for invited users? → A: No. Email/password activation is an additional path; existing OAuth activation remains supported.
- Q: What error should register return for invited user before email verification? → A: `403` with stable message key `invite_email_not_verified`.
- Q: Where should invite flow token errors redirect? → A: `/resume?verified=false&error=...`.
- Q: What response contract to use when invite email send fails? → A: keep success HTTP (`201` for create, `200` for resend) and return `inviteEmailSent: boolean` plus optional `inviteEmailError`.
- Q: What if invite email sending fails during admin user creation? → A: User is still created; show non-auto-close toast with `Resend` action in admin UI.
- Q: Add new user status `created` now? → A: No. Keep existing statuses for now.

## Goals

- Add flow-aware verification links so redirect target depends on flow (`verification` vs `invite`).
- Reuse existing email verification infrastructure for invite emails.
- Allow invited users to activate account via email/password registration.
- Preserve user creation even if invite email delivery fails.
- Provide admin UX to retry failed invite sending directly from toast action.

## Non-goals

- Introducing new user statuses (e.g. `created`) in this iteration.
- Reworking global auth modal UX beyond required redirect behavior.
- New email provider integration or delivery analytics.
- New custom invite email template (reuse current verification template for now).

## Scope

### In scope

- Backend invite flow updates in admin/user/auth APIs.
- Flow query parameter propagation in verification links and redirect endpoint.
- Invited account activation path via email/password registration.
- Admin UI toast behavior with persistent `Resend` action on invite-send failure.
- Required type and i18n updates for new API/UI behavior.

### Out of scope

- Changes to DB enum/status model.
- End-user profile page UX redesign.
- New role/permissions model.

## User Stories

### US1: Flow-aware verification redirect

As a user,
I want redirect destination after email verification click to depend on flow,
so invite flow can lead to resume experience while regular verification keeps profile flow.

**Acceptance Criteria:**

- [ ] Verification links include a flow discriminator query param.
- [ ] `verification` flow redirects to `/profile` after token processing.
- [ ] `invite` flow redirects to `/resume` after token processing.
- [ ] Missing/unknown flow safely falls back to `verification` behavior.
- [ ] Error redirects (missing/invalid/expired token) use the same flow-specific base path.
- [ ] Invite-flow errors redirect to `/resume?verified=false&error=...`.

### US2: Admin invite sends email but does not block user creation on delivery failure

As a super admin,
I want invited user creation to succeed even if email delivery fails,
so I can recover by retrying send without losing created user record.

**Acceptance Criteria:**

- [ ] `POST /api/admin/users` still creates invited user and role assignment when email send fails.
- [ ] API response includes explicit invite send result fields: `inviteEmailSent` and optional `inviteEmailError`.
- [ ] Verification token is generated/stored for invited user during invite attempt.
- [ ] No new status values are introduced.

### US3: Invited user can activate via email/password

As an invited user without Google/LinkedIn,
I want to complete onboarding via email/password,
so I can access the product without OAuth providers.

**Acceptance Criteria:**

- [ ] Registration endpoint supports existing invited account activation path.
- [ ] Activation preserves invited role.
- [ ] Activation sets account status to active and sets password hash.
- [ ] Activation path requires verified invite email before password activation.
- [ ] If invited email is not verified, register returns `403` with `invite_email_not_verified`.
- [ ] Non-invited existing email behavior remains unchanged (conflict).
- [ ] Blocked/deleted users remain blocked from auth flows.
- [ ] Existing invited OAuth activation flow remains unchanged and continues to work.

### US4: Admin resend invite from sticky toast

As a super admin,
I want an immediate `Resend` action when invite email was not sent,
so I can retry without navigating away or reopening forms.

**Acceptance Criteria:**

- [ ] Invite failure displays non-auto-close toast.
- [ ] Toast contains `Resend` action button.
- [ ] Resend action calls dedicated admin resend invite endpoint.
- [ ] Success/failure feedback is shown after resend attempt.
- [ ] Sticky toast is dismissible manually.

## API Surface (Specification Level)

### Updated

- `POST /api/admin/users`
  - Creates invited user.
  - Attempts invite email send.
  - Returns HTTP `201` with created user summary + `inviteEmailSent: boolean` + optional `inviteEmailError`.

### New

- `POST /api/admin/users/:id/invite`
  - Super-admin only resend action.
  - Regenerates verification token and retries invite email send.
  - Returns HTTP `200` with `inviteEmailSent: boolean` + optional `inviteEmailError`.

### Updated behavior

- `GET /api/auth/verify-email`
  - Accepts flow query (`verification` | `invite`).
  - Redirect target base depends on flow.
  - Invite-flow errors redirect to `/resume?verified=false&error=...`.

- `POST /api/auth/register`
  - Adds invited activation branch for existing invited account.
  - Returns `403` + `invite_email_not_verified` for invited account without verified email.

## Data Model Impact

- No schema migration required.
- Existing columns reused: `emailVerificationToken`, `emailVerificationExpires`, `emailVerified`, `passwordHash`, `status`.

## Security & Constraints

- Invited password activation must not bypass email ownership proof: require verified email state before activation.
- Flow query must be whitelist-validated (no open redirect behavior).
- Existing blocked/deleted protections must remain unchanged.
- Admin-only resend endpoint must require super-admin authorization.

## i18n Impact

Add admin-facing i18n messages for:

- invite send failed state
- resend action label
- resend success/failure feedback

## Test Scenarios (Specification)

- Admin invites user, email send succeeds → invited user created, flow link works, redirect behavior matches invite flow.
- Admin invites user, email send fails → user still created, sticky toast shown, resend works.
- Invited user verifies email via invite link and registers with password → becomes active with assigned role.
- Invited user attempts register before verification → rejected with explicit error.
- Existing non-invited email register still returns conflict.
- Regular verification flow (`send-verification`) still redirects to profile path.

## Definition of Done

- Requirements and acceptance criteria above are implemented and verified.
- No new user status added.
- Existing verification flow remains backward compatible.
- Admin retry UX available from toast action.
