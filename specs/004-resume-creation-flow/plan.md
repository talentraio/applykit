# Implementation Plan: Resume Creation Flow Refactoring

> **Epic:** 004-resume-creation-flow
> **Branch:** feature/004-new-resume-flow
> **Spec:** [spec.md](./spec.md)
> **Last updated:** 2026-02-01

---

## Technical Context

### Technologies

| Technology        | Version | Purpose           |
| ----------------- | ------- | ----------------- |
| Nuxt              | 4.x     | App framework     |
| Vue               | 3.x     | UI framework      |
| Pinia             | 2.x     | State management  |
| Drizzle ORM       | latest  | Database          |
| SQLite/PostgreSQL | -       | Storage           |
| Zod               | 3.x     | Schema validation |
| VueUse            | latest  | Composables       |
| NuxtUI            | 4.x     | UI components     |

### Dependencies

- `packages/schema/` (@int/schema) - Zod schemas
- `packages/nuxt-layer-api/` (@int/api) - API layer
- `packages/nuxt-layer-ui/` (@int/ui) - UI layer
- `apps/site/layers/resume/` (@site/resume) - Resume layer
- `apps/site/layers/vacancy/` (@site/vacancy) - Vacancy layer

### Key Decisions

| Decision                                 | Rationale                                                  |
| ---------------------------------------- | ---------------------------------------------------------- |
| Separate `resume_versions` table         | Better queryability, easier pruning, no JSON bloat         |
| Version history in Pinia store (browser) | Simple undo/redo without server roundtrips                 |
| Block-based pagination                   | Deterministic, server-renderable, "keep-with-next" rules   |
| CSS zoom scaling (not responsive)        | Exact PDF match, no content reflow                         |
| Playwright for PDF (initially)           | Server caching, switch to browser-based if fidelity issues |

---

## Constitution Check

### Architectural Principles

- ✅ Single resume per user (explicit data model)
- ✅ Version history in separate table (normalized)
- ✅ Shared components in resume layer (DRY)
- ✅ Pinia store for client state
- ✅ Zod validation for all schemas
- ✅ No profile blocking (UX improvement)

### Code Style Compliance

- ✅ Component decomposition (Form/, Preview/, Upload/, Settings/)
- ✅ BEM naming with layer prefix
- ✅ Tailwind-first + SCSS for complex styles
- ✅ No `any` types, strict TypeScript
- ✅ i18n for all user-facing strings
- ✅ VueUse for composables where applicable

---

## Phase 1: Schema & Database

### 1.1 Zod Schemas

**File:** `packages/schema/schemas/resume.ts`

Add `ResumeFormatSettingsSchema`:

```typescript
export const ResumeFormatSettingsSchema = z.object({
  margins: z.number().min(10).max(26).default(20),
  fontSize: z.number().min(9).max(13).default(12),
  lineHeight: z.number().min(1.1).max(1.5).default(1.2),
  blockSpacing: z.number().min(1).max(9).default(5)
});

export type ResumeFormatSettings = z.infer<typeof ResumeFormatSettingsSchema>;
```

Update `ResumeSchema` to include optional `atsSettings` and `humanSettings`.

### 1.2 Database Migration

**File:** `packages/nuxt-layer-api/server/data/migrations/002_resume_versions.sql`

```sql
-- Add settings columns to resumes
ALTER TABLE resumes ADD COLUMN ats_settings TEXT;
ALTER TABLE resumes ADD COLUMN human_settings TEXT;

-- Create resume_versions table
CREATE TABLE resume_versions (
  id TEXT PRIMARY KEY,
  resume_id TEXT NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  version_number INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(resume_id, version_number)
);

CREATE INDEX idx_resume_versions_resume_id ON resume_versions(resume_id);
```

### 1.3 Drizzle Schema

**File:** `packages/nuxt-layer-api/server/data/schema.ts`

Add `resumeVersions` table and update `resumes` table.

### 1.4 Repository

**File:** `packages/nuxt-layer-api/server/data/repositories/resume-version.ts`

```typescript
// Functions:
// - createVersion(resumeId, content): Create new version, prune old
// - getVersions(resumeId): List all versions
// - getLatestVersion(resumeId): Get most recent version
// - pruneOldVersions(resumeId, maxVersions): Remove oldest versions
```

### 1.5 Runtime Config

**File:** `packages/nuxt-layer-api/nuxt.config.ts`

```typescript
runtimeConfig: {
  resume: {
    maxVersions: 10,
  },
}
```

---

## Phase 2: API Endpoints

### 2.1 New Singular Endpoints

**GET /api/resume**

