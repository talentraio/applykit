# Database and Migrations

Database tooling lives in `@int/api` (Drizzle).

## Key files

- Schema source: `packages/nuxt-layer-api/server/data/schema.ts`
- Migrations: `packages/nuxt-layer-api/server/data/migrations/*`

## Local DB lifecycle

Start/stop/status:

```bash
pnpm db:up
pnpm db:down
pnpm db:status
```

## Migration workflow

### First-time local setup

```bash
pnpm db:up
pnpm --filter @int/api db:migrate
```

### After schema changes (CRITICAL: follow this order)

**⚠️ NEVER create SQL migration files manually!** Always use Drizzle Kit to generate them.

1. **Update schema** in `packages/nuxt-layer-api/server/data/schema.ts`
2. **Generate migration automatically**:

   ```bash
   pnpm --filter @int/api db:generate
   ```

   This creates:
   - New SQL file in `server/data/migrations/`
   - Updates `meta/_journal.json` with correct index
   - Ensures proper sequencing

3. **Review generated SQL** — check the migration file looks correct

4. **Apply migration locally**:

   ```bash
   pnpm --filter @int/api db:migrate
   ```

5. **Commit both files**:
   - `server/data/migrations/XXXX_*.sql`
   - `server/data/migrations/meta/_journal.json`

### Common mistakes (DO NOT DO THIS)

❌ **Creating SQL files manually** → Drizzle won't track them
❌ **Editing `_journal.json` manually** → Will cause index conflicts
❌ **Skipping `db:generate`** → Schema and migrations get out of sync

### Dev-only quick sync (use carefully)

```bash
pnpm --filter @int/api db:push
```

**When to use `db:push`**:

- ✅ Local development experiments
- ✅ Prototyping schema changes
- ✅ When you don't need migration history

**When NOT to use `db:push`**:

- ❌ Shared/staging/production environments
- ❌ When working in a team (others need migrations)
- ❌ Schema changes that need to be tracked

### Troubleshooting

**Problem**: `drizzle-kit generate` shows confusing diffs or enum prompts

**Cause**: Previous migrations were created manually, schema is out of sync

**Solution**:

1. For local dev only: Use `db:push` to force-sync schema
2. For production: Reset migration state (contact team lead)

## Inspect DB

```bash
pnpm --filter @int/api db:studio
```

## Migration quality checklist

- Migration is generated and committed.
- Backward compatibility impact is documented.
- API/schema docs updated if contracts changed.
- Feature tests cover new/changed data behavior.
