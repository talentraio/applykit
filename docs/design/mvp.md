# MVP Design Contract (ApplyKit)

Last updated: 2026-01-22

This document is the **single source of truth** for MVP UI decisions.  
Goal: ship fast with a **consistent, glossy B2C look** using **Nuxt UI Pro** templates and tokens.

---

## 1) Sources of truth (do not deviate)

- **apps/site** follows **Nuxt UI Pro – SaaS** template look & feel.
- **apps/admin** follows **Nuxt UI Pro – Dashboard** template look & feel.

Rules:
- Do not invent new UI patterns if a Nuxt UI Pro pattern exists.
- Reuse the templates’ layout rhythm: spacing, typography hierarchy, card styles, button styles.
- Landing may use “glossy” effects; admin should remain clean and utilitarian.

---

## 2) Theme & color mode

### Color mode
- Prefer **system** color mode.
- Fallback default is **dark** (if system preference is not available).

### Tokens (global)
These tokens must be set in `packages/nuxt-layer-ui/app/app.config.ts` and used everywhere:

- `ui.colors.primary = "violet"`
- `ui.colors.neutral = "slate"`
- `theme.radius = 0.9` (soft, B2C-friendly)

No ad-hoc hex colors in components unless explicitly justified.

---

## 3) Visual style goals (B2C glossy)

### Site (marketing + app pages under apps/site)
- **High-contrast dark mode** by default; light mode should also look premium.
- Big hero typography, generous spacing, large radius cards.
- Subtle gradients/glow are allowed **only** on marketing surfaces (homepage sections, hero).
- Primary CTA should be prominent and consistent across the site.

### Admin (apps/admin)
- No glow/marketing gradients.
- Use Dashboard template patterns: sidebar, page header, tables, filters, panels.

---

## 4) Layout and structure rules

### Site landing (`apps/site/layers/landing`)
Homepage should be composed of these sections (in this order):
1. Hero (headline, subheadline, primary + secondary CTA, visual/mock area)
2. Steps (3–5 steps explaining the flow)
3. ATS vs Human explanation (clear comparison)
4. Metric tiles placeholders (future dashboards)
5. FAQ (short and practical)
6. Footer

### App shell (`apps/site/layers/*`)
- Reuse the SaaS template navigation/app shell patterns.
- Keep pages SSR-friendly and compatible with server-side islands rendering.

### Internal app layers
- `apps/site/layers/*` and `apps/admin/layers/*` should not define competing themes.
- All styling decisions (tokens/theme) must live in `@int/ui`.

---

## 5) Components and composition guidelines

- Prefer Nuxt UI (Pro) components first; wrap them only when needed for consistency.
- Create minimal “composition components” in `@int/ui` to standardize page structure:
  - `AppShell`, `PageHeader`, `Section`, `MetricTile`, `EmptyState`, etc.
- Avoid one-off styling. If a pattern repeats twice, promote it to `@int/ui`.

---

## 6) Content, tone, i18n

- All visible strings must use i18n keys (no hardcoded text).
- Tone: friendly, simple, product-oriented (B2C), not “developer tooling”.

---

## 7) Accessibility & responsiveness

- Use proper heading order (H1/H2/H3).
- Ensure focus states are visible.
- Ensure mobile layout is not an afterthought:
  - buttons tappable,
  - cards stack properly,
  - tables in admin degrade gracefully.

---

## 8) Implementation notes for agents

When implementing UI tasks, always:
- Start from the relevant Nuxt UI Pro template pattern (SaaS or Dashboard).
- Keep tokens consistent with Section 2.
- If unsure about a Nuxt UI / Nuxt UI Pro API: verify using MCP docs (do not guess).
