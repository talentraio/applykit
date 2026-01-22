# Homepage (MVP)

## Goal

Make the landing page feel “alive” and trustworthy, while clearly explaining:
- why ATS resumes look ugly (and why that’s OK),
- how ApplyKit helps generate both ATS-friendly and human-friendly PDFs,
- that the product is simple: upload → adapt per vacancy → export.

This page is **marketing-first**. It should look good even before real analytics/widgets are implemented.

## Layout (single page)

Use NuxtUI v4 building blocks + Tailwind. Keep markup simple and easy to iterate.
(Exact component names should be verified via NuxtUI MCP docs when coding.)

### 1) Hero (top section)

**Content:**
- Headline: `Tailor your resume to every vacancy — fast.`
- Subheadline: `Upload a DOCX or PDF, review the structured result, generate ATS + human-friendly versions, and export clean PDFs.`
- Primary CTA: `Continue with Google`
- Secondary CTA: `See how it works` (scrolls to Steps)
- Small disclaimer line (tiny text): `Free tier available. Bring your own API key if you want higher limits.`

**UI:**
- Left: text + CTAs
- Right: a simple illustrative block (no real screenshot needed yet):
    - a “split preview” card: ATS (left) / Human (right) with dummy lines

### 2) “How it works” (Steps)

Show 4 steps as cards (icon optional, can be placeholder):

1. **Upload** resume (DOCX/PDF)
2. **Review** parsed JSON (fix missing fields)
3. **Add** vacancy (company + optional position + description)
4. **Generate & Export** ATS / Human PDFs

Each card: title + 1–2 lines max.

### 3) ATS vs Human explanation (core education block)

Two-column section:

**Left column: “ATS Resume”**
- Bullet points:
    - Optimized for parsers (simple structure)
    - No fancy layout, minimal styling
    - Best for mass applications

**Right column: “Human Resume”**
- Bullet points:
    - Clean A4 layout, readable typography
    - Optional photo + visual hierarchy
    - Best when recruiter asks for a “nice PDF”

Add a short neutral sentence under both:
`ApplyKit keeps the content consistent between both versions — only the presentation changes.`

### 4) Metric tiles (placeholders, static for MVP)

Grid of 4–6 “metric” cards. These are STATIC initially (marketing placeholders),
but must map to real future data.

Suggested tiles:
- `Vacancies tracked` → placeholder: `12`
- `Resumes generated` → placeholder: `48`
- `Avg. match score` → placeholder: `72%`
- `Best match score` → placeholder: `89%`
- `Time saved` → placeholder: `~3h/week`
- `Last generation` → placeholder: `Today`

Note: later these will be backed by stored metrics from generation runs.

### 5) FAQ (tiny, 3–5 items)

Keep answers short.

- **Is it safe to paste my API key?**
    - `You can use the free tier, or bring your own key. Keys are treated as sensitive. Prefer temporary keys.`
- **Why does my ATS resume look plain?**
    - `That’s intentional: ATS parsers prefer predictable structure.`
- **Can I edit the result?**
    - `Yes — MVP uses a JSON editor. A friendly UI editor comes later.`
- **DOCX or PDF?**
    - `DOCX is preferred, but PDF parsing is supported too.`

### 6) Footer

Minimal:
- `Privacy`
- `Terms`
- `Contact`
  (Links can be placeholders for MVP.)

## Copy tone rules

- Simple, direct, no hype.
- No “AI magic” wording.
- Explain tradeoffs (ATS ugliness is a feature, not a bug).

## Implementation notes (for later coding)

- Make sections as separate Vue components to keep the homepage readable.
- Root element of each component must have a semantic class name (BEM-friendly).
- Keep everything SSR-friendly; interactive parts are optional and can be islands later.
