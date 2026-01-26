# Development Guide

Short, practical notes for local development workflows.

## Database utilities

### Set user role (local SQLite)

Use the `db:set-role` script to change a user's role in the local SQLite database.

```
pnpm --filter @int/api db:set-role -- --email you@example.com --role super_admin
```

Alternate positional form:

```
pnpm --filter @int/api db:set-role -- you@example.com super_admin
```

If you need a custom database path:

```
pnpm --filter @int/api db:set-role -- --email you@example.com --role friend --db packages/nuxt-layer-api/.data/local.db
```

Roles: `super_admin`, `friend`, `public`.

Note: after changing a role, re-login so the session picks up the new role.
