---
name: review
description: Review current changes for style, architecture fit, and correctness.
disable-model-invocation: true
---

Review checklist (source of truth: .claude/skills/project-conventions/SKILL.md + docs/*):
- Matches docs/architecture decisions
- Nuxt v4 + NuxtUI v4 only (no accidental v3 patterns)
- VueUse-first: no custom composable when VueUse has an equivalent
- Layer packages: if touching packages/nuxt-layer-*/ ensure:
    - package.json has "main": "./nuxt.config.ts"
    - correct extends wiring in apps or other layers
    - repo path is referenced correctly (packages/...) vs package name (@int/...)
- Schemas: strict typing via @int/schema (Zod + inferred types)
- API typings inferred correctly (no client generics)
- Stores return values from actions
- ATS/Human pages remain SSR-friendly and follow server-side islands rendering
- i18n keys exist for new UI strings (no hardcoded copy)
- Security: no secrets in cookies; no logging of PII/keys
- Tests: at least minimal coverage for risky logic
- Docs: update docs if behavior/contracts changed

Task: review current diff / $ARGUMENTS
