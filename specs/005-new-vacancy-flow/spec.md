# Feature Spec: Vacancy Detail Page Restructuring

## Overview

Restructure the vacancy detail page (`/vacancies/[id]`) into multiple sub-pages with a thin header layout providing internal navigation. This includes adding a new `status` field to track vacancy application progress and moving the resume editing experience to a dedicated sub-page with auto-save.

## Goals

- Split `/vacancies/[id]` into four sub-pages: Overview, Resume, Cover, Preparation
- Implement thin header layout with breadcrumbs and dropdown navigation
- Add vacancy application status tracking (created → generated → screening → rejected/interview → offer)
- Move resume editing to dedicated sub-page with auto-save (debounced, like `/resume`)
- Improve UX with cleaner information hierarchy on Overview page

## Non-goals

- Cover letter generation logic (placeholder page only)
- Interview preparation content (placeholder page only)
- Status workflow automation (manual status changes only for now)
- Email/notification integration for status changes

## Scope

### In Scope

- New routing structure under `/vacancies/[id]/`
- Layout component with header (breadcrumbs + dropdown nav)
- Overview page redesign with status badge
- Resume sub-page with auto-save
- Cover and Preparation placeholder pages
- `VacancyStatus` enum and schema extension
- Status badge colors and i18n labels

### Out of Scope

- Status change history/audit log
- Status change notifications
- Automated status transitions
- Cover letter generation implementation
- Interview preparation implementation

## Roles & Limits

- **super_admin**: Full access to all vacancy features
- **friend**: Full access to their own vacancies
- **public**: No access (auth required)
- **BYOK policy**: Status tracking does not consume LLM credits

## User Flows

### Navigate to Vacancy Detail

1. User clicks vacancy from `/vacancies` list
2. Redirects to `/vacancies/[id]/overview`
3. Header shows breadcrumbs: Vacancies / [Company Name] / Overview
4. Dropdown menu provides navigation to Resume, Cover, Preparation

### Generate Tailored Resume

1. User on Overview page clicks "Generate Tailored Resume"
2. Loader appears while LLM processes
3. On success: redirect to `/vacancies/[id]/resume`
4. If status was `created`, auto-transition to `generated`

### Edit Tailored Resume

1. User navigates to `/vacancies/[id]/resume`
2. Form loads with current generation content
3. Changes auto-save with debounce (2000ms)
4. No explicit Save/Cancel buttons needed

### Update Vacancy Status

1. User clicks on the status badge
2. Dropdown opens showing contextually valid statuses:
   - If no generation exists: shows `created`, `screening`, `rejected`, `interview`, `offer`
   - If generation exists: shows `generated`, `screening`, `rejected`, `interview`, `offer`
3. User selects new status
4. Status updates immediately (API call)

## UI/Pages

### Layout: `/vacancies/[id]` (parent)

```
┌─────────────────────────────────────────────────────┐
│ Vacancies / Company Name / Overview      [▼ Menu]   │  ← Thin header
├─────────────────────────────────────────────────────┤
│                                                     │
│                   <NuxtPage />                      │  ← Sub-page content
│                                                     │
└─────────────────────────────────────────────────────┘
```

- Breadcrumbs: Vacancies (link) / Vacancy Title (link to overview) / Current Section
- Dropdown menu: Overview, Resume, Cover, Preparation
- Mobile: Same layout with dropdown menu (no special mobile navigation)

### Page: `/vacancies/[id]/overview`

```
┌─────────────────────────────────────────────────────┐
│ Company Name                         [✏️] [🗑️]       │  ← Title + actions
│   position title                                    │
├─────────────────────────────────────────────────────┤
│ Last Updated: Jan 15, 2026    [Vacancy page] [●]   │  ← Meta + status badge
├─────────────────────────────────────────────────────┤
│ [Generate Tailored Resume] [Generate Cover Letter]  │  ← Action buttons
├─────────────────────────────────────────────────────┤
│ Match Score: 45% → 78%                              │  ← Only if generation exists
├─────────────────────────────────────────────────────┤
│ Expires in 14 days                                  │  ← Generation expiry
├─────────────────────────────────────────────────────┤
│ Description                                         │
│ ...                                                 │
├─────────────────────────────────────────────────────┤
│ Notes (if present)                                  │
│ ...                                                 │
└─────────────────────────────────────────────────────┘
```

- Edit button (✏️) toggles inline edit mode on the same page (VacancyForm replaces view content)
- Delete button (🗑️) opens confirmation modal

### Page: `/vacancies/[id]/resume`

- Full ResumeEditorLayout (same as `/resume` page)
- Auto-save enabled with debounce
- No header with Back/Cancel/Save buttons
- Undo/redo controls in footer

