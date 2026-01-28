# Admin Roles & Users Management

> **Epic:** 002-admin-roles-users
> **Status:** Draft
> **Last updated:** 2026-01-28

---

## Overview

The admin panel currently exposes only global LLM controls and a shallow users list. We need role-scoped LLM settings and richer user management: a roles section with per-role configuration, a users list that supports filtering/pagination and a user detail page with profile + usage statistics. We also need to support admin-created user invitations with status tracking.

---

## Problem

- LLM controls are global, but access and budget must be configured **per role**.
- The users list is limited to email/role and inline role edits; it lacks filtering, pagination, and a detail view.
- Admins need to invite users by email and assign a role before first login.

---

## Goals

1. **Roles management UI** (`/roles`, `/roles/[role]`) with per-role settings:
   - `platform_llm_enabled`, `byok_enabled`, `platform_provider`, `daily_budget_cap` (per user, per day)
   - Super admin: only provider editable; other controls read-only
   - Super admin daily budget is treated as **unlimited**
2. **User list improvements** (`/users`):
   - Columns: email, role, status, createdAt, updatedAt, lastLoginAt
   - Search by email, filter by role, pagination (10/25/50/100)
   - Default sort: lastLoginAt desc (nulls last)
   - “Add user” modal to invite by email + role
3. **User detail page** (`/users/[id]`):
   - Full user info (createdAt, updatedAt, lastLoginAt, status, deletedAt)
   - Profile fields (firstName, lastName, email, country, searchRegion, workFormat, languages, phones)
   - Usage stats computed on demand (no pre-aggregation table)
   - Status toggle (block/unblock) and delete action with confirmation
4. **Role settings affect runtime LLM logic** (BYOK/platform availability and provider selection)
5. **Blocked users are denied access** (403) on protected endpoints in both apps

---

## Non-goals

- Sending invitation emails (tracked as backlog)
- User self-deletion flow (only data model prep)
- Global LLM controls UI (removed from admin system page)
- Redesigning non-admin UIs

---

## User Flows

### 1) Roles list → role settings

1. Admin opens `/roles`
2. Sees list of roles (from `USER_ROLE_MAP`)
3. Clicks a role to open `/roles/[role]`
4. Updates role settings and saves

### 2) Users list → user detail

1. Admin opens `/users`
2. Searches by email or filters by role
3. Changes page size or navigates pagination
4. Clicks a user row to open `/users/[id]`

### 3) Add user (invite)

1. Admin clicks “Add user”
2. Modal opens; admin enters email + role
3. User is created with status `invited` and placeholder googleId
4. On first login, status becomes `active` and googleId is bound

### 4) Block / unblock user

1. Admin opens `/users/[id]`
2. Toggles “Block user”
3. When blocked: status becomes `blocked` and protected endpoints return 403
4. When unblocked:
   - If `deletedAt` exists → status `deleted`
   - Else if `lastLoginAt` exists → status `active`
   - Else → status `invited`

### 5) Delete user

1. Admin clicks “Delete user”
2. Confirmation modal appears
3. On confirm: user is soft-deleted, status becomes `deleted`, and admin is redirected to `/users`

---

## Data Model Changes

### @int/schema

- **New enum:** `UserStatus` (invited, active, blocked, deleted)
- **User schema updates:**
  - `status: UserStatus`
  - `lastLoginAt: Date | null`
  - `deletedAt: Date | null`
- **New role settings schema:**
  - `role: Role`
  - `platformLlmEnabled: boolean`
  - `byokEnabled: boolean`
  - `platformProvider: PlatformProvider`
  - `dailyBudgetCap: number`
  - `updatedAt: Date`

### Database (Drizzle + migrations)

- `users` table: add `status`, `last_login_at`, `deleted_at`
- New table `role_settings` keyed by role
- Migration includes backfill:
  - `status` default `active`
  - `last_login_at` set to `updated_at` for existing users

---

## API Endpoints

### New / updated

- `GET /api/admin/roles`
  - Returns all roles with effective settings
- `GET /api/admin/roles/:role`
  - Returns role settings (defaults if none stored)
- `PUT /api/admin/roles/:role`
  - Updates role settings
  - Super admin: only `platformProvider` is accepted

- `POST /api/admin/users`
  - Body: `{ email, role }`
  - Creates invited user
  - Returns created user summary

- `GET /api/admin/users`
  - Adds query params: `role`, `limit`, `offset`
  - Returns: `email, role, createdAt, updatedAt, lastLoginAt, status`
  - Sort: `lastLoginAt` desc (nulls last)

- `GET /api/admin/users/:id`
  - Adds fields: `updatedAt`, `lastLoginAt`, `status`, `deletedAt`
  - Adds computed usage stats (see below)
- `PUT /api/admin/users/:id/status`
  - Body: `{ blocked: boolean }`
  - Updates status using the block/unblock logic
- `DELETE /api/admin/users/:id`
  - Soft delete (sets `deletedAt` + `status`)

