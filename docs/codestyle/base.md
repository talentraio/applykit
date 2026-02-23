# Code style: base rules (ApplyKit)

These rules are **always on**. Keep other guides (Pinia / API fetching / i18n) separate to avoid bloating context.

## Formatting

We format via **Prettier** (repo `.prettierrc`) and keep formatting discussions out of PRs.

## Vue component composition

- Keep components small and focused.
- Push business logic out of UI components into **stores** and **composables**.
- Prefer **computed / derived getters** over duplicating state.

### Events over watchers

- Prefer **event-driven** flows in components and composables (`emit`, explicit handlers, action calls).
- Avoid `watch` / `watchEffect` by default.
- Use watchers only when an event-driven solution is not feasible.

### Component decomposition

Large components should be split into smaller, focused sub-components. Use a folder structure:

```
components/
  ProfileForm/
    index.vue           # Main container, orchestrates sub-components
    Actions.vue         # Form actions (submit, cancel buttons)
    section/
      Basic.vue         # Basic info section
      Languages.vue     # Languages list section
      Phone.vue         # Phone numbers section
```

**When to decompose:**

- Template exceeds ~150 lines
- Component has multiple distinct sections (form sections, tabs, etc.)
- Logic can be isolated (each section handles its own add/remove)
- Reusability potential (section components can be reused)

**Decomposition rules:**

1. **Main component** (`index.vue`): orchestrates layout, handles form submission, manages overall state
2. **Section components**: handle their own UI, emit events for state changes
3. **Actions component**: submit/cancel buttons, loading states
4. Keep props drilling minimal — use provide/inject or store for deep data

**Example structure for ProfileForm:**

```vue
<!-- ProfileForm/index.vue -->
<template>
  <form class="user-profile-form" @submit.prevent="handleSubmit">
    <UserProfileFormSectionBasic v-model="formData" />
    <UserProfileFormSectionLanguages v-model="formData.languages" />
    <UserProfileFormSectionPhone v-model="formData.phones" />
    <UserProfileFormActions :saving="saving" @cancel="$emit('cancel')" />
  </form>
</template>
```

## Vue SFC structure

Order is always:

1. `<template>`
2. `<script setup lang="ts">`
3. `<style lang="scss">` (optional)

## Component naming

- Every component must declare a stable name:

```ts
defineOptions({ name: 'AuthFormRegistration' });
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
  - **Proxy-only components must use `defineModel()`** and bind with `v-model` in templates.
  - Avoid `:model-value` + `@update:model-value` when you are only forwarding the value.
  - If custom logic is required (transform, validation, merging), use `computed({ get, set })` or explicit emit handlers.

## Imports & auto-import

- Prefer **Nuxt auto-import** by default.
- Add explicit imports only when:
  - the symbol is not auto-imported,
  - or an explicit import improves readability,
  - or it prevents name collisions.

## Composable Arguments Reactivity

- When passing reactive props/state into composables, prefer **refs/getters** over ad-hoc wrappers.
- For props, prefer `toRef(() => props.foo)` (or `toRef(props, 'foo')` when two-way sync is needed).
- In composables, accept flexible reactive inputs via `MaybeRefOrGetter<T>` and normalize with `toValue(...)`.
- Avoid creating multiple `computed(() => props.foo)` only to forward values into composables.

## API calls (client-side)

- **Always use `useApi()`** for all client-side API calls to the backend (components, composables, stores, API files).
- **Never use `$fetch` directly** — it bypasses the `create-api.ts` plugin which handles:
  - SSR header forwarding (`host`, `cookie`, `x-forwarded-*`) — required for correct URL resolution on the server
  - Auth error interception (403 → redirect to login)
  - Request timeout configuration
- `useApi` is auto-imported from `@int/api` layer (`packages/nuxt-layer-api/app/composables/useApi.ts`).

## Navigation (Nuxt)

- Prefer **native HTML navigation** whenever possible:
  - Use `to` on `UButton` / `NuxtLink` for simple navigation.
  - Avoid programmatic navigation for normal links/buttons.
- If programmatic navigation is required, use `navigateTo(...)`.
- Do not use `router.push(...)` for app navigation.

## Modals and slideovers

- Do not mount new modal/slideover components directly in page/layout templates just to control open
  state.
- For new flows, open them programmatically via `useProgrammaticOverlay` from `@int/ui`
  (`packages/nuxt-layer-ui/app/composables/useProgrammaticOverlay.ts`).
- Keep orchestration in layer composables (for example `useAuth`, `useResumeModals`,
  `useVacancyModals`), and keep modal components focused on internal form/UI logic.
- Prefer stable overlay ids for reusable flows and pass `destroyOnClose` explicitly based on flow
  lifecycle requirements.
- For `UModal`/`USlideover`, always provide accessible labeling (`title` and `description`).

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

### BEM naming with layer prefix

**Important**: The root BEM class must reflect the **full component name** including the layer prefix.

Each layer has a component prefix configured in `nuxt.config.ts`:

```typescript
// apps/site/layers/profile/nuxt.config.ts
components: [{ path: '@site/profile/app/components', prefix: 'Profile' }];

