---
name: implement
description: Implement a planned step while following repo architecture and code style.
argument-hint: |
  TASK: Implement the admin users page in apps/admin/layers/users/app/pages/users.vue
disable-model-invocation: true
---

Before coding:

- Load .codex/skills/project-conventions/SKILL.md (source of truth).
- Read relevant docs in docs/architecture, docs/api, docs/codestyle.
- Confirm which app/layer you are editing AND its repo path:
  - apps/site
  - apps/admin
  - packages/nuxt-layer-api/ (package: @int/api)
  - packages/nuxt-layer-ui/ (package: @int/ui)
  - packages/nuxt-layer-schema/ (package: @int/schema)

When coding:

- Nuxt v4 + NuxtUI v4 only. Use Nuxt/NuxtUI MCP docs for exact APIs.
  If MCP is required but not working: stop and ask the user (do not guess).
- Check VueUse first; prefer existing composables over custom ones.
- Follow store/action/API module pattern (actions return values).
- Keep typing strict and consistent with @int/schema (Zod + inferred types).
- Add Zod validation in LLM/parsing services, not in endpoints.
- ATS/Human pages: keep SSR-friendly and use server-side islands rendering.
- i18n from day 1: no hardcoded UI strings.
- Security: do not log PII or API keys; do not store secrets in cookies.
- Keep changes minimal and reviewable.

Task: $ARGUMENTS
