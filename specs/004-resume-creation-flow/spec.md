# Resume Creation Flow Refactoring

> **Epic:** 004-resume-creation-flow
> **Status:** Specification (Complete)
> **Last updated:** 2026-02-01
> **Branch:** feature/004-new-resume-flow

---

## Overview

Major refactoring of the resume creation and editing flow. Changes the architecture from multiple resumes to a single resume with version history, consolidates shared components between resume and vacancy layers, introduces FlowCV-style A4 preview with deterministic pagination, and adds formatting settings.

### Current State (Problems)

1. **Wrong architecture**: Multiple base resumes in array (was intended for version history, misused for multiple resumes)
2. **Duplicate components**: Preview components exist in both resume and vacancy layers
3. **No formatting controls**: Users cannot adjust margins, font sizes, spacing
4. **Confusing pages**: `/resumes`, `/resumes/new`, `/resumes/[id]` - overly complex for single resume
5. **No undo/redo**: Users cannot revert recent changes
6. **Profile gate**: Blocking upload with "complete profile first" - poor UX

### Target State

1. **Single resume per user** with version history (max 10 versions, configurable)
2. **Shared components**: Form and Preview components in resume layer, used by vacancy layer
3. **FlowCV-style A4 preview**: Zoom-based scaling, deterministic block-based pagination
4. **Formatting settings**: Margins, font size, line height, block spacing (separate for ATS/Human)
5. **Unified page**: `/resume` (singular) with tabs and two-column layout
6. **Auto-save with undo/redo**: History stored in browser until page reload
7. **No profile blocking**: Allow upload/create without profile completion

---

## Goals

1. **Single resume architecture**: One resume per user with version history
2. **Component consolidation**: Shared Form and Preview between resume and vacancy layers
3. **FlowCV-style preview**: A4 pages with zoom scaling and deterministic pagination
4. **Formatting controls**: User-adjustable margins, font size, line height, spacing
5. **Simplified pages**: `/resume` replaces `/resumes/*`
6. **Auto-save with undo/redo**: Better editing UX
7. **Design versioning**: Prepare for future design variants (Design1, Design2, etc.)

---

## Non-Goals

- Version selector/rollback UI (backlog)
- Multiple design templates (backlog)
- AI Enhance functionality (placeholder only)
- Profile completeness enforcement
- Drag-and-drop reordering

---

## Architecture Changes

### 1. Single Resume with Version History

**Database Schema Changes:**

```sql
-- New table: resume_versions
CREATE TABLE resume_versions (
  id TEXT PRIMARY KEY,
  resume_id TEXT NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
  content JSON NOT NULL,           -- ResumeContent snapshot
  version_number INTEGER NOT NULL, -- 1, 2, 3, ...
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(resume_id, version_number)
);

-- Modified: resumes table
-- Remove: Multiple resume support per user
-- Add: ats_settings JSON, human_settings JSON
ALTER TABLE resumes ADD COLUMN ats_settings JSON;
ALTER TABLE resumes ADD COLUMN human_settings JSON;
```

**Version History Logic:**

- On save: Create new version, increment version_number
- Keep max N versions (configurable via `runtimeConfig.resume.maxVersions`, default 10)
- Prune oldest versions when limit exceeded
- Version selector UI is backlog (not this epic)

**Zod Schemas (`packages/schema/`):**

```typescript
// New: ResumeFormatSettings
export const ResumeFormatSettingsSchema = z.object({
  margins: z.number().min(10).max(26).default(20), // mm
  fontSize: z.number().min(9).max(13).default(12), // pt
  lineHeight: z.number().min(1.1).max(1.5).default(1.2),
  blockSpacing: z.number().min(1).max(9).default(5) // 1 = lineHeight, 9 = lineHeight * 2.5
});

export type ResumeFormatSettings = z.infer<typeof ResumeFormatSettingsSchema>;

// Updated: Resume entity
export const ResumeSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  title: z.string(),
  content: ResumeContentSchema,
  atsSettings: ResumeFormatSettingsSchema.optional(),
  humanSettings: ResumeFormatSettingsSchema.optional(),
  sourceFileName: z.string(),
  sourceFileType: SourceFileTypeSchema,
  createdAt: z.date(),
  updatedAt: z.date()
});
```

### 2. Component Architecture

