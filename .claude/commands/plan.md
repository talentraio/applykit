---
name: plan
description: Turn a spec into an implementation plan with ordered tasks and PR boundaries.
disable-model-invocation: true
---

Input: $ARGUMENTS (link to spec file or feature description)

Output:
- Step-by-step plan
- Each step: files to touch, risks, tests to add
- Keep tasks small (1-2 hours each)
- Highlight any missing info or decisions
- Respect repo conventions (see .claude/skills/project-conventions/SKILL.md):
    - VueUse-first, i18n, Nuxt v4/NuxtUI v4, @int/schema, server-side islands for ATS/Human
    - When referencing a layer, include both:
        - repo path: packages/nuxt-layer-*/ and package name: @int/*