- File: `packages/nuxt-layer-api/server/api/resume/index.get.ts`
- Returns user's single resume (or 404)
- Include atsSettings, humanSettings

**POST /api/resume**

- File: `packages/nuxt-layer-api/server/api/resume/index.post.ts`
- Create resume (multipart file upload or JSON body)
- 400 if resume already exists

**PUT /api/resume**

- File: `packages/nuxt-layer-api/server/api/resume/index.put.ts`
- Update content/settings
- Creates version entry
- Prunes old versions

### 2.2 Generation Update

**PUT /api/vacancies/[id]/generation**

- File: `packages/nuxt-layer-api/server/api/vacancies/[id]/generation.put.ts`
- Update generation content directly
- Body: `{ content: ResumeContent }`

### 2.3 Deprecate Old Endpoints

Add deprecation headers and redirect logic to `/api/resumes/*` endpoints.

---

## Phase 3: A4 Preview System

### 3.1 Composables

**useResumeBlocks**

- File: `apps/site/layers/resume/app/composables/useResumeBlocks.ts`
- Converts ResumeContent to BlockModel[]
- Block kinds: section-heading, personal-info, summary-paragraph, experience-header, experience-bullet, etc.
- Sets keepWithNext rules

**usePaginator**

- File: `apps/site/layers/resume/app/composables/usePaginator.ts`
- Greedy packs blocks into pages
- Respects keepWithNext constraints
- Returns PageModel[]

**usePageScale**

- File: `apps/site/layers/resume/app/composables/usePageScale.ts`
- Calculates zoom scale: min(1, containerWidth / pageWidthPx)
- Uses ResizeObserver (VueUse)

**useBlockMeasurer**

- File: `apps/site/layers/resume/app/composables/useBlockMeasurer.ts`
- Measures block heights in offscreen container
- Returns heights by block.id

### 3.2 Preview Components

**PaperSheet.vue** (refactored)

- File: `apps/site/layers/resume/app/components/Preview/PaperSheet.vue`
- A4 container with zoom scaling
- CSS variables for dimensions
- Multi-page support

**Paginator.vue**

- File: `apps/site/layers/resume/app/components/Preview/Paginator.vue`
- Renders pages from PageModel[]
- Handles block rendering

**Preview/index.vue** (refactored)

- File: `apps/site/layers/resume/app/components/Preview/index.vue`
- Orchestrates blocks → paginator → pages
- Props: content, type ('ats'|'human'), settings

**AtsView/Design1.vue**

- File: `apps/site/layers/resume/app/components/Preview/AtsView/Design1.vue`
- ATS design variant 1
- Simple, text-focused layout

**HumanView/Design1.vue**

- File: `apps/site/layers/resume/app/components/Preview/HumanView/Design1.vue`
- Human design variant 1
- Visual, styled layout

### 3.3 Move Components from Vacancy

Move from `apps/site/layers/vacancy/app/components/resume/`:

- `AtsView.vue` → `apps/site/layers/resume/app/components/Preview/AtsView/Design1.vue`
- `HumanView.vue` → `apps/site/layers/resume/app/components/Preview/HumanView/Design1.vue`
- `PaperSheet.vue` → refactor into new PaperSheet

Delete vacancy layer duplicates after migration.

---

## Phase 4: Resume Page

### 4.1 Page Structure

**Delete old pages:**

- `apps/site/layers/resume/app/pages/resumes/index.vue`
- `apps/site/layers/resume/app/pages/resumes/new.vue`
- `apps/site/layers/resume/app/pages/resumes/[id].vue`

**Create new page:**

- File: `apps/site/layers/resume/app/pages/resume.vue`

**Page states:**

1. No resume → Upload/Create form
2. Has resume → Two-column editor layout

### 4.2 Layout Components

**EditorLayout.vue**

- File: `apps/site/layers/resume/app/components/EditorLayout.vue`
- Two-column layout (40% / 60%)
- Independent scrolling
- Responsive: stacks on mobile

**Slots:**

- `#header` - Upload/Download buttons
- `#left` - Form/Settings/AI Enhance
- `#right` - Preview (desktop only)
- `#footer` - Undo/Redo controls

### 4.3 Tab Components

**TabContent** - Form editor (existing Form/)
**TabSettings** - Settings component (new)
**TabAIEnhance** - Placeholder "Coming Soon"

### 4.4 Settings Component

**File:** `apps/site/layers/resume/app/components/Settings/index.vue`

- Preview type toggle (ATS/Human)
- Margins selector (10-26mm)
- Font Size selector (9-13pt)
- Line Height selector (1.1-1.5)
- Block Spacing selector (1-9)