**Shared Components (resume layer → used by vacancy layer):**

```
apps/site/layers/resume/app/components/
├── Form/                    # Resume editor form (shared)
│   ├── index.vue
│   ├── Actions.vue
│   └── section/
│       ├── PersonalInfo.vue
│       ├── Summary.vue
│       ├── Experience.vue
│       ├── ExperienceEntry.vue
│       ├── Education.vue
│       ├── EducationEntry.vue
│       ├── Skills.vue
│       ├── SkillGroup.vue
│       ├── Certifications.vue
│       ├── CertificationEntry.vue
│       ├── Languages.vue
│       ├── LanguageEntry.vue
│       ├── CustomSections.vue
│       └── CustomSectionEntry.vue
│
├── Preview/                 # A4 Preview (shared)
│   ├── index.vue            # Main preview orchestrator
│   ├── PaperSheet.vue       # A4 container with zoom scaling
│   ├── Paginator.vue        # Block-based pagination
│   ├── AtsView/
│   │   └── Design1.vue      # ATS design variant 1
│   ├── HumanView/
│   │   └── Design1.vue      # Human design variant 1
│   └── section/             # Shared section renderers
│       ├── PersonalInfo.vue
│       ├── Summary.vue
│       ├── Experience.vue
│       ├── Education.vue
│       ├── Skills.vue
│       ├── Certifications.vue
│       ├── Languages.vue
│       └── CustomSections.vue
│
├── Upload/                  # Upload form (reusable)
│   └── index.vue            # Dropzone + "Create manual" button
│
├── Settings/                # Formatting settings
│   └── index.vue            # Margins, font size, line height, spacing
│
└── EditorLayout.vue         # Two-column layout container
```

**Vacancy layer uses resume components:**

```vue
<!-- apps/site/layers/vacancy/app/pages/vacancies/[id].vue -->
<template>
  <ResumeEditorLayout>
    <template #left>
      <!-- Vacancy info + generation controls -->
      <ResumeForm v-model="generation.content" />
    </template>
    <template #right>
      <ResumePreview :content="generation.content" :type="previewType" :settings="settings" />
    </template>
  </ResumeEditorLayout>
</template>
```

### 3. FlowCV-Style A4 Preview

**Requirements:**

- Fixed A4 pages (210mm × 297mm)
- Zoom-based scaling (no content reflow)
- Deterministic block-based pagination
- "Keep with next" rules for section headings and experience headers

**Implementation Approach:**

```typescript
// composables/useResumeBlocks.ts
// Converts ResumeContent to flat BlockModel[] for pagination

type BlockKind =
  | 'section-heading'
  | 'personal-info'
  | 'summary-paragraph'
  | 'experience-header'
  | 'experience-description'
  | 'experience-bullet'
  | 'education-entry'
  | 'skill-group'
  | 'certification-entry'
  | 'language-entry'
  | 'custom-section-item';

interface BlockModel {
  id: string;
  kind: BlockKind;
  section: string;
  keepWithNext?: number; // How many following blocks to keep together
  splittable?: boolean; // Can this block be split across pages?
  payload: unknown; // Actual content data
}

// composables/usePaginator.ts
// Greedy packs blocks into pages by measured height

interface PageModel {
  index: number;
  blocks: BlockModel[];
}

// composables/usePageScale.ts
// Calculates zoom scale based on container width
// scale = min(1, containerWidth / pageWidthPx)
```

**CSS Variables:**

```scss
:root {
  --page-w: 210mm;
  --page-h: 297mm;
  --page-pad: 20mm; // Configurable via settings
}

.resume-page {
  width: var(--page-w);
  height: var(--page-h);
  padding: var(--page-pad);
  background: white;
  box-sizing: border-box;
}

.resume-scale-wrapper {
  transform: scale(var(--scale));
  transform-origin: top left;
}
```

---

## User Flows

### Flow 1: New User - First Resume

```
User registers / logs in
  → Redirect to /resume
  → No resume exists → Show upload form
  → Options:
    A) Upload DOCX/PDF file
       → Parse via LLM → Create resume with content
       → Show editor (two-column layout)
    B) Click "Create manual"
       → Create resume with empty ResumeContent
       → Show editor (two-column layout)
  → NO profile completion blocking
```

### Flow 2: Existing User - Edit Resume

