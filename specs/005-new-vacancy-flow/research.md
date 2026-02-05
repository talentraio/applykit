# Research: Vacancy Detail Page Restructuring

**Feature**: 005-new-vacancy-flow
**Date**: 2026-02-04

## Research Tasks

### 1. Nuxt Nested Routes Pattern

**Question**: How to implement `/vacancies/[id].vue` as a layout wrapper for sub-pages?

**Finding**: Nuxt 4 supports nested routes via directory structure. When a page file matches a directory name, it becomes a layout for child pages.

**Decision**: Use `[id].vue` as parent layout wrapper
**Rationale**: Standard Nuxt pattern, already have `/vacancies/[id]/ats.vue` and `/vacancies/[id]/human.vue` using this pattern
**Alternatives Considered**:

- Custom layout file - rejected (more complex, non-standard)
- Middleware redirect - rejected (doesn't provide layout wrapper)

**Implementation**:

```
pages/vacancies/
├── [id].vue          # Parent layout (contains <NuxtPage />)
└── [id]/
    ├── index.vue     # Redirects to overview
    ├── overview.vue  # Main content
    ├── resume.vue    # Resume editing
    ├── cover.vue     # Placeholder
    └── preparation.vue # Placeholder
```

### 2. NuxtUI Breadcrumb Component

**Question**: Which NuxtUI component for breadcrumbs with slash separator?

**Finding**: NuxtUI v4 provides `UBreadcrumb` component with customizable separator via `divider` slot or `divider-icon` prop.

**Decision**: Use `UBreadcrumb` with custom divider
**Rationale**: Native NuxtUI component, supports all required features
**Alternatives Considered**:

- Custom breadcrumb - rejected (reinventing the wheel)
- UNavigation - rejected (different purpose)

**Implementation**:

```vue
<UBreadcrumb :links="breadcrumbLinks" divider-icon="i-lucide-slash" />
```

### 3. NuxtUI Dropdown Menu Component

**Question**: Which component for section navigation dropdown?

**Finding**: NuxtUI v4 provides `UDropdownMenu` for dropdown menus with trigger and items.

**Decision**: Use `UDropdownMenu` with `UButton` trigger
**Rationale**: Matches existing patterns in codebase
**Alternatives Considered**:

- UPopover - rejected (no built-in menu semantics)
- USelect - rejected (meant for form inputs)

**Implementation**:

```vue
<UDropdownMenu :items="navItems">
  <UButton icon="i-lucide-menu" variant="ghost" />
</UDropdownMenu>
```

### 4. Clickable Status Badge Pattern

**Question**: How to make status badge clickable with dropdown for status change?

**Finding**: Combine `UBadge` inside `UDropdownMenu` trigger slot. Badge shows current status with color, dropdown contains other options.

**Decision**: Wrap `UBadge` in `UDropdownMenu` trigger
**Rationale**: Clean composition, reuses NuxtUI components
**Alternatives Considered**:

- Custom component with popover - rejected (more complex)
- USelect styled as badge - rejected (different visual)

**Implementation**:

```vue
<UDropdownMenu :items="statusOptions">
  <UBadge :color="statusColor" variant="soft" class="cursor-pointer">
    {{ statusLabel }}
  </UBadge>
</UDropdownMenu>
```

### 5. Auto-Save with watchDebounced

**Question**: Confirm watchDebounced pattern for generation auto-save

**Finding**: Already used in `useResume.ts` composable with 2000ms debounce. Pattern proven and working.

**Decision**: Reuse same pattern in `useVacancyGeneration.ts`
**Rationale**: Proven in codebase, consistent UX
**Alternatives Considered**:

- Custom debounce - rejected (VueUse is better)
- useDebounceFn - rejected (watchDebounced fits reactive pattern better)

**Implementation** (from existing useResume.ts:88-111):

```typescript
watchDebounced(
  () => store.editingContent,
  async () => {
    if (!store.isDirty || !store.editingContent) return;
    const validation = ResumeContentSchema.safeParse(store.editingContent);
    if (!validation.success) return;
    try {
      await store.saveContent();
    } catch {
      toast.add({
        /* error */
      });
    }
  },
  { debounce: 2000, deep: true }
);
```

## Status Color Mapping

**Question**: What NuxtUI color tokens to use for status badge colors?

**Finding**: NuxtUI v4 uses Tailwind color names. Map status colors to NuxtUI Badge color prop.

**Decision**: Use NuxtUI color tokens directly
**Mapping**:
| Status | Spec Color | NuxtUI Token |
|--------|------------|--------------|
| created | gray | `neutral` |
| generated | blue | `primary` |
| screening | orange | `warning` |
| rejected | red | `error` |
| interview | green | `success` |
| offer | purple | `violet` |

## Existing Code Patterns

### Store Pattern (from useVacancyStore)

The existing store already has:

- Generation editing state (`isEditingGeneration`, `editingGenerationContent`)
- History management for undo/redo
- `saveGenerationContent()` action (needs API implementation)

**Extension needed**: Add `status` to vacancy state and `updateVacancyStatus()` action.

### Page Structure (from [id]/index.vue)

Current page has:

- `ResumeEditorLayout` for two-column editing
- Conditional rendering based on `isEditingGeneration`
- Generation display components

**Changes needed**: Extract to sub-pages, remove local editing state management.

## Open Items Resolved

All research items resolved. No NEEDS CLARIFICATION remaining.

## Summary

All technical decisions validated against existing codebase patterns. Implementation can proceed using:

- Nuxt nested routes for page structure
- NuxtUI components (UBreadcrumb, UDropdownMenu, UBadge)
- VueUse watchDebounced for auto-save
- Existing store patterns for state management
