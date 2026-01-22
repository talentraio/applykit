# Architecture

This folder documents product + system architecture decisions for ApplyKit.

**Goal:** keep decisions explicit, reviewable, and easy to follow for both humans and code-agents.

## Stack and invariants (MVP)

- **Nuxt v4** + **NuxtUI v4**
- Monorepo: **pnpm workspaces** (no Turborepo/Nx for MVP)
- Shared pieces are split into internal workspace packages as **Nuxt layers**
    - **Path convention:** `packages/nuxt-layer-*/`
    - **Package name convention:** `@int/*`
    - Example: `packages/nuxt-layer-api/` → `@int/api`
- Layers may include `.playground/` when it helps validate behavior in isolation
- i18n is integrated from the start (to avoid painful refactors later)

## How to read (recommended order)

1. **Monorepo layout & internal layers/packages** → `monorepo.md`
2. **End-to-end data flow** (auth → resume → vacancy → generation → export) → `data-flow.md`
3. **Security & privacy model** (BYOK, roles, rate limits, caching) → `security-privacy.md`
4. **Homepage structure (marketing-first)** → `homepage.md`

## Where new decisions go

- Monorepo / layers / runtime boundaries → `monorepo.md`
- User flows, state ownership, caching, rate limits → `data-flow.md`
- API keys, cookies/headers, roles, abuse prevention, data retention → `security-privacy.md`
- Landing / UX composition / sections / copy → `homepage.md`

## MCP documentation rule (important)

When implementation requires Nuxt/NuxtUI specifics, we rely on MCP documentation servers.
If an MCP server is unavailable at the moment it’s needed, **stop coding and ask for MCP fix** (do not guess).
