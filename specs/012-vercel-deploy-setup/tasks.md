# Tasks: 012 — Vercel Deploy Setup

**Input**: Design documents from `/specs/012-vercel-deploy-setup/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, quickstart.md
**Documentation Gate**: Infrastructure-only feature — no application code changes. Follow plan.md and research.md for exact file contents.

**Tests**: Not requested in spec. Manual validation via dry-run deploys per testing plan.

**Organization**: Tasks are grouped by deployment flow (Production, Preview) since this is infrastructure-only. Each flow is independently testable once repo config is complete.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user flow this task belongs to (US1 = Production Deploy, US2 = Preview Deploy)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Repository Configuration)

**Purpose**: Prepare the repository for Vercel CLI deploys — config files, ignore lists, dependency installation.

- [x] T001 [P] Create Vercel config for site app with Fluid Compute and crons in `apps/site/vercel.json`
- [x] T002 [P] Create Vercel config for admin app with Fluid Compute in `apps/admin/vercel.json`
- [x] T003 Create `.vercelignore` at repo root to exclude non-essential files from Vercel uploads
- [x] T004 Install Vercel CLI as pinned workspace dev dependency via `pnpm add -D vercel -w`

---

## Phase 2: Production Deploy Flow (Priority: P1)

**Goal**: On push to `main`, run DB migrations then build+deploy both apps to Vercel production.

**Independent Test**: Merge a test PR to `main` → verify migrations run → verify both apps deploy to production URLs → verify no Vercel git-triggered deploys.

### Implementation for Production Deploy

- [x] T005 [US1] Create `.github/workflows/` directory if it doesn't exist
- [x] T006 [US1] Create production deploy workflow in `.github/workflows/production.yml` with: checkout, pnpm+Node.js setup with caching, `pnpm install --frozen-lockfile`, DB migration step (`pnpm --filter @int/api db:migrate` with `PROD_DATABASE_URL`), per-app `vercel pull` → `vercel build --prod` → `vercel deploy --prebuilt --prod` for site and admin, concurrency group `production-deploy` with `cancel-in-progress: false`

**Checkpoint**: Production workflow file is complete. Can be validated with `actionlint` before merging.

---

## Phase 3: Preview Deploy Flow (Priority: P2)

**Goal**: On PR against `main`, run preview DB migrations then build+deploy both apps as Vercel previews, post sticky PR comment with URLs.

**Independent Test**: Open a test PR → verify both preview deployments are created → verify sticky comment with URLs appears on PR → push another commit → verify comment is updated (not duplicated).

### Implementation for Preview Deploy

- [x] T007 [US2] Create preview deploy workflow in `.github/workflows/preview.yml` with: `pull_request` trigger (opened, synchronize, reopened) targeting `main`, checkout, pnpm+Node.js setup with caching, `pnpm install --frozen-lockfile`, preview DB migration step (`pnpm --filter @int/api db:migrate` with `PREVIEW_DATABASE_URL`), per-app `vercel pull --environment=preview` → `vercel build` (no `--prod`) → `vercel deploy --prebuilt` (no `--prod`) for site and admin, sticky PR comment via `marocchino/sticky-pull-request-comment@v2` with `header: vercel-preview` showing both app URLs and commit SHA

**Checkpoint**: Preview workflow file is complete. Can be validated with `actionlint` before merging.

---

## Phase 4: Documentation & Cleanup

**Purpose**: Ensure env var documentation is complete and repo hygiene is maintained.

- [x] T008 [P] Verify `.env.example` files include all Vercel-relevant env vars documented in spec — check `apps/site/.env.example`, `apps/admin/.env.example`, and `packages/nuxt-layer-api/.env.example` (package: `@int/api`)
- [x] T009 [P] Validate both workflow YAML files with `actionlint` (install via `brew install actionlint` or npx)
- [x] T010 Run quickstart.md validation — walk through the one-time setup steps in `specs/012-vercel-deploy-setup/quickstart.md` and confirm they match the implemented workflow files

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Production Deploy (Phase 2)**: Depends on Phase 1 (T001-T004) for vercel.json configs and CLI availability
- **Preview Deploy (Phase 3)**: Depends on Phase 1 (T001-T004); can run in parallel with Phase 2 (different workflow file)
- **Documentation (Phase 4)**: Depends on Phase 2 and Phase 3 completion

### Task Dependencies

- **T001, T002**: Independent, parallel (different files)
- **T003**: Independent of T001/T002
- **T004**: Independent of T001-T003 (but should be done in Phase 1)
- **T005**: Creates directory for T006 and T007
- **T006**: Depends on T004 (Vercel CLI), T001/T002 (vercel.json), T005 (directory)
- **T007**: Depends on T004 (Vercel CLI), T001/T002 (vercel.json), T005 (directory); independent of T006
- **T008, T009**: Independent of each other, can run in parallel
- **T010**: Final validation — depends on everything

### Parallel Opportunities

- T001 + T002 can run in parallel (different app directories)
- T006 + T007 can run in parallel (different workflow files, both depend on Phase 1)
- T008 + T009 can run in parallel (different concerns)

---

## Parallel Example: Phase 1

```bash
# Launch config files in parallel:
Task: "Create Vercel config for site app in apps/site/vercel.json"
Task: "Create Vercel config for admin app in apps/admin/vercel.json"
```

## Parallel Example: Phase 2 + 3

```bash
# After Phase 1 is complete, both workflows can be created in parallel:
Task: "Create production workflow in .github/workflows/production.yml"
Task: "Create preview workflow in .github/workflows/preview.yml"
```

---

## Implementation Strategy

### MVP First (Production Deploy Only)

1. Complete Phase 1: Setup (T001-T004)
2. Complete Phase 2: Production Deploy (T005-T006)
3. **STOP and VALIDATE**: Merge to main, verify migrations + deploy work
4. Then add Phase 3: Preview Deploy (T007)

### Full Delivery

1. Complete Phase 1: Setup → Repo ready for Vercel CLI
2. Complete Phase 2 + Phase 3 in parallel → Both workflows ready
3. Complete Phase 4: Documentation → Validate everything
4. **Manual testing**: Follow testing plan in spec.md (workflow syntax, dry-run preview, dry-run production, migration failure test, rollback test, env var verification)

### Pre-merge Checklist (from spec acceptance criteria)

1. PR creates preview deploys with sticky comment ✓ (T007)
2. Main deploys to production after migrations ✓ (T006)
3. Migration failure blocks deploy ✓ (built into workflow)
4. No Vercel git-triggered deploys ✓ (manual project creation, no import)
5. Separate databases for preview/production ✓ (separate GitHub secrets)
6. No secrets in code ✓ (all via GitHub secrets + Vercel env vars)
7. Rollback works ✓ (Vercel Dashboard instant rollback)
8. Documentation complete ✓ (quickstart.md + T008)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label: US1 = Production Deploy flow, US2 = Preview Deploy flow
- All file contents (YAML, JSON) are specified in `plan.md` — use those as source of truth
- GitHub secrets and Vercel env vars are manual one-time setup (documented in `quickstart.md`)
- No application code changes in this feature
- Commit after each task or logical group
- Stop at any checkpoint to validate independently
