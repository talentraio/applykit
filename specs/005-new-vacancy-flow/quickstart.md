# Quickstart: Vacancy Detail Page Restructuring

**Feature**: 005-new-vacancy-flow
**Date**: 2026-02-04

## Overview

This feature restructures `/vacancies/[id]` into sub-pages with navigation and adds status tracking.

## Prerequisites

- PostgreSQL running locally
- `pnpm install` completed
- Existing vacancy data (or create via UI)

## Quick Setup

### 1. Run Database Migration

```bash
# From repo root
pnpm --filter @int/api db:migrate
```

This adds the `status` column to the `vacancies` table with default 'created'.

### 2. Start Development Server

```bash
pnpm dev
```

### 3. Test the New Routes

Navigate to:

- `/vacancies` - List page (unchanged)
- `/vacancies/[id]` - Should redirect to `/vacancies/[id]/overview`
- `/vacancies/[id]/overview` - New overview page
- `/vacancies/[id]/resume` - Resume editing (if generation exists)
- `/vacancies/[id]/cover` - Placeholder page
- `/vacancies/[id]/preparation` - Placeholder page

## Key Files Changed

### Schema Layer (`packages/schema/`)

| File                 | Change                                              |
| -------------------- | --------------------------------------------------- |
| `constants/enums.ts` | Added `VACANCY_STATUS_MAP`, `VACANCY_STATUS_VALUES` |
| `schemas/enums.ts`   | Added `VacancyStatusSchema`, `VacancyStatus` type   |
| `schemas/vacancy.ts` | Added `status` field to `VacancySchema`             |

### API Layer (`packages/nuxt-layer-api/`)

| File                                                    | Change                           |
| ------------------------------------------------------- | -------------------------------- |
| `server/database/migrations/00XX_add_vacancy_status.ts` | New migration                    |
| `server/database/schema/vacancy.ts`                     | Added `status` column            |
| `server/api/vacancies/[id].put.ts`                      | Status update validation         |
| `server/api/generations/index.post.ts`                  | Auto-status update on generation |

### Vacancy Layer (`apps/site/layers/vacancy/`)

| File                                       | Change                      |
| ------------------------------------------ | --------------------------- |
| `app/pages/vacancies/[id].vue`             | Converted to layout wrapper |
| `app/pages/vacancies/[id]/index.vue`       | New: redirect to overview   |
| `app/pages/vacancies/[id]/overview.vue`    | New: overview page          |
| `app/pages/vacancies/[id]/resume.vue`      | New: resume editing         |
| `app/pages/vacancies/[id]/cover.vue`       | New: placeholder            |
| `app/pages/vacancies/[id]/preparation.vue` | New: placeholder            |
| `app/components/detail/Header.vue`         | New: header with nav        |
| `app/components/detail/Breadcrumbs.vue`    | New: breadcrumb component   |
| `app/components/detail/NavDropdown.vue`    | New: section dropdown       |
| `app/components/StatusBadge.vue`           | New: clickable status badge |
| `app/composables/useVacancyGeneration.ts`  | New: auto-save composable   |
| `app/stores/index.ts`                      | Added status state/actions  |

### i18n (`apps/site/i18n/`)

| File      | Change                                          |
| --------- | ----------------------------------------------- |
| `en.json` | Added `vacancy.status.*`, `vacancy.nav.*`, etc. |

## Testing the Feature

### Manual Testing

1. **Navigation Flow**
   - Go to `/vacancies`
   - Click a vacancy → should land on `/vacancies/[id]/overview`
   - Check breadcrumbs show: Vacancies / [Company] / Overview
   - Use dropdown to navigate to Resume, Cover, Preparation

2. **Status Badge**
   - On overview page, click the status badge
   - Dropdown should show available statuses
   - Select a status → should update immediately
   - Check color changes appropriately

3. **Resume Auto-Save**
   - Navigate to `/vacancies/[id]/resume` (needs generation)
   - Edit a field
   - Wait 2 seconds → should auto-save
   - No Save/Cancel buttons visible
   - Undo/redo in footer should work

4. **Status Auto-Transition**
   - Create a new vacancy (status = 'created')
   - Generate a tailored resume
   - Check status changed to 'generated'

### Automated Tests

```bash
# Unit tests
pnpm test:unit -- --grep "VacancyStatus"

# E2E tests
pnpm test:e2e -- --grep "vacancy-detail"
```

## Common Issues

### Migration Fails

```
Error: column "status" already exists
```

**Fix**: Migration already ran. Skip or reset database.

### Status Badge Not Clickable

**Check**: Component uses `UDropdownMenu` wrapping `UBadge`

### Auto-Save Not Working

**Check**:

- `useVacancyGeneration` composable imported correctly
- `watchDebounced` from `@vueuse/core` available
- Store action `saveGenerationContent` implemented

### Redirect Not Working

**Check**: `/vacancies/[id]/index.vue` has:

```vue
<script setup>
const route = useRoute();
navigateTo(`/vacancies/${route.params.id}/overview`, { replace: true });
</script>
```

## Architecture Notes

### Page Structure

```
[id].vue (layout wrapper)
├── VacancyDetailHeader
│   ├── VacancyDetailBreadcrumbs
│   └── VacancyDetailNavDropdown
└── <NuxtPage /> (renders sub-page)
    ├── overview.vue
    ├── resume.vue
    ├── cover.vue
    └── preparation.vue
```

### State Management

Vacancy status is managed in `useVacancyStore`:

- `currentVacancy.status` - current status
- `updateVacancyStatus(status)` - action to update

Generation editing uses existing store patterns with auto-save via `useVacancyGeneration` composable.

### Status Transition Logic

Located in `StatusBadge.vue`:

```typescript
const availableStatuses = computed(() => {
  const hasGeneration = !!latestGeneration.value;
  return getAvailableStatuses(vacancy.value.status, hasGeneration);
});
```

## Next Steps

After this feature:

1. Implement cover letter generation (Cover page)
2. Implement interview preparation (Preparation page)
3. Add status change history/audit log
4. Add status change notifications
