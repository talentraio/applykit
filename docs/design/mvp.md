# MVP Design Contract (ApplyKit)

Last updated: 2026-02-19

This document captures the current UI contract for MVP.

## 1) Design system source of truth

- Shared UI/theme tokens are defined in `@int/ui`.
- Product apps (`apps/site`, `apps/admin`) consume shared tokens and layer-specific components.
- Reuse existing Nuxt UI v4 patterns before creating custom patterns.

## 2) Theme and tokens

Configured in `packages/nuxt-layer-ui/app/app.config.ts`:

- `ui.colors.primary = 'violet'`
- `ui.colors.neutral = 'slate'`
- `theme.radius = 0.9`

Token usage rules:

- avoid ad-hoc color values for repeated patterns,
- keep theme decisions centralized in `@int/ui`.

## 3) Visual direction

### Site (`apps/site`)

- Marketing surfaces are dark-first with gradient atmosphere.
- Product surfaces keep readability and consistency with shared tokens.
- Strong CTA hierarchy and clear section rhythm.

### Admin (`apps/admin`)

- Utility-first dashboard style.
- Focus on clarity for tables, filters, and management actions.
- Avoid marketing-heavy visual effects.

## 4) Current landing composition

Landing page (`apps/site/layers/landing/app/pages/index.vue`) currently uses:

1. Header
2. Hero
3. Proof
4. Flow
5. Features
6. Modes (ATS + Human)
7. Comparison
8. FAQ
9. CTA
10. Footer

## 5) App architecture and consistency

- Layer UIs must not define competing global themes.
- Shared theme decisions belong to `@int/ui`.
- Keep app pages SSR-friendly and compatible with server-side rendering requirements.

## 6) Content and i18n

- All user-visible strings must use i18n keys.
- Tone should be clear, practical, and product-focused.

## 7) Accessibility and responsive behavior

- Maintain heading hierarchy.
- Keep focus states visible.
- Ensure mobile-first usability for actions, forms, and tables.

## 8) Implementation rule for contributors

Before introducing a new pattern:

1. Check existing project components/patterns in the same layer.
2. Check shared UI primitives in `@int/ui`.
3. Add new pattern only when reuse is not feasible.
