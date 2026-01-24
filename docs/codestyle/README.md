# Code Style

This folder defines code style rules and “how we write code” conventions for ApplyKit.

**Design goal:** keep the default context small (`base.md`), and load deeper rules only when needed
(Pinia/API fetching/i18n/etc), so code-agents don’t get overloaded.

## Repo terminology

- “Layer package” means an internal workspace package that is also a Nuxt layer:
  - **Path convention:** `packages/nuxt-layer-*/`
  - **Package name convention:** `@int/*`
  - Example: `packages/nuxt-layer-api/` → `@int/api`

## How to use these docs

- **Default for most tasks:** read and follow `base.md`
- **Add extra docs only when the task touches that area:**
  - API client & request conventions → `api-fetching.md`
  - Pinia stores & data ownership → `pinia.md`
  - i18n usage & message keys → `i18n.md`
  - Nuxt conventions & directory structure rules → `nuxt-conventions.md`
  - TypeScript rules & patterns → `typescript.md`

## Document index

- **Base rules (always-on):** `base.md`
  - formatting & file structure
  - Vue SFC structure (template → script → styles)
  - BEM + Tailwind hybrid styling (no `scoped`)
  - naming conventions, auto-import rules, etc.

- **Area-specific rules (opt-in):**
  - `api-fetching.md`
  - `pinia.md`
  - `i18n.md`
  - `nuxt-conventions.md`
  - `typescript.md`

## Non-negotiables

- Use **Nuxt v4** and **NuxtUI v4** only.
- Before implementing a specific feature, check **VueUse** first; prefer VueUse composables when available.
- If Nuxt/NuxtUI MCP docs are required and not working, **pause and ask** (do not invent APIs).

## Contribution rule

When you add a new rule:

- If it applies to **most code**, put it in `base.md`
- If it applies only sometimes, create/extend a dedicated doc (Pinia/API/i18n/etc)
