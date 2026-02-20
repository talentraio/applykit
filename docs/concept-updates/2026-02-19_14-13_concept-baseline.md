# Product Concept Snapshot (Baseline)

## Meta

- Snapshot datetime: `2026-02-19 14:13 +0100`
- Previous snapshot: `none`
- Diff source: `baseline investigation of current codebase state (HEAD at snapshot time)`

## Executive Summary

The product already covers the core value loop for job seekers: from entering the
service and creating a base resume to generating a vacancy-tailored version,
manually refining it, and exporting to PDF.
The admin panel provides control over access, roles, AI budgets, and scenario quality.
Part of the roadmap is still marked as `coming soon` (AI Enhance, Cover Letter).

## Current User-Facing Business Logic

1. A user lands on the homepage and sees the core value proposition and CTAs.
2. The user registers or signs in (Google / LinkedIn / email-password).
3. After sign-in, the user accepts current legal terms/privacy (mandatory gate).
4. The user completes profile fields (minimum: first name, last name, email, country,
   search region) to reach the `ready for generation` state.
5. The user creates a base resume:
   - uploads DOCX/PDF and gets AI parsing, or
   - creates the resume manually.
6. The user edits the base resume in the editor (autosave, undo/redo, ATS/Human settings).
7. The user creates a vacancy and starts tailored resume generation.
8. The user gets baseline/after scoring, edits the tailored output, and exports PDF.
9. On the Preparation page, the user sees detailed insights
   (matching/gaps/recommendations) to prepare for applications/interviews.

## Functionality: Live

- Landing + onboarding funnel.
- Registration/login, reset password, legal acceptance gate.
- User profile with generation-readiness validation.
- Base resume flow: upload, AI parsing, editor with autosave/undo/redo.
- ATS/Human preview and PDF export.
- Vacancy management: list, statuses, filters, bulk operations.
- Tailored resume generation with business rules for re-generation.
- Preparation with scoring details (when enabled for role/scenario).
- Base i18n architecture and role-based limits.

## Functionality: Coming Soon / Planned

### Coming Soon (already exposed as placeholders in product)

- `AI Enhance` tab in the resume editor.
- `Cover Letter` page under vacancy details.

### Planned (roadmap, not fully implemented)

- Expanded resume template/design options.
- Additional UX coverage in selected profile sections.
- Deeper product analytics on marketing surfaces.

## Administration and Control (Business View)

- Centralized user management:
  - invite new users,
  - assign/change roles,
  - block/unblock,
  - soft delete / restore / hard delete.
- Access control:
  - admin panel restricted to `super_admin`,
  - role-based usage limits.
- Cost and risk control:
  - per-user budgets (day/week/month),
  - global platform budget.
- AI quality control:
  - model catalog and model statuses,
  - scenario routing (parse/adapt/score/cover),
  - role-level overrides for selected scenarios.
- Operational visibility:
  - usage and cost metrics per user and platform-wide.

## User Data and Lawful Usage

### Allowed Without Additional Explicit Consent

- Account data processing for authentication, security, and access control.
- Resume/vacancy processing to deliver the core service
  (parsing, generation, scoring, export).
- Technical and security logs for anti-fraud, stability, limits, and audit.
- Aggregated/de-identified analytics for product improvement.

### Requires Explicit Consent (Opt-in)

- Using resume content in training datasets/model training.
- Public marketing case studies with personalized examples.
- Extended transfer of personal data to third parties outside core service delivery.

## Value for End Users

- Faster resume tailoring per vacancy without starting from scratch.
- Higher resume relevance through scoring and targeted recommendations.
- Quality control through manual editing and version-like workflow.
- Application-ready PDF export in ATS/Human-oriented formats.

## Value for Partners / Business

- A working end-to-end core flow reduces time-to-market for partner initiatives.
- Unit economics are controllable through role limits and budget caps.
- Growth can be controlled via invites, role management, and staged access scaling.
- The platform is ready for B2B/B2B2C integrations across career services,
  HR-tech, and education programs.

## Notes and Assumptions

- This is a baseline snapshot as of `2026-02-19 14:13 +0100`.
- This document is not legal advice; the data section reflects a product-level
  framework for lawful usage.
