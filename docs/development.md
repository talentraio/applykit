# Development Guide

Short, practical notes for local development workflows.

## Database utilities

### Local PostgreSQL (Docker)

Start/stop the local PostgreSQL container:

```
pnpm db:up
pnpm db:down
pnpm db:status
```

The `db:up` script will:

- Check that Docker is installed
- Attempt to start Docker if it isn't running
- Wait until PostgreSQL is ready to accept connections

### Migrations workflow (Drizzle)

#### First-time setup

```
pnpm db:up
pnpm --filter @int/api db:migrate
```

#### After schema changes

```
pnpm --filter @int/api db:generate
pnpm --filter @int/api db:migrate
```

Use `db:generate` after updating `packages/nuxt-layer-api/server/data/schema.ts`
to create a new migration, then `db:migrate` to apply it to your local database.

### Set user role (local PostgreSQL)

Use the `db:set-role` script to change a user's role in the local PostgreSQL database.
Make sure the database is running (`pnpm db:up` or your local Postgres service).

```
pnpm --filter @int/api db:set-role -- --email you@example.com --role super_admin
```

Alternate positional form:

```
pnpm --filter @int/api db:set-role -- you@example.com super_admin
```

Roles: `super_admin`, `friend`, `public`.

Note: after changing a role, re-login so the session picks up the new role.
