# Tasks: 013 — Admin Invite Email Flow and Invited Password Activation

**Input**: Design documents from `/Users/kolobok/WebstormProjects/_My/resume-editor/specs/013-admin-invite-email-flow/`
**Prerequisites**: `spec.md` (required), `plan.md` (required)

**Tests**: Required. Cover flow redirects, admin invite create/resend contract, invited email/password activation, and admin sticky toast resend action.

**Organization**: Tasks are grouped by user story so each story can be implemented and validated independently.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no hard dependency)
- **[Story]**: `US1` / `US2` / `US3` / `US4`
- Include exact file paths in each task

---

## Phase 1: US1 — Flow-aware verification redirect (Priority: P1)

**Goal**: Verification endpoint and email links support `flow=verification|invite` and redirect accordingly.

**Independent Test**: Verify token click with `flow=verification` redirects to `/profile...`; with `flow=invite` redirects to `/resume...`; unknown/missing flow falls back to verification behavior.

- [x] T001 [US1] Extend verification email service to accept flow discriminator (default `verification`) and include it in verify URL query in `/Users/kolobok/WebstormProjects/_My/resume-editor/packages/nuxt-layer-api/server/services/email/index.ts`
- [x] T002 [US1] Implement flow whitelist parsing (`verification` | `invite`) and redirect matrix for success and token errors in `/Users/kolobok/WebstormProjects/_My/resume-editor/packages/nuxt-layer-api/server/api/auth/verify-email.get.ts`
- [x] T003 [US1] Keep backward compatibility for existing verification callers (`send-verification`, normal register) by preserving default verification flow behavior in `/Users/kolobok/WebstormProjects/_My/resume-editor/packages/nuxt-layer-api/server/services/email/index.ts`
- [x] T004 [US1] Add/extend tests for verify-email flow redirects (success + missing/invalid/expired token per flow) under `/Users/kolobok/WebstormProjects/_My/resume-editor/packages/nuxt-layer-api/tests/`

---

## Phase 2: US2 — Admin invite resilient send + resend endpoint (Priority: P1)

**Goal**: User creation is not blocked by email delivery failure; invite send result is explicit; resend endpoint is available.

**Independent Test**: `POST /api/admin/users` returns `201` with created user and `inviteEmailSent=false` when send fails; `POST /api/admin/users/:id/invite` retries and returns send result.

- [x] T005 [US2] Update admin invite create handler to generate/store verification token, attempt invite send with `flow=invite`, and return contract fields `inviteEmailSent` + optional `inviteEmailError` in `/Users/kolobok/WebstormProjects/_My/resume-editor/packages/nuxt-layer-api/server/api/admin/users/index.post.ts`
- [x] T006 [US2] Add new super-admin resend endpoint with contract `inviteEmailSent` + optional `inviteEmailError` in `/Users/kolobok/WebstormProjects/_My/resume-editor/packages/nuxt-layer-api/server/api/admin/users/[id]/invite.post.ts`
- [x] T007 [US2] Reuse repository token helpers and ensure resend/create pathways use consistent token lifecycle via `/Users/kolobok/WebstormProjects/_My/resume-editor/packages/nuxt-layer-api/server/data/repositories/user.ts`
- [x] T008 [US2] Update API endpoint documentation for new/updated admin invite contracts in `/Users/kolobok/WebstormProjects/_My/resume-editor/docs/api/endpoints.md`
- [x] T009 [US2] Add/extend API tests for admin invite create/resend result contracts and super-admin guard behavior under `/Users/kolobok/WebstormProjects/_My/resume-editor/packages/nuxt-layer-api/tests/`

---

## Phase 3: US3 — Invited activation via email/password (additional to OAuth) (Priority: P1)

**Goal**: Invited users can activate with email/password after invite email verification, while OAuth activation remains unchanged.

**Independent Test**: Invited+verified user registers successfully (status active, role preserved); invited+unverified gets `403 invite_email_not_verified`; non-invited existing email still conflicts; OAuth invited activation still works.

- [x] T010 [US3] Add repository helper for invited password activation (`passwordHash` + `status=active` + timestamps, role preserved) in `/Users/kolobok/WebstormProjects/_My/resume-editor/packages/nuxt-layer-api/server/data/repositories/user.ts`
- [x] T011 [US3] Add invited-activation branch in register endpoint for existing invited email with `403 invite_email_not_verified` precondition in `/Users/kolobok/WebstormProjects/_My/resume-editor/packages/nuxt-layer-api/server/api/auth/register.post.ts`
- [x] T012 [US3] Ensure invited activation path creates/updates profile and seeds format settings consistently in `/Users/kolobok/WebstormProjects/_My/resume-editor/packages/nuxt-layer-api/server/api/auth/register.post.ts`
- [x] T013 [US3] Keep existing OAuth invited activation code path intact and add regression assertions for it in `/Users/kolobok/WebstormProjects/_My/resume-editor/packages/nuxt-layer-api/server/routes/auth/google.ts` and `/Users/kolobok/WebstormProjects/_My/resume-editor/packages/nuxt-layer-api/server/routes/auth/linkedin.ts`
- [x] T014 [US3] Add/extend tests for invited register activation matrix (verified, unverified, non-invited existing, blocked/deleted) under `/Users/kolobok/WebstormProjects/_My/resume-editor/packages/nuxt-layer-api/tests/`

