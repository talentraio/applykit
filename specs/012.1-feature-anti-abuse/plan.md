# Legal Consent Wall — Implementation Plan

## Summary

Replace the profile-page Terms checkbox with a global blocking modal that requires users to accept Terms & Privacy before using the app. Store acceptance timestamp and legal version in DB for GDPR compliance and re-consent support.

## Changes

### 1. DB Schema (`packages/nuxt-layer-api/server/data/schema.ts`)

- Add to `users` table:
  - `termsAcceptedAt: timestamp('terms_accepted_at', { mode: 'date' })`
  - `legalVersion: varchar('legal_version', { length: 20 })`
- Generate migration via `pnpm --filter @int/api db:generate`

### 2. Schema types (`packages/schema/schemas/user.ts`)

- Add `termsAcceptedAt` and `legalVersion` to `UserSchema`
- Add them to `UserPublicSchema` (NOT omitted — client needs them)

### 3. API endpoint: `POST /api/auth/accept-terms`

- File: `packages/nuxt-layer-api/server/api/auth/accept-terms.post.ts`
- Sets `termsAcceptedAt = now()` and `legalVersion = currentLegalVersion` on the user
- Returns updated user public data
- `currentLegalVersion` = `max(termsEffectiveDate, privacyEffectiveDate)` from runtime config

### 4. Update `GET /api/auth/me` response

- Include `termsAcceptedAt` and `legalVersion` in `UserPublic` response

### 5. Auth store updates

- Add `needsTermsAcceptance` getter that compares `user.legalVersion` vs current `legalVersion` from runtime config
- Add `acceptTerms()` action

### 6. Global consent modal component

- File: `apps/site/layers/auth/app/components/LegalConsentModal.vue`
- Blocking UModal (no close button, `prevent-close`)
- Reuses terms text/links from existing `ProfileFormSectionTerms`
- Checkbox + submit button
- Calls `acceptTerms()` store action

### 7. Mount in `app.vue`

- Add `<AuthLegalConsentModal />` conditionally based on `needsTermsAcceptance`

### 8. Remove terms from profile form

- Remove `ProfileFormSectionTerms` usage from `ProfileForm/index.vue`
- Remove terms validation logic from submit handler
- Keep the component file (may be reused by modal or deleted later)

### 9. i18n

- Add keys under `auth.legal` namespace for the modal

### 10. Runtime config helper

- Compute `currentLegalVersion = max(termsEffectiveDate, privacyEffectiveDate)` as a composable or inline computed
