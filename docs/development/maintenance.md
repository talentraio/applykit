# Maintenance Checklist

## Operational hygiene

- Keep dependencies updated intentionally.
- Keep migrations linear and committed.
- Keep docs synchronized with behavior changes.
- Keep feature flags/config defaults explicit in `runtimeConfig`.

## LLM/Routing maintenance

- Validate scenario defaults in admin routing.
- Validate role overrides for critical roles (`public`, `friend`, `super_admin`).
- Ensure fallback model in runtime config remains valid and priced.
- Review token/cost behavior after major prompt updates.

## Release readiness (minimal)

Before release candidate:

1. `pnpm typecheck`
2. `pnpm lint`
3. `pnpm test`
4. targeted `pnpm e2e` for critical user journeys
5. verify migrations apply cleanly from empty local DB

## Documentation maintenance

Update docs whenever these change:

- API endpoints or payload shapes
- LLM scenario behavior/routing
- environment variables/runtime configuration
- local development commands