---

## Phase 4: US4 — Admin sticky toast + resend action (Priority: P2)

**Goal**: On invite send failure, admin gets persistent toast with one-click resend action.

**Independent Test**: Failed invite create shows non-auto-close toast with `Resend`; clicking `Resend` calls resend endpoint and shows success/failure feedback.

- [x] T015 [US4] Extend admin users infrastructure types and methods for invite create response fields and resend endpoint client in `/Users/kolobok/WebstormProjects/_My/resume-editor/apps/admin/layers/users/app/infrastructure/admin-users.api.ts`
- [x] T016 [US4] Add resend invite action wiring in store/composable in `/Users/kolobok/WebstormProjects/_My/resume-editor/apps/admin/layers/users/app/stores/admin-users.ts` and `/Users/kolobok/WebstormProjects/_My/resume-editor/apps/admin/layers/users/app/composables/useAdminUsers.ts`
- [x] T017 [US4] Update invite handler to show sticky toast (`duration: 0`) with `Resend` action when `inviteEmailSent=false` in `/Users/kolobok/WebstormProjects/_My/resume-editor/apps/admin/layers/users/app/pages/users/index.vue`
- [x] T018 [US4] Implement resend action handler (loading guard, API call, toast feedback) in `/Users/kolobok/WebstormProjects/_My/resume-editor/apps/admin/layers/users/app/pages/users/index.vue`
- [x] T019 [US4] Add i18n keys for invite send failed, resend action label, resend success/failure in `/Users/kolobok/WebstormProjects/_My/resume-editor/apps/admin/i18n/locales/en.json`

---

## Phase 5: Validation and Completion

**Purpose**: Verify contracts, behavior, and regressions before merge.

- [x] T020 [P] Run `pnpm typecheck` and fix/report issues
- [x] T021 [P] Run `pnpm lint` and fix/report issues
- [x] T022 Run targeted tests for touched auth/admin invite flows (including new tests in `packages/nuxt-layer-api/tests/`)
- [x] T023 Run manual smoke:
  - admin invite success/failure + sticky toast resend
  - verify-email redirect for both flows
  - invited email/password activation
  - invited OAuth activation regression
- [x] T024 Update task checkboxes in this file to reflect real completion state

---

## Dependencies and Execution Order

### Phase Dependencies

- Phase 1 (US1) has no prerequisites and should be done first (shared flow behavior).
- Phase 2 (US2) depends on Phase 1 flow support in email/verify path.
- Phase 3 (US3) can start after Phase 1; independent of admin UI changes.
- Phase 4 (US4) depends on Phase 2 API contract/resend endpoint.
- Phase 5 runs after implementation phases are complete.

### Task Dependencies

- T002 depends on T001.
- T005 depends on T001 and T002.
- T006 depends on T001 (flow-aware invite send usage).
- T015-T018 depend on T005 and T006.
- T011 depends on T010.
- T012 depends on T011.
- T014 depends on T011-T013.
- T022 depends on T004, T009, T014 completion.

### Parallel Opportunities

- T004 [P] can run in parallel with T008 after core flow behavior is coded.
- T009 [P] and T014 [P] can run in parallel once their respective backend changes are ready.
- T019 [P] can run in parallel with T015-T018.
- T020 [P] and T021 [P] can run in parallel in Phase 5.

---

## Implementation Strategy

### MVP-first sequence

1. Complete US1 (T001-T004).
2. Complete backend US2 (T005-T009).
3. Complete backend US3 (T010-T014).
4. Complete admin UI US4 (T015-T019).
5. Run validation (T020-T024).

### Merge readiness checklist

- [ ] Flow-aware redirect works (`verification` → `/profile`, `invite` → `/resume`).
- [ ] Invite create/resend contracts return `inviteEmailSent` and optional error.
- [ ] Invited register activation works and requires verified email.
- [ ] OAuth invited activation remains unchanged.
- [ ] Sticky toast resend UX works in admin list page.
- [ ] Typecheck/lint/tests/smoke pass and are documented.
