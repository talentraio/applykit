# Implementation Plan: 013 — Admin Invite Email Flow and Invited Password Activation

**Branch**: `013-admin-invite-email-flow` | **Date**: 2026-02-17 | **Spec**: `/Users/kolobok/WebstormProjects/_My/resume-editor/specs/013-admin-invite-email-flow/spec.md`
**Input**: Feature specification from `/Users/kolobok/WebstormProjects/_My/resume-editor/specs/013-admin-invite-email-flow/spec.md`

## Summary

Implement flow-aware email verification redirects, resilient admin invite sending with explicit send-result contract, resend action from sticky toast, and invited account activation via email/password as an additional path to existing OAuth activation.

No DB schema migration is planned in this iteration.

## Technical Context

**Language/Version**: TypeScript 5.x (Nuxt 4 / Vue 3)
**Primary Dependencies**: Nuxt 4, NuxtUI 4, Pinia, Zod, Drizzle ORM, `nuxt-auth-utils`
**Database**: PostgreSQL via existing Drizzle schema (`users` table auth columns already present)
**Testing**: Typecheck + targeted API behavior tests + manual admin/site auth smoke
**Scope**: Cross-layer change (`@int/api`, `apps/admin`, `apps/site` behavior via existing routes)

## Constitution Check

| Principle                 | Status | Notes                                                                                     |
| ------------------------- | ------ | ----------------------------------------------------------------------------------------- |
| Documentation Is Binding  | PASS   | Plan strictly follows `spec.md` decisions (flow redirect, 403 contract, resend behavior). |
| Nuxt Stack Invariants     | PASS   | Stays on Nuxt 4 + NuxtUI 4 patterns and existing layer boundaries.                        |
| Schema-First Contracts    | PASS   | API contract changes are explicit; no DB enum/schema additions in this feature.           |
| Store/Action Data Flow    | PASS   | Admin UI retry wired through existing infra API + store/composable chain.                 |
| i18n and SSR Requirements | PASS   | New admin UI messages included via i18n keys; no SSR model changes.                       |

## Project Structure

### Documentation (this feature)

```text
specs/013-admin-invite-email-flow/
├── spec.md
├── plan.md
└── tasks.md  # produced in /speckit.tasks
```

### Source touchpoints

```text
packages/nuxt-layer-api/
├── server/services/email/index.ts                      # add flow-aware verification URL builder
├── server/api/auth/verify-email.get.ts                 # flow-aware redirects
├── server/api/admin/users/index.post.ts                # create invited + send invite (non-blocking)
├── server/api/admin/users/[id]/invite.post.ts          # new resend invite endpoint
├── server/api/auth/register.post.ts                    # invited activation via email/password
└── server/data/repositories/user.ts                    # helper for invited password activation

apps/admin/layers/users/
├── app/infrastructure/admin-users.api.ts               # response contract + resend method
├── app/stores/admin-users.ts                           # resend action bridge
├── app/composables/useAdminUsers.ts                    # resend method exposure
├── app/pages/users/index.vue                           # sticky toast + Resend action
└── i18n/locales/en.json                                # invite send/resend messages
```

## Design Decisions

### 1) Flow-aware verification redirects

- Add verification flow discriminator: `flow=verification|invite`.
- Email sender defaults to `verification` for backward compatibility.
- Invite flow passes `flow=invite`.

Redirect matrix in `GET /api/auth/verify-email`:

- `flow=verification`:
  - success → `/profile?verified=true`
  - error → `/profile?verified=false&error=<code>`
- `flow=invite`:
  - success → `/resume?verified=true`
  - error → `/resume?verified=false&error=<code>`
- missing/unknown flow:
  - treated as `verification`

### 2) Invite create/resend response contract

`POST /api/admin/users` (HTTP `201`):

```ts
type AdminInviteCreateResponse = {
  id: string;
  email: string;
  role: Role;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
  deletedAt: Date | null;
  inviteEmailSent: boolean;
  inviteEmailError?: string;
};
```

`POST /api/admin/users/:id/invite` (HTTP `200`):

```ts
type AdminInviteResendResponse = {
  inviteEmailSent: boolean;
  inviteEmailError?: string;
};
```

Behavior:

- User creation is not rolled back on delivery failure.
- Token generation/storage happens before send attempt.
- API returns send result explicitly, never hides delivery outcome.

### 3) Invited activation via email/password (additional to OAuth)

Register flow when email already exists:

- `status=invited`:
  - if `emailVerified=false` → return `403` with message key `invite_email_not_verified`
  - if `emailVerified=true` → activate invited by setting password hash and `status=active`, preserving role
  - keep existing OAuth activation paths unchanged
- non-invited existing users → existing conflict behavior (`409`)
- blocked/deleted users → remain blocked from auth flows

## Implementation Phases

### Phase 1: Verification flow parameterization

1. Extend email verification URL generation with optional `flow` argument, default `verification`.
2. Update invite-sending callers to pass `flow=invite`.
3. Update `verify-email` handler to validate flow and map success/error redirects per matrix.

### Phase 2: Admin invite robustness + resend endpoint

1. Update `POST /api/admin/users`:
   - create invited user
   - generate/store verification token
   - attempt invite email send (`flow=invite`)
   - return user summary + `inviteEmailSent` (+ optional error)
2. Add `POST /api/admin/users/:id/invite`:
   - super-admin guard
   - ensure target user exists and is invite-eligible
   - regenerate token + resend invite email
   - return resend result contract

### Phase 3: Register invited activation

1. Add invited branch in register endpoint for existing email.
2. Enforce `emailVerified` precondition (`403 invite_email_not_verified`).
3. Activate invited account with password + `active` status while preserving role.
4. Keep existing OAuth activation and non-invited conflict semantics unchanged.

### Phase 4: Admin UI sticky toast + resend action

1. Extend admin users API types for create/resend invite contracts.
2. Add resend action in store/composable.
3. In users list invite handler:
   - if `inviteEmailSent=true` → success toast
   - if false → non-auto-close toast (`duration: 0`) with `Resend` action button
4. Add i18n keys for send failure/resend labels and outcomes.

### Phase 5: Validation

1. Type checks for all touched workspaces.
2. Targeted endpoint behavior tests for:
   - verify-email flow redirects
   - invite create/resend result contracts
   - invited register activation constraints
3. Manual smoke:
   - admin invite success/failure + resend UX
   - invite-link redirect to `/resume`
   - invited email/password activation and OAuth activation regression

## Risks and Mitigations

- Risk: privilege escalation via invited email/password activation for high roles.
  - Mitigation: require verified invite email before activation (`403 invite_email_not_verified`), keep admin-only invite creation.

- Risk: redirect inconsistencies or open redirect patterns.
  - Mitigation: strict flow whitelist, fixed internal path mapping only.

- Risk: UX confusion when user creation succeeds but invite send fails.
  - Mitigation: explicit API result + sticky toast with immediate resend action.

- Risk: regression of existing OAuth invited activation.
  - Mitigation: preserve existing OAuth branches and add regression tests/manual smoke scenario.

## Rollout and Rollback

Rollout:

- Deploy as standard backend+admin update (no migrations).
- Verify with manual smoke on admin invite and invited onboarding.

Rollback:

- Revert feature commit(s); no schema rollback needed.
- Existing legacy verification redirect behavior remains available via default flow fallback.

## Done Criteria for Plan Phase

- Clarifications from 2026-02-17 reflected in implementation design.
- API contracts for create/resend/register error are explicit.
- Backward compatibility and no-status-migration constraint preserved.
