# Profile Layer

User profile management layer for the site app.

## Overview

This layer handles all user profile-related functionality including profile creation, editing, and completeness checks.

## Structure

```
profile/
├── app/
│   ├── components/
│   │   └── ProfileForm/       # Profile form components
│   ├── composables/
│   │   └── useProfile.ts      # Profile composable
│   ├── pages/
│   │   └── profile.vue        # Profile page
│   └── stores/
│       └── index.ts           # useProfileStore
└── nuxt.config.ts
```

## Features

- Profile creation and editing
- Profile completeness validation
- Integration with auth store for profile data
- Form validation and error handling

## Usage

```typescript
// In components
const { profile, isComplete, saveProfile, loading, error } = useProfile();

// Save profile
await saveProfile({
  fullName: 'John Doe',
  email: 'john@example.com',
  phone: '+1234567890',
  languages: ['en', 'uk']
});
```

## Components

### ProfileForm

Main profile form with sections for:

- Basic information (name, email)
- Phone number
- Languages

Prefix: `Profile` (e.g., `<ProfileForm />`)

## Store

### useProfileStore

Manages profile save operations and completeness checks.

**Actions**:

- `saveProfile(data: ProfileInput)` - Save or update profile
- `checkProfileCompleteness()` - Check if profile is complete

**State**:

- `loading` - Loading state for operations
- `error` - Error state
