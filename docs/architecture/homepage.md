# Homepage (Current)

## Goal

The landing page is marketing-first and conversion-focused.
It should clearly communicate the product value and move users into auth or directly into the app.

Core narrative:

- one baseline resume,
- adaptation per vacancy,
- ATS + Human outputs,
- controlled workflow with scoring and export.

## Current page composition

Implemented in `apps/site/layers/landing/app/pages/index.vue`.

Section order:

1. `LandingHeader`
2. `LandingHero`
3. `LandingProof`
4. `LandingFlow`
5. `LandingFeatures`
6. `LandingModes` (ATS vs Human)
7. `LandingComparison`
8. `LandingFaq`
9. `LandingCta`
10. `LandingFooter`

## Navigation behavior

Header navigation anchors:

- Flow (`#landing-flow`)
- Features (`#landing-features`)
- ATS + Human (`#landing-dual`)
- FAQ (`#landing-faq`)

CTA behavior:

- Logged-out users: opens auth modal.
- Logged-in users: navigates to post-login resolver (`redirects.auth.landingTryIt`).

## Content model

Current copy highlights:

- role-ready tailored resumes from one source,
- support for DOCX + PDF inputs,
- two output modes (ATS and Human),
- repeatable workflow and predictable limits,
- non-engineering office roles supported too.

FAQ currently focuses on:

- adaptation vs full rewrite,
- role coverage beyond engineering,
- generation speed expectations,
- rationale for ATS/Human dual output.

## Visual and UX direction

- Dark marketing surface with gradient atmosphere.
- Strong typography hierarchy and clear CTA prominence.
- SSR-friendly composition with section-level components.
- i18n-driven copy (no hardcoded UI strings).

## Notes

- A `Metrics.vue` component exists in landing layer but is not currently mounted on the page.
- Placeholder metrics are represented through hero/proof content rather than a dedicated metrics section.

## Related docs

- Data flow: [`./data-flow.md`](./data-flow.md)
- Security/privacy: [`./security-privacy.md`](./security-privacy.md)
