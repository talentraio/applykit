# Daily Workflow

## Branching

- Create a dedicated branch for each task.
- Keep commits focused and reviewable.
- Follow conventional commit messages.

## Typical feature flow

1. Align scope and acceptance criteria.
2. Create or update spec artifacts in `specs/<feature-id>/`.
3. Implement in small vertical slices.
4. Run checks (`typecheck`, `lint`, relevant tests).
5. Commit with clear message.

## Monorepo conventions

- `apps/site` – candidate-facing UI
- `apps/admin` – admin panel
- `packages/nuxt-layer-api` – shared API/backend layer
- `packages/nuxt-layer-ui` – shared UI/theming
- `packages/schema` – shared contracts/constants

## Common commands

```bash
pnpm dev:site
pnpm dev:admin
pnpm typecheck
pnpm lint
pnpm test
pnpm e2e
```

## Working with roles and admin behavior

Set role for local testing:

```bash
pnpm --filter @int/api db:set-role -- --email you@example.com --role super_admin
```

Roles: `super_admin`, `friend`, `promo`, `public`.

After role change, log out/in to refresh session role.