### Usage stats computed at runtime

From `usage_logs`:

- Total generations (all time)
- Avg generations/day (last 30 days)
- Avg generations/day (last 7 days)
- Avg generations/week (last 30 days)
- Cost last 30 days
- Cost month-to-date

---

## LLM Runtime Behavior

- Role settings replace global LLM controls:
  - BYOK check uses `role_settings.byokEnabled`
  - Platform access uses `role_settings.platformLlmEnabled`
  - Provider selection uses `role_settings.platformProvider`
  - Daily budget cap per user uses `role_settings.dailyBudgetCap`
- Global budget cap (`system_configs.global_budget_cap`) still enforced for all roles
- Super admin daily budget is unlimited (daily cap is ignored)

---

## i18n Keys

Add keys in `packages/nuxt-layer-ui/i18n/locales/en.json`:

- `admin.nav.roles`
- `admin.roles.title`
- `admin.roles.list.description`
- `admin.roles.columns.*`
- `admin.roles.form.*`
- `admin.roles.providers.*`
- `admin.roles.status.*`
- `admin.users.columns.updatedAt`
- `admin.users.columns.lastLoginAt`
- `admin.users.filters.role`
- `admin.users.filters.allRoles`
- `admin.users.pagination.*`
- `admin.users.add.*`
- `admin.users.detail.*`
- `admin.users.status.*`

(Exact key list to be finalized during implementation.)

---

## Security & Privacy

- All new admin endpoints require `super_admin` role
- No exposure of `googleId`
- Usage stats are derived from logs; no PII beyond user email and profile fields
- Users with status `blocked` are rejected with 403 on protected endpoints

---

## Acceptance Criteria

1. `/roles` shows all roles from `USER_ROLE_MAP`, clicking opens `/roles/[role]`
2. Role settings persist and affect LLM behavior immediately
3. `/users` supports search, role filter, pagination, and shows all required columns (including status)
4. Clicking a user opens `/users/[id]` with profile data + computed usage stats
5. Admin can invite a user via modal and set role; status becomes `invited`
6. On first login, invited user becomes `active` and retains assigned role
7. Admin can block/unblock users and statuses update per rules
8. Admin can delete users via confirmation and returns to `/users`
9. System page no longer shows global LLM controls
10. Admin dashboard summary no longer shows platform/byok/provider card (budget + usage remain)

---

## Test Plan

- Unit:
  - Role settings repository (defaults + updates)
  - Usage stats computation utilities
- Integration:
  - Admin roles endpoints (GET/PUT)
  - Admin users endpoints (GET list, GET detail, POST invite)
  - LLM access checks using role settings + budget
- E2E (minimal):
  - Admin roles list → edit settings
  - Admin users list → detail + invite user flow

---

## Rollout Notes

- DB migration required (users + role_settings)
- Backfill `last_login_at` from `updated_at`
- No feature flags (admin-only)

---

## Implementation Notes / Repo Touchpoints

- **Schema package**: `packages/schema/` (package: `@int/schema`)
  - `constants/enums.ts`
  - `schemas/user.ts`
  - `schemas/role-settings.ts` (new)
  - `index.ts` barrel exports

- **API layer**: `packages/nuxt-layer-api/` (package: `@int/api`)
  - `server/data/schema.ts`
  - `server/data/migrations/002_admin_roles_users.sql`
  - `server/plugins/db-init.ts`
  - `server/data/repositories/role-settings.ts` (new)
  - `server/data/repositories/user.ts`
  - `server/utils/usage.ts` (stats helpers)
  - `server/services/llm/index.ts` (role-based checks)
  - `server/routes/auth/google.ts` (invite activation)
  - `server/api/admin/roles/*.ts` (new)
  - `server/api/admin/users/index.get.ts` (filters + fields)
  - `server/api/admin/users/index.post.ts` (invite)
  - `server/api/admin/users/[id].get.ts` (expanded detail)
  - `server/api/admin/users/[id].delete.ts` (soft delete)
  - `server/api/admin/users/[id]/status.put.ts` (block/unblock)

- **Admin app**: `apps/admin/`
  - `nuxt.config.ts` (add roles layer)
  - `app/layouts/default.vue` (nav link)
  - `layers/roles/` (new): pages + components
  - `layers/users/app/pages/users.vue` (list updates)
  - `layers/users/app/pages/users/[id].vue` (new)
  - `layers/users/app/components/` (filters, modal, stats components)
  - `app/pages/system.vue` (remove LLM controls)

---

## Open Questions / Assumptions

- **Super admin LLM behavior**: platform + BYOK always enabled; provider configurable; daily budget cap ignored.
- **Invite collisions**: assume inviting an email that already exists returns 409; no auto-merge.
- **Stats formula**: averages computed as total/periodDays (30 or 7) and total/4 for weekly average over 30 days.
- **Global budget**: still enforced for all roles.

---

## Backlog

- Send invitation email on admin-created user