```
User navigates to /resume
  → Resume exists → Show two-column layout

Desktop Layout:
┌─────────────────────────────────────────────────────────┐
│ Header: [Upload new file] [Download ▼]                  │
├──────────────────────┬──────────────────────────────────┤
│ Left Column (40%)    │ Right Column (60%)               │
│                      │                                  │
│ [Content] [Settings] │ ┌──────────────────────────────┐ │
│ [AI Enhance]         │ │                              │ │
│                      │ │     A4 Preview               │ │
│ ┌──────────────────┐ │ │     (zoom-scaled)            │ │
│ │                  │ │ │                              │ │
│ │  Form / Settings │ │ │     Page 1                   │ │
│ │  (scrollable)    │ │ │                              │ │
│ │                  │ │ │                              │ │
│ └──────────────────┘ │ │                              │ │
│                      │ └──────────────────────────────┘ │
│ [← Undo] [Redo →]    │                                  │
└──────────────────────┴──────────────────────────────────┘

Mobile Layout:
┌─────────────────────┐
│ Header              │
├─────────────────────┤
│ [Content] [Settings]│
│ [AI Enhance]        │
├─────────────────────┤
│                     │
│  Form / Settings    │
│  (full width)       │
│                     │
├─────────────────────┤
│ [← Undo] [Redo →]   │
└─────────────────────┘
         [👁 Preview] ← Float button (bottom-right)

Preview Overlay (mobile):
┌─────────────────────┐
│ [Download] [✕ Close]│
├─────────────────────┤
│                     │
│   A4 Preview        │
│   (full screen)     │
│                     │
└─────────────────────┘
```

### Flow 3: Upload New File (Replace Resume)

```
User on /resume with existing resume
  → Click "Upload new file" button
  → Modal opens with upload dropzone
  → User uploads DOCX/PDF
  → Parse via LLM
  → Overwrite current resume content (creates new version)
  → Close modal, show updated editor
```

### Flow 4: Settings Tab

```
User clicks "Settings" tab
  → Show:
    1. Resume type toggle: [ATS] [Human]
    2. "Base layout settings" heading
    3. Selectors:
       - Margins: 10, 12, 14, 16, 18, 20, 22, 24, 26 mm (default 20)
       - Font Size: 9, 9.5, 10, 10.5, 11, 11.5, 12, 12.5, 13 pt (default 12)
       - Line Height: 1.1 to 1.5, step 0.05 (default 1.2)
       - Block Spacing: 1-9 (default 5)
  → Changes auto-save to atsSettings or humanSettings
  → Preview updates in real-time
```

### Flow 5: Vacancy - Generate & Edit

```
User on /vacancies/[id] after successful generation
  → Two-column layout (same as /resume)

Left Column (40%):
  - Vacancy info (company, position, description)
  - [Edit vacancy] button → expand form
  - [Edit resume] button → expand ResumeForm for generation.content
  - Generation metadata (scores, date, expiration)

Right Column (60%):
  - Preview toggle: [ATS] [Human]
  - A4 Preview of generated resume
  - [Download PDF] button

Mobile: Same pattern as /resume (float button for preview overlay)

Edit resume:
  → Opens ResumeForm with generation.content
  → Changes saved directly to generation.content (no copy)
  → Auto-save with undo/redo
```

---

## Pages

### Removed Pages

- `/resumes` → Removed
- `/resumes/new` → Removed
- `/resumes/[id]` → Removed

### New / Modified Pages

| Route                   | Component            | Description                                    |
| ----------------------- | -------------------- | ---------------------------------------------- |
| `/resume`               | ResumeEditorPage     | Single resume page with upload/editor/settings |
| `/vacancies/[id]`       | VacancyDetailPage    | Enhanced: two-column layout after generation   |
| `/vacancies/[id]/ats`   | VacancyAtsViewPage   | Keep (SSR for SEO)                             |
| `/vacancies/[id]/human` | VacancyHumanViewPage | Keep (SSR for SEO)                             |

---

## State Management

### Resume Store (`apps/site/layers/resume/app/stores/index.ts`)

