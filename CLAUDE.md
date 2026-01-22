# Project context (for Claude Code)

This is a Nuxt monorepo (pnpm workspaces) for a resume tailoring tool.

Primary goal:
- A fast, reliable MVP that parses resumes (DOCX/PDF) into strict JSON, tailors per vacancy, and exports ATS/Human PDFs.

Key conventions:
- Shared layers as internal packages: @int/schema, @int/api, @int/ui
- Type safety end-to-end (avoid client-side generic typing for API)
- Zod validation in LLM/parsing services
- Pinia stores own data flow; components call store actions
- i18n from the start

If unsure, open docs/* and follow them.

## Tooling & docs policy

- Use **latest Nuxt v4** and **latest NuxtUI v4**.
- For Nuxt questions, rely on the **Nuxt docs MCP server**.
  If the Nuxt MCP is needed but not working: **stop coding and ask the user to fix MCP** (do not guess).
- For NuxtUI questions, rely on the **NuxtUI docs MCP server**.
  If the NuxtUI MCP is needed but not working: **stop coding and ask the user to fix MCP** (do not guess).
- For other libraries/docs: prefer **MCP context7** as the first source.
- Before implementing any specific functionality, check **VueUse** first.
  If a composable already exists, prefer using it instead of custom code.


## Active Technologies
- TypeScript 5.x (Nuxt 4 / Vue 3) (001-foundation-mvp)

## Recent Changes
- 001-foundation-mvp: Added TypeScript 5.x (Nuxt 4 / Vue 3)
