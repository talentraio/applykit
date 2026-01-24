# Code style: base rules (ApplyKit)

These rules are **always on**. Keep other guides (Pinia / API fetching / i18n) separate to avoid bloating context.

## Formatting

We format via **Prettier** (repo `.prettierrc`) and keep formatting discussions out of PRs.

## Vue component composition

- Keep components small and focused.
- Push business logic out of UI components into **stores** and **composables**.
- Prefer **computed / derived getters** over duplicating state.

## Vue SFC structure

Order is always:

1. `<template>`
2. `<script setup lang="ts">`
3. `<style lang="scss">` (optional)

## Component naming

- Every component must declare a stable name:

```ts
defineOptions({ name: 'AuthFormRegistration' })
```

- Use **PascalCase** for component names and file names.
- Avoid duplicated prefixes caused by Nuxt auto-import:
  - Prefer `components/ats/Document.vue` over `components/ats/AtsDocument.vue`

## `<script setup>` conventions

- Always: `<script setup lang="ts">`
- Optional generics for reusable components:
  - `<script setup lang="ts" generic="T">`
- `defineProps` / `defineEmits` / `defineSlots`:
  - Prefer **inline interfaces/types** when used only in that component.
- v-model proxying:
  - Prefer `defineModel()` first.
  - If custom logic is required, use `computed({ get, set })`.

## Imports & auto-import

- Prefer **Nuxt auto-import** by default.
- Add explicit imports only when:
  - the symbol is not auto-imported,
  - or an explicit import improves readability,
  - or it prevents name collisions.

## Styling: Tailwind-first + BEM encapsulation (no `scoped`)

We use a hybrid approach:

- **Tailwind-first** for layout, spacing, typography, colors, borders, and fast iteration.
- **SCSS** only when it adds clarity (complex selectors, pseudo-elements, animations, non-trivial state styling, selectors Tailwind would make unreadable).

Encapsulation rules:

- **No `scoped` styles.**
- **One component = one BEM block** (default rule).
  - If you need more than one block, first consider splitting into smaller components.
- Even if a component uses only Tailwind utilities, the **root element must have a semantic class**
  that represents the component and acts as the BEM block.

Examples (kebab-case, semantic):

- `auth-form-registration`
- `auth-form-registration-header`
- `vacancy-card`
- `resume-preview`

### BEM naming

- Block: `.block`
- Element: `.block__element`
- Modifier: `.block--modifier` or `.block__element--modifier`

Example:

```vue
<template>
  <form class="auth-form-registration flex flex-col gap-4">
    <header class="auth-form-registration__header">
      <h1 class="auth-form-registration__title text-xl font-semibold">Create account</h1>
    </header>
  </form>
</template>

<script setup lang="ts">
defineOptions({ name: 'AuthFormRegistration' })
</script>

<style lang="scss">
.auth-form-registration {
  &__header {
  }
  &__title {
  }
}
</style>
```

## Theme tokens & “no inline styles”

- Theme tokens live in the **shared UI layer** (CSS variables + small SCSS mixins).
- Avoid one-off inline styles (`style=""`) unless truly local and unavoidable.
  If a style is reused or affects theming, move it into tokens/mixins or BEM SCSS.

## TypeScript / JavaScript style

We aim for an **Airbnb-like** style (enforced via ESLint where practical).

Functions:

- In Vue components, prefer **arrow functions**.
- For one-liners, allow implicit returns:
  - `const isReady = () => status.value === 'ready';`
- If a function doesn’t fit within Prettier line length, use braces:
  - `const fn = () => { ... }`

## SCSS (Dart Sass)

- Use **modern Sass**:
  - Prefer `@use` / `@forward`
  - Avoid legacy `@import`
- Reuse the shared mixins/utilities first.

## Linting (styles)

Stylelint:

- Use `stylelint-config-standard-scss` + `stylelint-config-recommended-vue`
- Ignore Tailwind/Sass custom at-rules as configured in `.stylelintrc.js`