```typescript
interface ResumeStoreState {
  // Current resume
  resume: Resume | null;

  // Editing state
  editingContent: ResumeContent | null;
  previewType: 'ats' | 'human';
  atsSettings: ResumeFormatSettings;
  humanSettings: ResumeFormatSettings;

  // Undo/redo history (browser-only, cleared on page reload)
  history: ResumeContent[];
  historyIndex: number;

  // UI state
  isSaving: boolean;
  saveError: Error | null;
  activeTab: 'content' | 'settings' | 'ai-enhance';
}

// Actions
- fetchResume(): Load user's resume (or null if none)
- createResume(content): Create new resume (upload or manual)
- updateContent(content): Update content + push to history + auto-save
- undo(): Move historyIndex back
- redo(): Move historyIndex forward
- updateSettings(type, settings): Update ats/human settings + auto-save
- uploadNewFile(file): Parse + overwrite content

// Getters
- currentContent: editingContent || resume?.content
- currentSettings: previewType === 'ats' ? atsSettings : humanSettings
- canUndo: historyIndex > 0
- canRedo: historyIndex < history.length - 1
- hasResume: resume !== null
```

### Vacancy Store (Enhanced)

```typescript
// Add to existing vacancy store
interface VacancyStoreState {
  // ... existing state ...

  // Generation editing
  editingGenerationContent: ResumeContent | null;
  generationHistory: ResumeContent[];
  generationHistoryIndex: number;
}

// Actions
- updateGenerationContent(content): Update generation.content + history + auto-save
- undoGeneration(): Move historyIndex back
- redoGeneration(): Move historyIndex forward
```

---

## API Changes

### Modified Endpoints

**GET /api/resumes/:id**

- Returns the requested resume for the authenticated user (or 404 if not found/not owned)
- Include atsSettings, humanSettings

**POST /api/resumes**

- Create a resume
- Body: `{ content: ResumeContent }` or multipart file upload

**PUT /api/resumes/:id**

- Update a specific resume content and/or title
- Creates version entry when content changes
- Body: `{ content?, title? }`

**PUT /api/vacancies/[id]/generation** (modified)

- Update generation content directly
- Body: `{ content: ResumeContent }`

### Removed Legacy Endpoints

- Legacy singular resume API routes (`GET/POST/PUT`) were removed in favor of `/api/resumes/*`

### Runtime Config

```typescript
// nuxt.config.ts
runtimeConfig: {
  resume: {
    maxVersions: 10, // Max version history entries per resume
  },
}
```

---

## PDF Export

### Current: Playwright (Server-Side)

Pros:

- Server caching
- No browser bundle size
- Works for SSR pages

Cons:

- May render differently than browser preview
- Font loading differences
- CSS zoom/transform may differ

### Alternative: Browser-Based (html2canvas + jsPDF)

Pros:

- WYSIWYG - exact match to preview
- No server load

Cons:

- Larger bundle
- No server caching
- Browser compatibility

**Decision:** Start with Playwright, ensure HTML/CSS matches preview. If fidelity issues arise, switch to browser-based.

---

## i18n Keys

Add to `packages/nuxt-layer-ui/i18n/locales/en.json`:

```json
{
  "resume": {
    "page": {
      "title": "My Resume",
      "uploadTitle": "Create Your Resume",
      "uploadDescription": "Upload an existing resume or create one from scratch",
      "uploadButton": "Upload Resume",
      "createManualButton": "Create from scratch",
      "uploadNewButton": "Upload new file",
      "downloadButton": "Download PDF"
    },
    "tabs": {
      "content": "Content",
      "settings": "Settings",
      "aiEnhance": "AI Enhance"
    },
    "settings": {
      "title": "Layout Settings",
      "previewType": "Preview Type",
      "ats": "ATS",
      "human": "Human",
      "margins": "Margins",
      "fontSize": "Font Size",
      "lineHeight": "Line Height",
      "blockSpacing": "Block Spacing"
    },
    "aiEnhance": {
      "comingSoon": "Coming Soon",
      "description": "AI-powered suggestions to improve your resume"
    },
    "history": {
      "undo": "Undo",
      "redo": "Redo"
    },
    "upload": {
      "modalTitle": "Upload New Resume",
      "dropzone": "Drag & drop your resume here",
      "or": "or",
      "browse": "Browse files",
      "supported": "Supported formats: DOCX, PDF",
      "uploading": "Uploading...",
      "parsing": "Parsing resume...",
      "success": "Resume uploaded successfully",
      "error": "Failed to upload resume"
    },
    "preview": {
      "mobileButton": "Preview",
      "close": "Close"
    }
  },
  "vacancy": {
    "detail": {
      "editResume": "Edit Resume",
      "editVacancy": "Edit Vacancy"
    }
  }
}
```