### 4.5 Upload Component

**File:** `apps/site/layers/resume/app/components/Upload/index.vue`

- Dropzone for file upload
- "Create from scratch" button
- Reusable for both first upload and "Upload new file" modal

### 4.6 Upload Modal

**File:** `apps/site/layers/resume/app/components/UploadModal.vue`

- Uses Upload component
- Modal wrapper for replacing existing resume

### 4.7 Mobile Preview

**PreviewFloatButton.vue**

- File: `apps/site/layers/resume/app/components/PreviewFloatButton.vue`
- Floating action button (bottom-right)
- Opens preview overlay

**PreviewOverlay.vue**

- File: `apps/site/layers/resume/app/components/PreviewOverlay.vue`
- Full-screen preview
- Download + Close buttons

---

## Phase 5: Store & Auto-save

### 5.1 Resume Store Enhancements

**File:** `apps/site/layers/resume/app/stores/index.ts`

```typescript
interface ResumeStoreState {
  // Data
  resume: Resume | null;
  editingContent: ResumeContent | null;

  // Settings
  previewType: 'ats' | 'human';
  atsSettings: ResumeFormatSettings;
  humanSettings: ResumeFormatSettings;

  // Undo/Redo
  history: ResumeContent[];
  historyIndex: number;

  // UI
  isSaving: boolean;
  saveError: Error | null;
  activeTab: 'content' | 'settings' | 'ai-enhance';
}
```

**Actions:**

- `fetchResume()` - Load user's resume
- `createResume(content, file?)` - Create new
- `updateContent(content)` - Update + push history + auto-save
- `undo()` - Revert to previous history state
- `redo()` - Move forward in history
- `updateSettings(type, settings)` - Update ATS/Human settings
- `uploadNewFile(file)` - Parse + overwrite content

**Auto-save:**

- Debounced (500ms after last change)
- Uses `watchDebounced` from VueUse
- Calls `PUT /api/resume`

### 5.2 Vacancy Store Enhancements

**File:** `apps/site/layers/vacancy/app/stores/index.ts`

Add generation editing state:

```typescript
// Add to existing state
editingGenerationContent: ResumeContent | null;
generationHistory: ResumeContent[];
generationHistoryIndex: number;

// Add actions
updateGenerationContent(content)
undoGeneration()
redoGeneration()
```

---

## Phase 6: Vacancy Page Enhancement

### 6.1 Two-Column Layout

**File:** `apps/site/layers/vacancy/app/pages/vacancies/[id]/index.vue`

After successful generation:

- Use ResumeEditorLayout from resume layer
- Left column: Vacancy info + Generation controls + Edit buttons
- Right column: Preview (ATS/Human toggle)

### 6.2 Edit Buttons

- "Edit Vacancy" - Expand vacancy form
- "Edit Resume" - Expand ResumeForm with generation.content

### 6.3 Undo/Redo for Generation

Add undo/redo controls when editing generation content.

### 6.4 Mobile Support

Same pattern as /resume page:

- Float button for preview
- Preview overlay

---

## Phase 7: Mobile & Polish

### 7.1 Responsive Adjustments

- EditorLayout: stack on mobile (<1024px)
- Hide preview column on mobile
- Show float button on mobile
- Full-screen preview overlay

### 7.2 i18n Keys

Add all keys from spec.md to `packages/nuxt-layer-ui/i18n/locales/en.json`.

### 7.3 PDF Export Verification

- Test Playwright PDF matches preview
- If fidelity issues, plan browser-based fallback

### 7.4 Navigation Updates

Update navigation:

- `/resumes` → `/resume` redirect
- Dashboard links update

---

## File Summary

### New Files

