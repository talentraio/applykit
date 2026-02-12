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

### After schema changes

1. Update schema in `schema.ts`.
2. Generate migration:

```bash
pnpm --filter @int/api db:generate
```

3. Apply migration locally:

```bash
pnpm --filter @int/api db:migrate
```

### Dev-only sync (use carefully)

```bash
pnpm --filter @int/api db:push
```

Use `db:push` only for local synchronization. For shared environments, commit proper migration files.

## Inspect DB

```bash
pnpm --filter @int/api db:studio
```

## Migration quality checklist

- Migration is generated and committed.
- Backward compatibility impact is documented.
- API/schema docs updated if contracts changed.
- Feature tests cover new/changed data behavior.
