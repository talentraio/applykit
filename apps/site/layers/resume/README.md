# Resume Layer

Resume management layer for the site app.

## Overview

This layer handles all resume-related functionality including upload, parsing, editing, and management of user resumes.

## Structure

```
resume/
├── app/
│   ├── components/
│   │   ├── ResumeUploader.vue      # File upload component
│   │   └── ResumeJsonEditor.vue    # JSON editor component
│   ├── composables/
│   │   └── useResumes.ts           # Resumes composable
│   ├── infrastructure/
│   │   └── resume.api.ts           # Resume API client
│   ├── pages/
│   │   └── resumes/
│   │       ├── index.vue           # Resume list page
│   │       ├── new.vue             # Upload page
│   │       └── [id].vue            # Resume detail/edit page
│   └── stores/
│       └── index.ts                # useResumeStore
└── nuxt.config.ts
```

## Features

- Resume upload (PDF, DOCX)
- Resume parsing via LLM
- Resume list with filtering
- Resume editing (JSON editor)
- Resume CRUD operations
- SSR-compatible data fetching

## Usage

```typescript
// In components
const { resumes, current, loading, error, uploadResume, fetchResumes } = useResume();

// Upload resume
await uploadResume(file, 'My Resume');

// Fetch all resumes
await fetchResumes();

// Update resume
await updateResume(id, { title: 'Updated Title' });
```

## Components

### ResumeUploader

File upload component with drag-and-drop support.

**Props**:

- `loading` - Upload loading state

**Events**:

- `@upload` - File upload started
- `@success` - Upload successful
- `@error` - Upload failed

### ResumeJsonEditor

JSON editor for resume content with validation.

**Props**:

- `modelValue` - Resume content
- `resumeId` - Resume ID for saving

**Events**:

- `@save` - Save successful
- `@error` - Save failed

Prefix: `Resume` (e.g., `<ResumeUploader />`)

## Store

### useResumeStore

Manages resume data and operations.

**State**:

- `resumes` - List of resumes
- `currentResume` - Currently selected resume
- `loading` - Loading state
- `error` - Error state

**Getters**:

- `hasResumes` - Check if user has any resumes
- `latestResume` - Get most recently updated resume

**Actions**:

- `fetchResumes()` - Fetch all user resumes
- `fetchResume(id)` - Fetch single resume
- `uploadResume(file, title?)` - Upload and parse resume
- `updateResume(id, data)` - Update resume content/title
- `deleteResume(id)` - Delete resume

## API Client

### resumeApi

Low-level API client for resume operations.

**Methods**:

- `fetchAll()` - GET /api/resumes
- `fetchById(id)` - GET /api/resumes/:id
- `upload(file, title?)` - POST /api/resumes
- `update(id, data)` - PUT /api/resumes/:id
- `delete(id)` - DELETE /api/resumes/:id
