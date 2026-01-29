# Monorepo layout (pnpm workspaces)

## Apps

- `apps/site` – user-facing product
- `apps/admin` – minimal admin UI (roles, limits, allowlists), separate login

## Internal workspace packages (layers)

We use a dedicated internal scope to make it obvious these are not public packages.
Example: `@int/api`, `@int/ui`, `@int/schema`.

Each layer package is a Nuxt layer with:

- `app/` and `server/` (Nuxt conventions)
- `nuxt.config.ts` as entrypoint (`"main": "./nuxt.config.ts"` in package.json)
- `.playground/` for isolated testing (buttons, simple pages, manual QA)

### Recommended packages for MVP

- `packages/schema` (`@int/schema`)
  - Zod schemas + inferred TS types
  - Central place for enums, shared DTO shapes, and validation helpers
- `packages/layer-api` (`@int/api`)
  - REST endpoints (server/)
  - Server utilities (server/utils)
  - LLM adapter + parsing/generation services
  - Shared client composables (app/composables) and shared server-aware fetch client (app/plugins/apiFetch.ts)
- `packages/layer-ui` (`@int/ui`)
  - Nuxt UI setup + shared tokens/styles (theme variables, SCSS mixins)
  - Base components
  - Minimal design system that both apps reuse

### Site-specific internal layers

Located in `apps/site/layers/`:

- `_base` – shared utilities, composables, middleware for the site
- `auth` – login/logout pages, auth guards
- `profile` – user profile management
- `resume` – resume upload, parsing, editing
- `landing` – marketing landing page
- `vacancy` – vacancy CRUD, generation, export
- `static` – static content pages (Privacy Policy, Terms of Service)

### Admin-specific internal layers

Located in `apps/admin/layers/`:

- `_base` – shared utilities for admin
- `auth` – admin login
- `users` – user search and role management
- `system` – system controls, budget display

## How apps consume layers

In `apps/site/nuxt.config.ts`:

- add to dependencies in package.json: `@int/api`, `@int/ui`, `@int/schema`
- then:
  - `extends: ['@int/ui', '@int/api']`
  - `alias` + `components` prefixes per layer to avoid naming collisions

Same for `apps/admin`.

## Brands (post-MVP)

We can add `/brands/<brand-name>` as another abstraction level:

- each brand extends `apps/site`
- can override theme and content
- MVP: keep only one brand