| Path                                                                     | Purpose                     |
| ------------------------------------------------------------------------ | --------------------------- |
| `packages/schema/schemas/resume-settings.ts`                             | ResumeFormatSettings schema |
| `packages/nuxt-layer-api/server/data/migrations/002_resume_versions.sql` | DB migration                |
| `packages/nuxt-layer-api/server/data/repositories/resume-version.ts`     | Version repository          |
| `packages/nuxt-layer-api/server/api/resume/index.get.ts`                 | GET /api/resume             |
| `packages/nuxt-layer-api/server/api/resume/index.post.ts`                | POST /api/resume            |
| `packages/nuxt-layer-api/server/api/resume/index.put.ts`                 | PUT /api/resume             |
| `packages/nuxt-layer-api/server/api/vacancies/[id]/generation.put.ts`    | PUT generation              |
| `apps/site/layers/resume/app/composables/useResumeBlocks.ts`             | Block conversion            |
| `apps/site/layers/resume/app/composables/usePaginator.ts`                | Pagination logic            |
| `apps/site/layers/resume/app/composables/usePageScale.ts`                | Zoom scaling                |
| `apps/site/layers/resume/app/composables/useBlockMeasurer.ts`            | Block measurement           |
| `apps/site/layers/resume/app/components/EditorLayout.vue`                | Two-column layout           |
| `apps/site/layers/resume/app/components/Settings/index.vue`              | Format settings             |
| `apps/site/layers/resume/app/components/Upload/index.vue`                | Upload dropzone             |
| `apps/site/layers/resume/app/components/UploadModal.vue`                 | Upload modal                |
| `apps/site/layers/resume/app/components/PreviewFloatButton.vue`          | Mobile float button         |
| `apps/site/layers/resume/app/components/PreviewOverlay.vue`              | Mobile preview overlay      |
| `apps/site/layers/resume/app/components/Preview/Paginator.vue`           | Page renderer               |
| `apps/site/layers/resume/app/components/Preview/AtsView/Design1.vue`     | ATS design                  |
| `apps/site/layers/resume/app/components/Preview/HumanView/Design1.vue`   | Human design                |
| `apps/site/layers/resume/app/pages/resume.vue`                           | Main resume page            |

### Modified Files

| Path                                                            | Changes                   |
| --------------------------------------------------------------- | ------------------------- |
| `packages/schema/schemas/resume.ts`                             | Add settings to schema    |
| `packages/schema/index.ts`                                      | Export new types          |
| `packages/nuxt-layer-api/server/data/schema.ts`                 | Add resume_versions table |
| `packages/nuxt-layer-api/nuxt.config.ts`                        | Add runtimeConfig         |
| `apps/site/layers/resume/app/stores/index.ts`                   | Add undo/redo, settings   |
| `apps/site/layers/resume/app/components/Preview/index.vue`      | Refactor for pagination   |
| `apps/site/layers/resume/app/components/Preview/PaperSheet.vue` | Refactor for zoom         |
| `apps/site/layers/vacancy/app/stores/index.ts`                  | Add generation editing    |
| `apps/site/layers/vacancy/app/pages/vacancies/[id]/index.vue`   | Two-column layout         |
| `packages/nuxt-layer-ui/i18n/locales/en.json`                   | Add i18n keys             |

### Deleted Files

| Path                                                            | Reason                |
| --------------------------------------------------------------- | --------------------- |
| `apps/site/layers/resume/app/pages/resumes/index.vue`           | Replaced by /resume   |
| `apps/site/layers/resume/app/pages/resumes/new.vue`             | Replaced by /resume   |
| `apps/site/layers/resume/app/pages/resumes/[id].vue`            | Replaced by /resume   |
| `apps/site/layers/vacancy/app/components/resume/AtsView.vue`    | Moved to resume layer |
| `apps/site/layers/vacancy/app/components/resume/HumanView.vue`  | Moved to resume layer |
| `apps/site/layers/vacancy/app/components/resume/PaperSheet.vue` | Moved to resume layer |

---

## Execution Order

```
Phase 1: Schema & Database (blocking)
  ↓
Phase 2: API Endpoints (blocking)
  ↓
Phase 3: A4 Preview System (can parallel with Phase 4)
  ↓
Phase 4: Resume Page
  ↓
Phase 5: Store & Auto-save
  ↓
Phase 6: Vacancy Page Enhancement
  ↓
Phase 7: Mobile & Polish
```

### Parallel Opportunities

- Phase 3 (Preview) and Phase 4 (Resume Page) can be developed in parallel
- i18n keys can be added incrementally with each phase
- Settings component can be developed while preview is being built

---

## Risks & Mitigations

| Risk                                 | Mitigation                                   |
| ------------------------------------ | -------------------------------------------- |
| Block measurement performance        | Batch measurements, cache results            |
| PDF fidelity issues                  | Fallback to browser-based PDF if needed      |
| Complex pagination edge cases        | Thorough testing with various resume lengths |
| Breaking changes to existing resumes | Migration script to handle existing data     |
| Mobile UX complexity                 | Progressive enhancement, desktop-first       |

---

## Success Criteria

1. User can upload/create single resume on `/resume`
2. Two-column editor with live A4 preview
3. Settings tab controls format (margins, fonts, spacing)
4. Undo/redo works within session
5. Auto-save persists changes
6. Vacancy page shows two-column layout after generation
7. Mobile shows float button and preview overlay
8. PDF download matches preview appearance
9. No profile blocking on resume creation
10. All tests pass (unit, integration, e2e)
