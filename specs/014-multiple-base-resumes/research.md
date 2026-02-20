# Research: Multiple Base Resumes

## R1: Drizzle ORM migration strategy for multi-step schema changes

**Decision**: Use a single drizzle-kit generated migration with manual data-migration SQL appended.

**Rationale**: The migration involves:
1. Adding `default_resume_id` FK to `users`
2. Adding `name` column to `resumes`
3. Creating `resume_format_settings` table
4. Copying data from `user_format_settings` to `resume_format_settings`
5. Dropping `user_format_settings` table

Steps 1-3 and 5 are schema changes (drizzle-kit can generate). Step 4 is a data migration that must be hand-written SQL. The recommended approach:
- Modify `schema.ts` with all structural changes
- Run `pnpm --filter @int/api db:generate` to produce the SQL
- Manually add data migration SQL to the generated file before applying
- Run `pnpm --filter @int/api db:migrate` to apply

**Alternatives considered**:
- Two separate migrations (schema first, data second): Rejected because drizzle-kit generates one migration per `db:generate` run, and the data migration must happen between schema additions and table drop.
- Application-level migration script: Rejected because SQL-based migration is simpler and runs atomically in a transaction.

## R2: `ON DELETE SET NULL` for `users.default_resume_id` FK

**Decision**: Use `ON DELETE SET NULL` for the `default_resume_id` FK reference to `resumes.id`.

**Rationale**: When a resume is deleted (even if it's the default — which should be blocked by the API, but DB should be safe), the user's `default_resume_id` becomes `null`. The API layer handles null by falling back to the most recent resume. This is safer than `ON DELETE CASCADE` (which would delete the user) or `ON DELETE RESTRICT` (which would prevent resume deletion at DB level).

**Alternatives considered**:
- `ON DELETE RESTRICT`: Would require the application to always clear the default before deleting. More fragile if API enforcement fails.
- No FK constraint: Loses referential integrity. The stale ID problem becomes harder to detect.

## R3: Circular FK reference between `users` and `resumes`

**Decision**: The `users.default_resume_id → resumes.id` FK creates a circular reference with `resumes.user_id → users.id`. This is acceptable.

**Rationale**: In Drizzle ORM, circular references require special handling. Since `resumes` already references `users`, adding `users.default_resume_id` referencing `resumes` creates a cycle. Drizzle handles this via deferred `references(() => resumes.id)` syntax. The migration SQL uses standard FK constraints. PostgreSQL handles circular FKs natively.

**Alternatives considered**:
- Separate `user_preferences` table with `default_resume_id`: Over-engineering for a single field.
- Boolean `is_default` on `resumes` table: Rejected by spec (collision risk when multiple rows could have `true`).

## R4: Format settings per-resume vs. per-user

**Decision**: Migrate to per-resume format settings. Drop `user_format_settings` table entirely (clean cut, no deprecation period).

**Rationale**: The spec explicitly requires each resume to have its own settings. Since this is an internal product with no external API consumers, a clean cut is preferred over maintaining dual systems. Data migration copies existing user settings to each of their resume's new `resume_format_settings` row.

**Alternatives considered**:
- Keep both tables with deprecation headers: Rejected — adds complexity, dual code paths, no external consumers to migrate.
- Format settings as JSONB column on `resumes` table: Rejected — settings schema is complex (ats + human sub-objects) and having a separate table allows independent queries and cleaner repository code.

## R5: Resume store refactoring for multi-resume

**Decision**: Refactor `_upsertCachedResume` to maintain a proper multi-resume cache. Add `activeResumeId` state field. Keep cache capacity at 20.

**Rationale**: The current store's `cachedResumes` array is designed for multi-element caching (max 20) but `_upsertCachedResume` always replaces with a single entry. The fix is straightforward: use proper upsert logic (find-and-replace or append). The `activeResumeId` becomes the selector for which resume is "current" in the UI, replacing the hardcoded `cachedResumesList[0]` pattern.

**Alternatives considered**:
- Separate store per resume: Over-engineering; the existing array-based cache is sufficient for 10 max resumes.
- No caching (always fetch): Poor UX — switching between resumes would always hit the server.

## R6: Nuxt dynamic route `/resume/[id]`

**Decision**: Create `apps/site/layers/resume/app/pages/resume/[id].vue` as the primary resume editing page. Modify `resume.vue` to redirect when resumes exist.

**Rationale**: Nuxt 4 file-based routing supports `pages/resume/[id].vue` for dynamic segments. The existing `resume.vue` becomes a gateway: if no resumes exist, show upload; if resumes exist, redirect to `/resume/[defaultResumeId]`. The `[id].vue` page loads the specific resume by ID.

**Alternatives considered**:
- Keep single `resume.vue` with query param `?id=xxx`: Against Nuxt conventions; dynamic routes are the standard pattern.
- Middleware-only redirect: Still need a page component for the no-resume case.

## R7: Vacancy generation resume picker UI pattern

**Decision**: Use `UDropdownMenu` attached to the Generate/Regenerate button when user has >1 resume. Single-resume users see no change.

**Rationale**: The `UDropdownMenu` from NuxtUI v4 provides a native dropdown attached to a trigger button. When >1 resume exists, the button becomes a dropdown trigger instead of a direct action. The default resume appears first in the list. On selection, generation proceeds immediately with the selected `resumeId`.

**Alternatives considered**:
- Modal with resume selection: Too heavy for a simple pick-one-and-go action.
- Split button (click = default, dropdown arrow = choose): More complex UI; NuxtUI v4's `UButtonGroup` could support this but adds implementation complexity for MVP.

## R8: `isDefault` computation strategy

**Decision**: Compute `isDefault` at the API response layer by comparing `resume.id === user.defaultResumeId`. Never store it in the DB.

**Rationale**: Storing a boolean `isDefault` per resume row creates a multi-row consistency problem (must ensure exactly one `true` per user). The FK-based approach (`users.default_resume_id`) is atomic — a single UPDATE on the users table switches the default. The API computes `isDefault` on the fly when serializing resume responses.

**Alternatives considered**:
- Stored boolean with DB trigger: Complex, hard to test, PostgreSQL-specific.
- Application-level transaction (clear all, set one): Race condition risk in concurrent requests.

## R9: Resume name default generation

**Decision**: Use `format(createdAt, 'dd.MM.yyyy')` from `date-fns` for first resume. Use `copy <sourceName>` prefix for duplicates.

**Rationale**: Aligns with spec requirements and project convention of using `date-fns` for date formatting. The `copy` prefix is simple and predictable. Users can rename in Settings at any time.

**Alternatives considered**:
- Include time in default name: Unnecessary precision for a resume name.
- Auto-incrementing "Resume 1", "Resume 2": Less informative than date-based naming.