// apps/site/layers/resume/nuxt.config.ts
components: [{ path: '@site/resume/app/components', prefix: 'Resume' }];
```

So a component `ProfileForm/index.vue` in the `profile` layer will be registered as `ProfileForm`.
The root BEM class must match: `profile-form`.

Examples (kebab-case, semantic, **with prefix**):

- `profile-form` (in profile layer → `<ProfileForm />`)
- `resume-uploader` (in resume layer → `<ResumeUploader />`)
- `vacancy-card` (in vacancy layer)
- `auth-login-form` (in auth layer)

### BEM naming rules

- Block: `.block`
- Element: `.block__element`
- Modifier: `.block--modifier` or `.block__element--modifier`

Example:

```vue
<template>
  <form class="user-profile-form flex flex-col gap-4">
    <header class="user-profile-form__header">
      <h1 class="user-profile-form__title text-xl font-semibold">Profile</h1>
    </header>
  </form>
</template>

<script setup lang="ts">
defineOptions({ name: 'UserProfileForm' });
</script>

<style lang="scss">
.user-profile-form {
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

### Type Safety: Avoid `any` and type assertions

**CRITICAL RULE**: Type safety is non-negotiable in this codebase.

**Forbidden (except in exceptional cases):**

- `any` type
- Type assertions like `value as SomeType`
- Suppressing TypeScript errors with type casts

**Allowed:**

- `as const` for literal type narrowing
- `{} as const` for const object assertions
- `as unknown as Type` when truly necessary with clear justification

**Required approach:**

0. **Before creating a new type guard**, check existing guards in `@int/npm-utils` and reuse them.
   Add a new guard there only when no suitable one exists.
1. **Find the proper type** from the library/framework you're using
2. **Import it explicitly** instead of using `any`
3. **Fix the root cause** of type errors instead of suppressing them

**Examples:**

```ts
// ❌ BAD - using any to suppress errors
defineProps<{
  links?: any[]; // Never do this!
}>();

// ✅ GOOD - import proper type from library
import type { ButtonProps } from '#ui/types';

defineProps<{
  links?: ButtonProps[];
}>();

// ❌ BAD - type assertion without justification
const result = data as MyType;

// ✅ GOOD - type guard with runtime validation
const isMyType = (value: unknown): value is MyType => {
  return typeof value === 'object' && value !== null && 'field' in value;
};

if (isMyType(data)) {
  // TypeScript knows data is MyType here
}

// ✅ ACCEPTABLE - as const for literal types
const config = {
  mode: 'production',
  version: 1
} as const;

// ✅ ACCEPTABLE with justification - unavoidable type conversion
// Justification: Third-party library returns unknown, we validated with Zod
const validated = zodSchema.parse(data);
const typed = validated as MyType; // Safe after Zod validation
```

**When you encounter a type error:**

1. Read the error message carefully
2. Check library documentation for the correct type
3. Import and use the proper type
4. If stuck, ask for help - never resort to `any`

Functions:

- In Vue components, use **arrow functions by default**.
- Use `function` declarations only when there is a clear reason (for example hoisting requirements or
  clearer named recursion).
- For one-liners, allow implicit returns:
  - `const isReady = () => status.value === 'ready';`
- If a function doesn't fit within Prettier line length, use braces:
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