---

## Acceptance Criteria

1. ✅ Single resume per user (no multiple resumes)
2. ✅ Version history created on each save (max 10)
3. ✅ `/resume` page replaces `/resumes/*`
4. ✅ New user sees upload form + "Create from scratch" button
5. ✅ Two-column layout: 40% form/settings, 60% preview
6. ✅ Tabs: Content, Settings, AI Enhance (placeholder)
7. ✅ Settings: margins, font size, line height, block spacing
8. ✅ Settings stored separately for ATS and Human
9. ✅ Mobile: float button opens preview overlay
10. ✅ "Upload new file" overwrites current resume
11. ✅ Auto-save with debounce
12. ✅ Undo/redo arrows (history in browser store)
13. ✅ A4 preview with zoom scaling (no content reflow)
14. ✅ Block-based pagination with "keep-with-next" rules
15. ✅ AtsView/HumanView named as Design1 for future variants
16. ✅ Vacancy page: two-column layout after generation
17. ✅ Vacancy: "Edit resume" button for generation content
18. ✅ Generation edits saved to generation.content directly
19. ✅ PDF download matches preview appearance
20. ✅ No profile completion blocking

---

## Edge Cases

1. **First visit with no resume**: Show upload/create form, not error
2. **Upload replaces content**: Warn user, confirm overwrite
3. **Large resume (many entries)**: Pagination handles multi-page gracefully
4. **Undo after page reload**: History lost, no undo available
5. **Concurrent edits**: Last-write-wins (no conflict resolution)
6. **Network failure during save**: Show error, retry button, keep local state
7. **Invalid content after parse**: Normalization layer fixes common issues

---

## Testing Plan

### Unit Tests

- `useResumeBlocks`: Correct block generation from ResumeContent
- `usePaginator`: Correct page splitting with keep-with-next rules
- `usePageScale`: Correct scale calculation
- `ResumeFormatSettingsSchema`: Validation of settings values
- Store: undo/redo logic, history management

### Integration Tests

- Upload flow: file → parse → display
- Save flow: edit → auto-save → version created
- Settings flow: change → preview update → persist
- Vacancy generation edit flow

### E2E Tests

- New user: upload → edit → save → refresh → data persists
- Settings: change margins → preview updates → PDF matches
- Mobile: float button → overlay → close
- Vacancy: generate → edit → save → verify content

---

## Implementation Phases

```
Phase 1: Schema & API Changes
├── Add ResumeFormatSettings schema
├── Add resume_versions table
├── Modify resumes table (add settings)
├── Create /api/resumes endpoints
├── Add runtimeConfig.resume.maxVersions

Phase 2: A4 Preview System
├── useResumeBlocks composable
├── usePaginator composable
├── usePageScale composable
├── PaperSheet component
├── Paginator component
├── AtsView/Design1, HumanView/Design1

Phase 3: Resume Page
├── /resume page (replaces /resumes/*)
├── EditorLayout component
├── Settings component
├── Upload modal component
├── Undo/redo UI

Phase 4: Store & Auto-save
├── Resume store enhancements
├── History management (undo/redo)
├── Auto-save with debounce
├── Settings persistence

Phase 5: Vacancy Page Enhancement
├── Two-column layout
├── Edit resume button
├── Generation content editing
├── Preview integration

Phase 6: Mobile & Polish
├── Float preview button
├── Preview overlay
├── Responsive adjustments
├── i18n keys
├── PDF export verification
```

---

## Summary

This epic transforms the resume editing experience from a complex multi-page flow to a streamlined single-page editor. Key architectural changes include:

1. **Single resume with versions** - Simpler mental model, version history for safety
2. **Shared components** - Form and Preview consolidated in resume layer
3. **FlowCV-style preview** - Professional A4 rendering with zoom scaling
4. **User-configurable formatting** - Margins, fonts, spacing
5. **Auto-save with undo/redo** - Modern editing UX
6. **Design versioning** - Foundation for future template variants

The changes affect both the resume layer (major refactoring) and vacancy layer (moderate changes to use shared components and add editing capabilities).