### Pages: `/vacancies/[id]/cover` & `/vacancies/[id]/preparation`

- Simple placeholder: "Coming soon"
- Consistent header/navigation

## Data Model

### VacancyStatus Enum

Add to `packages/schema/constants/enums.ts` (package: @int/schema):

```typescript
export const VACANCY_STATUS_MAP = {
  CREATED: 'created',
  GENERATED: 'generated',
  SCREENING: 'screening',
  REJECTED: 'rejected',
  INTERVIEW: 'interview',
  OFFER: 'offer'
} as const;

export const VACANCY_STATUS_VALUES = [
  VACANCY_STATUS_MAP.CREATED,
  VACANCY_STATUS_MAP.GENERATED,
  VACANCY_STATUS_MAP.SCREENING,
  VACANCY_STATUS_MAP.REJECTED,
  VACANCY_STATUS_MAP.INTERVIEW,
  VACANCY_STATUS_MAP.OFFER
] as const;
```

Add Zod schema in `packages/schema/schemas/enums.ts`:

```typescript
export const VacancyStatusSchema = z.nativeEnum(VACANCY_STATUS_MAP);
export type VacancyStatus = z.infer<typeof VacancyStatusSchema>;
```

### Vacancy Schema Extension

Update `packages/schema/schemas/vacancy.ts`:

```typescript
export const VacancySchema = z.object({
  // ... existing fields
  status: VacancyStatusSchema.default('created')
  // ... existing fields
});
```

### Status Badge Colors

| Status    | Color  | Description                         |
| --------- | ------ | ----------------------------------- |
| created   | gray   | Initial state, no actions taken     |
| generated | blue   | First resume generated              |
| screening | orange | Application submitted               |
| rejected  | red    | Received rejection                  |
| interview | green  | Invited to interview                |
| offer     | purple | Received offer (celebration color!) |

### Status Transition Rules

- **`generated` is automatic**: Set only after first successful resume generation (not manually selectable)
- **Available options depend on generation history**:
  - If vacancy has **no generation ever**: dropdown shows `created` as the only "reset" option (cannot select `generated`)
  - If vacancy **has at least one generation**: dropdown shows `generated` as the minimum option (cannot go back to `created`)
- **Forward transitions**: Any status can transition to any higher status (screening → interview → offer, etc.)
- **Backward transitions**: Any status can go back to `generated` (if generation exists) or `created` (if no generation)

## API Surface

### Existing Endpoints (No Changes)

- `GET /api/vacancies` - List vacancies (now includes status)
- `GET /api/vacancies/:id` - Get vacancy detail (now includes status)
- `POST /api/vacancies` - Create vacancy (status defaults to 'created')
- `PUT /api/vacancies/:id` - Update vacancy (can update status)
- `DELETE /api/vacancies/:id` - Delete vacancy

### Generation Auto-Save

Uses existing endpoint:

- `PUT /api/generations/:id` - Update generation content

## LLM Workflows

No changes to LLM workflows. Existing generation flow:

1. `POST /api/generations` triggers LLM tailoring
2. Zod validation on response in generation service
3. On success, if vacancy status is `created`, update to `generated`

## Limits & Safety

- No additional limits required
- Status changes are immediate (no rate limiting needed)
- Generation limits unchanged (per-user daily limits apply)

## Security & Privacy

- Status is user-controlled, no external data
- No additional PII in status field
- Auth required for all vacancy operations

## i18n Keys

### New Keys Required

```yaml
# Vacancy status labels
vacancy.status.created: Created
vacancy.status.generated: Generated
vacancy.status.screening: Screening
vacancy.status.rejected: Rejected
vacancy.status.interview: Interview
vacancy.status.offer: Offer

# Navigation
vacancy.nav.overview: Overview
vacancy.nav.resume: Resume
vacancy.nav.cover: Cover Letter
vacancy.nav.preparation: Preparation

# Overview page
vacancy.overview.generateResume: Generate Tailored Resume
vacancy.overview.generateCoverLetter: Generate Cover Letter
vacancy.overview.vacancyPage: Vacancy page
vacancy.overview.lastUpdated: Last Updated

# Placeholder pages
vacancy.comingSoon: Coming soon

# Breadcrumbs
vacancy.breadcrumbs.vacancies: Vacancies
```

## Monorepo/Layers Touchpoints

### `packages/schema/` (package: @int/schema)

- `constants/enums.ts` - Add `VACANCY_STATUS_MAP`, `VACANCY_STATUS_VALUES`
- `schemas/enums.ts` - Add `VacancyStatusSchema`, `VacancyStatus` type
- `schemas/vacancy.ts` - Add `status` field to `VacancySchema`

