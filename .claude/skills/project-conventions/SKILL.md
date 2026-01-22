---
name: project-conventions
description: Repo conventions for ApplyKit-style monorepo (Nuxt layers + strict schemas). Load when generating code or specs in this repo.
---

Use these docs as the source of truth:
- docs/architecture/*
- docs/api/*
- docs/codestyle/*

Always follow:
- Monorepo structure (pnpm workspaces; Nuxt layers as @int/* packages)
- Strict schemas in @int/schema (Zod + inferred types)
- Store/actions pattern for API calls
- Server-side islands rendering for ATS/Human pages
- i18n from day 1
- Use latest Nuxt v4 and NuxtUI v4.
- Use Nuxt docs MCP and NuxtUI docs MCP when working with those frameworks.
  If MCP is required but not working: stop and ask the user (do not guess).
- Use MCP context7 for other documentation.
- Check VueUse first; prefer existing composables over custom ones.