### `packages/nuxt-layer-api/` (package: @int/api)

- Migration: Add `status` column to `vacancies` table (default: 'created')
- `server/api/vacancies/[id].put.ts` - Ensure status can be updated
- `server/api/generations/index.post.ts` - Auto-update vacancy status to 'generated' on first generation

### `apps/site/layers/vacancy/`

- `app/pages/vacancies/[id].vue` - Convert to layout wrapper with header
- `app/pages/vacancies/[id]/index.vue` - Redirect to overview
- `app/pages/vacancies/[id]/overview.vue` - New overview page
- `app/pages/vacancies/[id]/resume.vue` - Resume editing with auto-save
- `app/pages/vacancies/[id]/cover.vue` - Placeholder
- `app/pages/vacancies/[id]/preparation.vue` - Placeholder
- `app/components/VacancyDetailHeader.vue` - New header component
- `app/components/VacancyStatusBadge.vue` - Status badge with colors
- `app/composables/useVacancyGeneration.ts` - Auto-save composable for generation editing

### `apps/site/i18n/locales`

- `en.json` - Add new i18n keys

## Acceptance Criteria

1. **Routing**
   - [ ] Direct access to `/vacancies/[id]` redirects to `/vacancies/[id]/overview`
   - [ ] All four sub-pages are accessible via URL
   - [ ] Browser back/forward works correctly

2. **Header/Navigation**
   - [ ] Breadcrumbs show: Vacancies / [Vacancy Title] / [Section]
   - [ ] First breadcrumb links to `/vacancies`
   - [ ] Second breadcrumb links to `/vacancies/[id]/overview`
   - [ ] Third breadcrumb shows current section (non-clickable)
   - [ ] Dropdown menu shows all four sections
   - [ ] Current section is highlighted in dropdown

3. **Overview Page**
   - [ ] Title shows "Company Name (position)" with position in smaller font
   - [ ] Edit and delete buttons (icon-only) in title row
   - [ ] Status badge displays with correct color
   - [ ] "Vacancy page" link only shows if URL exists
   - [ ] Match Score block only shows if generation exists
   - [ ] Notes block only shows if notes exist

4. **Resume Page**
   - [ ] Loads current generation content
   - [ ] Auto-save works with debounce
   - [ ] No header with Back/Cancel/Save
   - [ ] Undo/redo controls work

5. **Status Tracking**
   - [ ] New vacancies have status 'created'
   - [ ] First generation changes status to 'generated' (only from 'created')
   - [ ] Status can be manually changed
   - [ ] Status badge colors match spec

6. **Placeholder Pages**
   - [ ] Cover shows "Coming soon"
   - [ ] Preparation shows "Coming soon"

## Edge Cases

- **No generation exists**: Hide Match Score block, show "Generate Tailored Resume" button
- **Generation expired**: Still show on Resume page, but indicate expiry
- **Status already 'generated' or higher**: First generation doesn't change status
- **User navigates away during auto-save**: Debounce should complete or cancel gracefully
- **Network error on auto-save**: Show toast error, don't lose local changes

## Testing Plan

### Unit Tests

- `VacancyStatusSchema` validation
- Status badge color mapping
- Breadcrumb generation logic

### Integration Tests

- Vacancy status update via API
- Auto-transition from 'created' to 'generated' on first generation
- Auto-save debounce behavior

### E2E Tests

- Navigate through all sub-pages
- Generate resume and verify redirect
- Edit resume and verify auto-save
- Change vacancy status

## Clarifications

### Session 2026-02-04

- Q: How should users change the vacancy application status? → A: Click badge → dropdown with all statuses
- Q: Are there any invalid status transitions? → A: Any transition allowed, but dropdown shows only contextually valid options based on generation history
- Q: What should be the exact text for the cover letter button? → A: "Generate Cover Letter"
- Q: How should sub-page navigation behave on mobile? → A: Same dropdown menu as desktop
- Q: Should editing vacancy open in modal or inline? → A: Inline on Overview page (current behavior)

## Open Questions / NEEDS CLARIFICATION

1. ~~**Status Change UI**: Should status be changed via clicking the badge (dropdown) or separate UI control?~~ → Resolved: Click badge opens dropdown

2. ~~**Status Transitions**: Are there any invalid status transitions?~~ → Resolved: Any transition allowed, but dropdown shows contextually valid options (see Status Transition Rules)

3. ~~**Cover Letter Button Text**~~ → Resolved: "Generate Cover Letter"

4. ~~**Mobile Layout**~~ → Resolved: Same dropdown menu as desktop (responsive, no special mobile treatment)

5. ~~**Edit Vacancy Modal**~~ → Resolved: Inline editing on Overview page (preserves current behavior)
